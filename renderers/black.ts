import { RenderContext } from "./types";
import { paintBackground } from "./background";
import { colorRgbFor } from "./color";
import { drawSourceContain } from "./sourceColor";

/**
 * Renders the source as a thresholded silhouette over the configured
 * background. The silhouette color uses the same color modes as every other
 * renderer, so Black can still be used experimentally with palette/source/etc.
 */
export function renderBlack(rc: RenderContext) {
  const { ctx, width, height, state, source, time } = rc;
  const s = state.black;
  const anim = s.color.animated ? Math.sin(time * s.color.animationSpeed * 1.7) * 0.08 : 0;
  const threshold = Math.max(0, Math.min(1, s.threshold + anim));

  paintBackground(ctx, state, width, height);
  if (!source) return;

  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.floor(width));
  off.height = Math.max(1, Math.floor(height));
  const octx = off.getContext("2d", { willReadFrequently: true })!;
  octx.clearRect(0, 0, off.width, off.height);
  octx.filter = s.softness > 0 ? `blur(${s.softness}px)` : "none";
  drawSourceContain(octx, source, width, height);
  octx.filter = "none";

  const img = octx.getImageData(0, 0, off.width, off.height);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) {
      data[i + 3] = 0;
      continue;
    }
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const v = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const on = s.invert ? v > threshold : v <= threshold;
    const rgb = colorRgbFor(
      s.color,
      { ox: 0, oy: 0, x: 0, y: 0, vx: 0, vy: 0, r, g, b, brightness: v, edge: 0, edgeAngle: 0 },
      v,
      time
    );
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = on ? 255 : 0;
  }
  octx.putImageData(img, 0, 0);
  ctx.drawImage(off, 0, 0, width, height);
}
