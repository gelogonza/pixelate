import { Cell } from "@/renderers/types";
import { MediaSource, isVideo, mediaSize } from "./types";

export interface GridDims {
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
}

/** Compute cell grid dimensions. ASCII uses density + char aspect; all other modes use a fixed cellSize. */
export function computeGridDims(
  mode: "ascii" | "pixels" | "dots" | "mosaic",
  canvasW: number,
  canvasH: number,
  params: {
    density?: number;
    cellSize?: number;
    charAspect?: number;
  }
): GridDims {
  if (mode === "ascii") {
    const cols = Math.max(8, Math.floor(params.density ?? 100));
    const cellWidth = canvasW / cols;
    const aspect = params.charAspect ?? 1.8;
    const cellHeight = cellWidth * aspect;
    const rows = Math.max(1, Math.floor(canvasH / cellHeight));
    return { cols, rows, cellWidth, cellHeight };
  }
  const size = Math.max(2, params.cellSize ?? 12);
  const cols = Math.max(1, Math.floor(canvasW / size));
  const rows = Math.max(1, Math.floor(canvasH / size));
  return { cols, rows, cellWidth: size, cellHeight: size };
}

/** Internal: draw the source (image or video) into a cols×rows offscreen and pull pixels. */
function sampleSource(
  source: MediaSource,
  cols: number,
  rows: number,
  withEdges: boolean
): {
  data: Uint8ClampedArray;
  brightness: Float32Array;
  edge: Float32Array;
  edgeAngle: Float32Array; // radians, only filled when withEdges
} {
  const total = cols * rows;
  const off = document.createElement("canvas");
  off.width = cols;
  off.height = rows;
  const octx = off.getContext("2d", { willReadFrequently: true })!;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";

  const { w: iw, h: ih } = mediaSize(source);
  const ia = iw > 0 && ih > 0 ? iw / ih : 1;
  const ga = cols / rows;
  let dw = cols, dh = rows, dx = 0, dy = 0;
  if (ia > ga) {
    dh = cols / ia;
    dy = (rows - dh) / 2;
  } else {
    dw = rows * ia;
    dx = (cols - dw) / 2;
  }
  octx.fillStyle = "#000";
  octx.fillRect(0, 0, cols, rows);
  octx.drawImage(source, dx, dy, dw, dh);
  const data = octx.getImageData(0, 0, cols, rows).data;

  const brightness = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    brightness[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  const edge = new Float32Array(total);
  const edgeAngle = new Float32Array(total);
  if (withEdges) {
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const i = y * cols + x;
        const gx =
          -brightness[i - cols - 1] - 2 * brightness[i - 1] - brightness[i + cols - 1] +
          brightness[i - cols + 1] + 2 * brightness[i + 1] + brightness[i + cols + 1];
        const gy =
          -brightness[i - cols - 1] - 2 * brightness[i - cols] - brightness[i - cols + 1] +
          brightness[i + cols - 1] + 2 * brightness[i + cols] + brightness[i + cols + 1];
        edge[i] = Math.min(1, Math.sqrt(gx * gx + gy * gy));
        edgeAngle[i] = Math.atan2(gy, gx);
      }
    }
  }

  return { data, brightness, edge, edgeAngle };
}

/** Build the full cell array from a source image/video for the current frame. */
export function buildCells(
  source: MediaSource,
  dims: GridDims,
  withEdges: boolean
): Cell[] {
  const { cols, rows, cellWidth, cellHeight } = dims;
  const total = cols * rows;
  const sample = sampleSource(source, cols, rows, withEdges);

  const cells: Cell[] = new Array(total);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const idx = j * cols + i;
      const x = (i + 0.5) * cellWidth;
      const y = (j + 0.5) * cellHeight;
      cells[idx] = {
        ox: x,
        oy: y,
        x,
        y,
        vx: 0,
        vy: 0,
        r: sample.data[idx * 4],
        g: sample.data[idx * 4 + 1],
        b: sample.data[idx * 4 + 2],
        brightness: sample.brightness[idx],
        edge: sample.edge[idx],
        edgeAngle: sample.edgeAngle[idx],
      };
    }
  }
  return cells;
}

/** Update colors/brightness/edge on an existing cell array — no realloc. Used per-frame for video. */
export function resampleCells(
  source: MediaSource,
  cells: Cell[],
  dims: GridDims,
  withEdges: boolean
): void {
  if (cells.length === 0) return;
  const { cols, rows } = dims;
  if (cols * rows !== cells.length) return;
  const sample = sampleSource(source, cols, rows, withEdges);
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    c.r = sample.data[i * 4];
    c.g = sample.data[i * 4 + 1];
    c.b = sample.data[i * 4 + 2];
    c.brightness = sample.brightness[i];
    c.edge = sample.edge[i];
    c.edgeAngle = sample.edgeAngle[i];
  }
}

/** Promise-based loader that accepts both images and videos. */
export async function loadMedia(file: File): Promise<MediaSource> {
  const url = URL.createObjectURL(file);

  if (file.type.startsWith("video/")) {
    const video = document.createElement("video");
    video.src = url;
    video.loop = true;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    // Keep videos in the document so play() is honored in some browsers.
    video.style.position = "fixed";
    video.style.opacity = "0";
    video.style.pointerEvents = "none";
    video.style.width = "1px";
    video.style.height = "1px";
    document.body.appendChild(video);
    await new Promise<void>((resolve, reject) => {
      const onMeta = () => {
        video.removeEventListener("loadedmetadata", onMeta);
        resolve();
      };
      const onErr = () => {
        video.removeEventListener("error", onErr);
        URL.revokeObjectURL(url);
        reject(new Error("Video failed to load"));
      };
      video.addEventListener("loadedmetadata", onMeta);
      video.addEventListener("error", onErr);
    });
    try { await video.play(); } catch { /* ignore — first frame still draws */ }
    return video;
  }

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/** Detach a video element previously created by loadMedia, freeing its blob URL. */
export function disposeMedia(m: MediaSource | null) {
  if (!m) return;
  if (isVideo(m)) {
    try {
      m.pause();
      const src = m.src;
      m.removeAttribute("src");
      m.load();
      if (src.startsWith("blob:")) URL.revokeObjectURL(src);
      m.remove();
    } catch { /* ignore */ }
  } else {
    if (m.src.startsWith("blob:")) URL.revokeObjectURL(m.src);
  }
}
