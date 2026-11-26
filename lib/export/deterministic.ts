import { Muxer, ArrayBufferTarget } from "mp4-muxer";

/**
 * Frame-exact video export.
 *
 * The existing `startVideoRecording` path captures the live canvas in real time
 * through MediaRecorder, so it drops frames when a mode is slow, its duration
 * drifts, and it cannot render above real time. This path instead renders each
 * frame at an exact `t = frame / fps`, encodes it with WebCodecs and muxes it to
 * MP4 — so the output is reproducible and independent of how long rendering takes.
 *
 * Requires WebCodecs (`VideoEncoder`). Chrome/Edge have it, Safari from 16.4.
 * Call `supportsDeterministicExport()` first and fall back to MediaRecorder.
 */

export interface DeterministicExportOptions {
  canvas: HTMLCanvasElement;
  /** Render exactly this time onto the canvas. Called with increasing t from 0. */
  renderFrameAt: (time: number) => Promise<boolean>;
  /** Clear cross-frame renderer state before the first frame. */
  resetForExport?: () => void;
  durationSec: number;
  fps: number;
  /** Bits per second. Defaults to a size/fps-derived estimate. */
  bitrate?: number;
  onProgress?: (p: { frame: number; totalFrames: number; progress: number }) => void;
  signal?: AbortSignal;
}

export interface DeterministicExportResult {
  blob: Blob;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  durationSec: number;
}

export function supportsDeterministicExport(): boolean {
  return typeof window !== "undefined" && typeof (window as any).VideoEncoder === "function";
}

/** H.264 needs even dimensions; odd ones fail to encode on most hardware. */
function evenize(n: number): number {
  const v = Math.max(2, Math.floor(n));
  return v % 2 === 0 ? v : v - 1;
}

/**
 * Pick an AVC level high enough for the frame size, otherwise the encoder
 * rejects the config. These are the standard macroblock limits.
 */
function avcCodecFor(width: number, height: number): string {
  const mbs = Math.ceil(width / 16) * Math.ceil(height / 16);
  // level 3.1 / 4.0 / 4.2 / 5.1 as frame size grows (High profile, 0x64)
  const level = mbs <= 3600 ? "1f" : mbs <= 8192 ? "28" : mbs <= 8704 ? "2a" : "33";
  return `avc1.6400${level}`;
}

export async function exportDeterministicVideo(
  opts: DeterministicExportOptions
): Promise<DeterministicExportResult> {
  const { canvas, renderFrameAt, resetForExport, onProgress, signal } = opts;

  if (!supportsDeterministicExport()) {
    throw new Error("WebCodecs is not available in this browser");
  }

  const fps = Math.max(1, Math.round(opts.fps));
  const durationSec = Math.max(1 / fps, opts.durationSec);
  const totalFrames = Math.max(1, Math.round(durationSec * fps));

  const width = evenize(canvas.width);
  const height = evenize(canvas.height);
  if (width < 16 || height < 16) {
    throw new Error(`Canvas is too small to encode (${canvas.width}x${canvas.height})`);
  }

  const bitrate =
    opts.bitrate ?? Math.min(40_000_000, Math.max(2_000_000, Math.round(width * height * fps * 0.12)));

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width, height, frameRate: fps },
    // Required for a file that plays from a Blob without a server range request.
    fastStart: "in-memory",
  });

  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { encoderError = e instanceof Error ? e : new Error(String(e)); },
  });

  encoder.configure({
    codec: avcCodecFor(width, height),
    width,
    height,
    bitrate,
    framerate: fps,
    latencyMode: "quality",
  });

  resetForExport?.();

  try {
    for (let frame = 0; frame < totalFrames; frame++) {
      if (signal?.aborted) throw new Error("Export cancelled");
      if (encoderError) throw encoderError;

      // The whole point: time comes from the frame index, never from a clock.
      const time = frame / fps;
      await renderFrameAt(time);

      const videoFrame = new VideoFrame(canvas, {
        timestamp: Math.round((frame * 1_000_000) / fps), // microseconds
        duration: Math.round(1_000_000 / fps),
      });

      // A keyframe every 2s keeps the file seekable without bloating it.
      encoder.encode(videoFrame, { keyFrame: frame % (fps * 2) === 0 });
      videoFrame.close();

      // Let the encoder drain so memory does not grow without bound on long clips.
      if (encoder.encodeQueueSize > 8) {
        await new Promise((r) => setTimeout(r, 0));
      }

      onProgress?.({ frame: frame + 1, totalFrames, progress: (frame + 1) / totalFrames });
    }

    await encoder.flush();
    if (encoderError) throw encoderError;
    muxer.finalize();

    const buffer = target.buffer;
    if (!buffer) throw new Error("Muxer produced no output");

    return {
      blob: new Blob([buffer], { type: "video/mp4" }),
      width,
      height,
      fps,
      totalFrames,
      durationSec: totalFrames / fps,
    };
  } finally {
    try { if (encoder.state !== "closed") encoder.close(); } catch { /* already closed */ }
  }
}
