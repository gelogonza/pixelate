import { RenderContext, Cell } from "./types";
import { colorCssFor } from "./color";
import { charsetFor, CHARSET_PRESETS } from "@/lib/charsets";
import { paintBackground } from "./background";

/**
 * Brightness using the chosen algorithm. `c` carries raw RGB plus precomputed
 * perceptual luminance — for other algorithms we recompute from RGB.
 */
function valueFor(algo: string, c: Cell): number {
  switch (algo) {
    case "average":
      return (c.r + c.g + c.b) / (3 * 255);
    case "lightness": {
      const r = c.r / 255, g = c.g / 255, b = c.b / 255;
      return (Math.max(r, g, b) + Math.min(r, g, b)) * 0.5;
    }
    case "edge":
      return c.edge;
    case "edge_directional":
      return c.edge;
    case "contrast":
      return Math.abs(c.brightness - 0.5) * 2;
    case "brightness":
    default:
      return c.brightness;
  }
}

/** Map an edge gradient angle to one of 4 directional chars from the preset. */
function directionalIndex(angle: number, len: number): number {
  // angle is the gradient direction (perpendicular to edge). Take mod π so
  // opposite directions collapse to the same edge orientation.
  let a = angle;
  if (a < 0) a += Math.PI;
  // Discretise into 4 buckets centred on the cardinal/diagonal directions.
  // - 0  / π : horizontal gradient → vertical edge → "|"
  // - π/4    : diagonal gradient   → "/"
  // - π/2    : vertical gradient   → horizontal edge → "-"
  // - 3π/4   : anti-diagonal       → "\"
  const buckets = ["|", "/", "-", "\\"]; // ordered to match (i/4) * π
  const idx = Math.round(a / (Math.PI / 4)) % 4;
  if (len === 4) return idx; // custom 4-char charset honoured
  // For non-4-char charsets fall back to the standard directional preset chars.
  // (Renderer will pick chars from CHARSET_PRESETS.directional directly.)
  return idx;
}

export function renderAscii(rc: RenderContext) {
  const { ctx, cells, width, height, dims, state, time } = rc;
  const s = state.ascii;

  paintBackground(ctx, state, width, height);

  const chars =
    s.algorithm === "edge_directional"
      ? CHARSET_PRESETS.directional
      : charsetFor(s.charsetPreset, s.charset) || CHARSET_PRESETS.standard;

  const fs = dims.cellWidth * s.charAspect * 0.95;
  ctx.font = `${fs}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const cycle = s.color.animated ? Math.floor(time * s.color.animationSpeed) : 0;
  const len = chars.length;

  // Pre-compute per-cell value (with optional inversion).
  const values = new Float32Array(cells.length);
  for (let i = 0; i < cells.length; i++) {
    let v = valueFor(s.algorithm, cells[i]);
    if (s.inverted) v = 1 - v;
    if (v < 0) v = 0;
    else if (v > 1) v = 1;
    values[i] = v;
  }

  // Optional Floyd–Steinberg dithering on the value grid (row-major).
  if (s.dithered && len > 1 && s.algorithm !== "edge_directional") {
    const cols = dims.cols;
    const rows = dims.rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const old = values[idx];
        const q = Math.min(len - 1, Math.max(0, Math.round(old * (len - 1)))) / (len - 1);
        values[idx] = q;
        const err = old - q;
        if (x + 1 < cols) values[idx + 1] += err * (7 / 16);
        if (y + 1 < rows) {
          if (x > 0) values[idx + cols - 1] += err * (3 / 16);
          values[idx + cols] += err * (5 / 16);
          if (x + 1 < cols) values[idx + cols + 1] += err * (1 / 16);
        }
      }
    }
  }

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const v = values[i];

    let idx: number;
    if (s.algorithm === "edge_directional") {
      idx = directionalIndex(c.edgeAngle, len);
      // For directional rendering, skip cells with weak edges
      if (c.edge < 0.04) continue;
    } else {
      idx = Math.floor(v * len);
      if (s.color.animated) idx = (idx + cycle) % len;
      if (idx < 0) idx = 0;
      if (idx >= len) idx = len - 1;
    }

    ctx.fillStyle = colorCssFor(s.color, c, v, time);
    if (s.color.animated) {
      const wobble = Math.sin(time * s.color.animationSpeed * 2 + c.ox * 0.045 + c.oy * 0.03) * 0.2;
      ctx.fillText(chars[idx], c.x, c.y + wobble);
    } else {
      ctx.fillText(chars[idx], c.x, c.y);
    }
  }
}
