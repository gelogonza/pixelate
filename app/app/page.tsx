"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, CanvasApi } from "@/components/Canvas";
import { Sidebar } from "@/components/Sidebar";
import { UploadZone } from "@/components/UploadZone";
import { ExportModal } from "@/components/ExportModal";
import { defaultState } from "@/lib/defaults";
import { AppState, MediaSource } from "@/lib/types";
import { disposeMedia, loadMedia } from "@/lib/imageData";
import { captureVisualState, evaluateKeyframedVisualState, withVisualState } from "@/lib/timeline";
import {
  buildReactComponent,
  downloadBlob,
  exportIco,
  exportPNG,
  exportSVG,
  startVideoRecording,
} from "@/lib/export";

const MEDIA_ACCEPT =
  "image/png,image/jpeg,image/webp,video/mp4,video/webm,video/ogg,video/quicktime,.mov";

export default function PixelateAppPage() {
  const [state, setState] = useState<AppState>(defaultState);
  const stateRef = useRef<AppState>(state);
  const [media, setMedia] = useState<MediaSource | null>(null);
  const mediaRef = useRef<MediaSource | null>(null);
  const canvasRef = useRef<CanvasApi>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState("");

  const [recording, setRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number; dpr: number } | null>(null);

  const onFile = useCallback(async (file: File) => {
    try {
      const next = await loadMedia(file);
      setMedia((prev) => {
        disposeMedia(prev);
        return next;
      });
    } catch (e) {
      console.error("[Pixelate] Failed to load media", e);
    }
  }, []);

  const onReplaceImage = () => fileInputRef.current?.click();

  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const renderState = useMemo(() => {
    if (!state.timeline.enabled) return state;
    const fallback = captureVisualState(state);
    const visual = evaluateKeyframedVisualState(
      state.timeline.keyframes,
      state.timeline.currentTime,
      fallback
    );
    return withVisualState(state, visual);
  }, [state]);

  const handlePNG = useCallback(async () => {
    const canvas = canvasRef.current?.canvas;
    if (!canvas) return;
    const blob = await exportPNG(canvas);
    if (blob) downloadBlob(blob, "pixelate.png");
  }, []);

  const handleSVG = useCallback(() => {
    const snap = canvasRef.current?.snapshot();
    if (!snap) return;
    exportSVG({ state: renderState, cells: snap.cells, dims: snap.dims, width: snap.width, height: snap.height });
  }, [renderState]);

  const handleReact = useCallback(() => {
    const snap = canvasRef.current?.snapshot();
    if (!snap) return;
    const code = buildReactComponent({
      state: renderState,
      cells: snap.cells,
      dims: snap.dims,
      width: snap.width,
      height: snap.height,
    });
    setModalTitle("React component");
    setModalContent(code);
    setModalOpen(true);
  }, [renderState]);

  const handleFavicon = useCallback(async () => {
    const canvas = canvasRef.current?.canvas;
    if (!canvas) return;
    const blob = await exportIco(canvas);
    downloadBlob(blob, "favicon.ico");
  }, []);

  const handleVideo = useCallback(async () => {
    const canvas = canvasRef.current?.canvas;
    if (!canvas) return;
    const s = stateRef.current;
    const timelineDriven = s.timeline.enabled && s.timeline.keyframes.length > 0;
    const durationSec = timelineDriven
      ? Math.max(0.1, Math.min(10, s.timeline.duration))
      : Math.max(1, Math.min(10, Math.round(s.videoDurationSec)));
    const duration = durationSec * 1000;

    const restoreTimeline = s.timeline;
    if (timelineDriven) {
      setState((prev) => ({
        ...prev,
        timeline: {
          ...prev.timeline,
          enabled: true,
          playing: true,
          loop: false,
          currentTime: 0,
        },
      }));
    }

    setRecording(true);
    setRecordProgress(0);
    const rec = startVideoRecording(canvas, 30);
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / duration;
      setRecordProgress(Math.min(1, t));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(async () => {
      try {
        const blob = await rec.stop();
        const ext = blob.type.includes("mp4") ? "mp4" : "webm";
        downloadBlob(blob, `pixelate.${ext}`);
      } catch (e) {
        console.error(e);
      } finally {
        if (timelineDriven) {
          setState((prev) => ({ ...prev, timeline: restoreTimeline }));
        }
        setRecording(false);
        setRecordProgress(0);
      }
    }, duration);
  }, []);

  useEffect(() => {
    return () => disposeMedia(mediaRef.current);
  }, []);

  useEffect(() => {
    if (!state.timeline.enabled || !state.timeline.playing) return;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.max(0, (now - last) / 1000);
      last = now;
      setState((prev) => {
        if (!prev.timeline.enabled || !prev.timeline.playing) return prev;
        const duration = Math.max(0.1, prev.timeline.duration);
        let nextTime = prev.timeline.currentTime + dt;

        if (nextTime >= duration) {
          if (prev.timeline.loop) {
            nextTime = nextTime % duration;
          } else {
            return {
              ...prev,
              timeline: { ...prev.timeline, currentTime: duration, playing: false },
            };
          }
        }

        return {
          ...prev,
          timeline: { ...prev.timeline, currentTime: nextTime },
        };
      });
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state.timeline.enabled, state.timeline.playing, state.timeline.duration, state.timeline.loop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s" && media) {
        e.preventDefault();
        handlePNG();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePNG, media]);

  return (
    <div className="h-screen w-screen flex bg-ink-950 overflow-hidden font-mono text-white">
      <main className="relative flex-1 min-w-0">
        {media ? (
          <Canvas
            ref={canvasRef}
            media={media}
            state={renderState}
            onResize={setCanvasSize}
          />
        ) : (
          <UploadZone onFile={onFile} />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={MEDIA_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </main>
      <Sidebar
        state={state}
        setState={setState}
        hasImage={!!media}
        onReplaceImage={onReplaceImage}
        onExportPNG={handlePNG}
        onExportSVG={handleSVG}
        onExportReact={handleReact}
        onExportVideo={handleVideo}
        onExportFavicon={handleFavicon}
        recordingVideo={recording}
        recordingProgress={recordProgress}
        canvasSize={canvasSize}
      />
      <ExportModal
        open={modalOpen}
        title={modalTitle}
        content={modalContent}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
