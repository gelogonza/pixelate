import { AppState } from "./types";
import { Cell } from "@/renderers/types";
import { GridDims } from "./imageData";
import { colorCssFor, colorRgbFor } from "@/renderers/color";
import { charsetFor, CHARSET_PRESETS } from "./charsets";

/* ------------------------- PNG ------------------------- */
export function exportPNG(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/* ------------------------- Favicon (.ico) ------------------------- */
/**
 * Build a real Windows .ico file with multiple embedded PNG payloads.
 * PNG-in-ICO is supported by Vista+, modern browsers, macOS, and Linux.
 */
const FAVICON_SIZES = [16, 32, 48, 64, 128, 256] as const;

async function renderSquarePng(canvas: HTMLCanvasElement, size: number): Promise<ArrayBuffer> {
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const ctx = off.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const sw = canvas.width;
  const sh = canvas.height;
  const sq = Math.min(sw, sh);
  const sx = (sw - sq) / 2;
  const sy = (sh - sq) / 2;
  ctx.drawImage(canvas, sx, sy, sq, sq, 0, 0, size, size);
  const blob = await new Promise<Blob | null>((r) => off.toBlob(r, "image/png"));
  if (!blob) throw new Error("PNG encode failed for size " + size);
  return blob.arrayBuffer();
}

export async function exportIco(canvas: HTMLCanvasElement): Promise<Blob> {
  const pngs = await Promise.all(
    FAVICON_SIZES.map(async (size) => ({ size, data: await renderSquarePng(canvas, size) }))
  );

  const HEADER = 6;
  const ENTRY = 16;
  const dirSize = HEADER + ENTRY * pngs.length;
  const total = dirSize + pngs.reduce((a, p) => a + p.data.byteLength, 0);

  const out = new ArrayBuffer(total);
  const view = new DataView(out);
  const bytes = new Uint8Array(out);

  // ICONDIR header
  view.setUint16(0, 0, true);            // reserved
  view.setUint16(2, 1, true);            // type 1 = icon
  view.setUint16(4, pngs.length, true);  // count

  let offset = dirSize;
  for (let i = 0; i < pngs.length; i++) {
    const { size, data } = pngs[i];
    const eo = HEADER + i * ENTRY;
    // width / height — 256 is encoded as 0
    view.setUint8(eo + 0, size === 256 ? 0 : size);
    view.setUint8(eo + 1, size === 256 ? 0 : size);
    view.setUint8(eo + 2, 0);            // palette count
    view.setUint8(eo + 3, 0);            // reserved
    view.setUint16(eo + 4, 1, true);     // color planes
    view.setUint16(eo + 6, 32, true);    // bits per pixel
    view.setUint32(eo + 8, data.byteLength, true);  // size of image data
    view.setUint32(eo + 12, offset, true);          // offset to image data

    bytes.set(new Uint8Array(data), offset);
    offset += data.byteLength;
  }

  return new Blob([out], { type: "image/x-icon" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ------------------------- SVG ------------------------- */
export interface SvgBuildOpts {
  state: AppState;
  cells: Cell[];
  dims: GridDims;
  width: number;
  height: number;
}

function rgb(r: number, g: number, b: number) {
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function asciiValueFor(algo: AppState["ascii"]["algorithm"], c: Cell): number {
  switch (algo) {
    case "average":
      return (c.r + c.g + c.b) / (3 * 255);
    case "lightness": {
      const r = c.r / 255;
      const g = c.g / 255;
      const b = c.b / 255;
      return (Math.max(r, g, b) + Math.min(r, g, b)) * 0.5;
    }
    case "edge":
    case "edge_directional":
      return c.edge;
    case "contrast":
      return Math.abs(c.brightness - 0.5) * 2;
    case "brightness":
    default:
      return c.brightness;
  }
}

function asciiDirectionChar(angle: number): string {
  let a = angle;
  if (a < 0) a += Math.PI;
  return CHARSET_PRESETS.directional[Math.round(a / (Math.PI / 4)) % 4] || "|";
}

/** Serialize the current cell snapshot as an SVG string. Only meaningful for cell-based modes. */
export function buildSVG({ state, cells, dims, width, height }: SvgBuildOpts): string {
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`);
  const out = state.output;
  const svgBrightness = out.brightness * out.luminance;
  const filter =
    svgBrightness !== 1 || out.saturation !== 1 || out.hue !== 0
      ? `filter:brightness(${svgBrightness}) saturate(${out.saturation}) hue-rotate(${out.hue}deg);`
      : "";
  const opacity = out.opacity !== 1 ? `opacity:${Math.max(0, Math.min(1, out.opacity))};` : "";
  if (filter || opacity) parts.push(`<g style="${filter}${opacity}">`);
  if (state.backgroundEnabled) {
    parts.push(`<rect width="${width}" height="${height}" fill="${state.background}"/>`);
  }

  // Time for animation in SVG snapshot. We freeze t=0 since SVG is a still.
  const time = 0;

  if (state.mode === "ascii") {
    const s = state.ascii;
    const chars =
      s.algorithm === "edge_directional"
        ? CHARSET_PRESETS.directional
        : charsetFor(s.charsetPreset, s.charset) || CHARSET_PRESETS.standard;
    const fs = dims.cellWidth * s.charAspect * 0.95;
    parts.push(`<g font-family="ui-monospace, monospace" font-size="${fs.toFixed(2)}" text-anchor="middle" dominant-baseline="middle">`);
    for (const c of cells) {
      let v = asciiValueFor(s.algorithm, c);
      if (s.inverted) v = 1 - v;
      v = Math.max(0, Math.min(1, v));
      if (s.algorithm === "edge_directional" && c.edge < 0.04) continue;
      const idx = Math.min(chars.length - 1, Math.max(0, Math.floor(v * chars.length)));
      const ch = escapeXml(s.algorithm === "edge_directional" ? asciiDirectionChar(c.edgeAngle) : chars[idx]);
      const fill = colorCssFor(s.color, c, v, time);
      parts.push(`<text x="${c.x.toFixed(2)}" y="${c.y.toFixed(2)}" fill="${fill}">${ch}</text>`);
    }
    parts.push(`</g>`);
  } else if (state.mode === "pixels") {
    const s = state.pixels;
    const size = Math.max(1, Math.min(dims.cellWidth, dims.cellHeight) - s.gap);
    const r = s.rounded ? size * s.roundness : 0;
    for (const c of cells) {
      const fill = colorCssFor(s.color, c, c.brightness, time);
      parts.push(
        `<rect x="${(c.x - size / 2).toFixed(2)}" y="${(c.y - size / 2).toFixed(2)}" width="${size.toFixed(2)}" height="${size.toFixed(2)}" rx="${r.toFixed(2)}" fill="${fill}"/>`
      );
    }
  } else if (state.mode === "dots") {
    const s = state.dots;
    const maxR = Math.min(dims.cellWidth, dims.cellHeight) * 0.5;
    for (const c of cells) {
      let rad = maxR * s.maxSize;
      if (s.sizeFromBrightness) {
        const t = s.invertSize ? 1 - c.brightness : c.brightness;
        rad = maxR * (s.minSize + (s.maxSize - s.minSize) * t);
      }
      if (rad < 0.3) continue;
      const fill = colorCssFor(s.color, c, c.brightness, time);
      parts.push(`<circle cx="${c.x.toFixed(2)}" cy="${c.y.toFixed(2)}" r="${rad.toFixed(2)}" fill="${fill}"/>`);
    }
  } else if (state.mode === "mosaic") {
    const s = state.mosaic;
    const base = Math.min(dims.cellWidth, dims.cellHeight);
    for (const c of cells) {
      const seed = (c.ox * 7919 + c.oy * 6917) | 0;
      const jx = Math.sin(seed) * 0.5 * s.variation * base * 0.3;
      const jy = Math.cos(seed * 1.3) * 0.5 * s.variation * base * 0.3;
      const rot = Math.sin(seed * 0.7) * s.rotation * 30;
      const tone = Math.sin(seed * 1.7) * 20 * s.variation;
      const size = base * (1 - s.variation * 0.1);
      const cx = c.x + jx, cy = c.y + jy;
      const r = s.rounded ? size * 0.15 : 0;
      const baseRgb = colorRgbFor(s.color, c, c.brightness, time);
      const fill = rgb(baseRgb[0] + tone, baseRgb[1] + tone, baseRgb[2] + tone);
      parts.push(
        `<rect x="${(-size / 2).toFixed(2)}" y="${(-size / 2).toFixed(2)}" width="${size.toFixed(2)}" height="${size.toFixed(2)}" rx="${r.toFixed(2)}" fill="${fill}" transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${rot.toFixed(2)})"/>`
      );
    }
  }

  if (filter || opacity) parts.push("</g>");
  parts.push("</svg>");
  return parts.join("");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function exportSVG(opts: SvgBuildOpts) {
  const svg = buildSVG(opts);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, "pixelate.svg");
}

/* ------------------------- React component ------------------------- */
export function buildReactComponent(opts: SvgBuildOpts): string {
  const svg = buildSVG(opts);
  // Transform a few attributes for JSX correctness.
  const jsx = svg
    .replace(/class=/g, "className=")
    .replace(/xmlns:xlink=/g, "xmlnsXlink=")
    .replace(/font-family=/g, "fontFamily=")
    .replace(/font-size=/g, "fontSize=")
    .replace(/text-anchor=/g, "textAnchor=")
    .replace(/dominant-baseline=/g, "dominantBaseline=");
  return `export function PixelateOutput() {\n  return (\n    ${jsx}\n  );\n}\n`;
}

/* ------------------------- Video ------------------------- */
export interface VideoRecorder {
  stop: () => Promise<Blob>;
  cancel: () => void;
}

/** Capture the live canvas stream via MediaRecorder. Tries MP4/VP9/VP8 in priority order. */
export function startVideoRecording(canvas: HTMLCanvasElement, fps = 30): VideoRecorder {
  const stream = (canvas as any).captureStream(fps) as MediaStream;
  const mimeCandidates = [
    "video/mp4;codecs=avc1",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  const mime = mimeCandidates.find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) || "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  rec.start(250);

  let cancelled = false;
  return {
    stop: () =>
      new Promise<Blob>((resolve, reject) => {
        rec.onstop = () => {
          if (cancelled) reject(new Error("cancelled"));
          else resolve(new Blob(chunks, { type: mime }));
        };
        try { rec.stop(); } catch (e) { reject(e); }
      }),
    cancel: () => { cancelled = true; try { rec.stop(); } catch {} },
  };
}
