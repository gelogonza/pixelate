import { ColorOptions } from "@/lib/types";
import { RenderContext } from "./types";
import { colorRgbFor } from "./color";
import { mediaSize } from "@/lib/types";

function brightness(r: number, g: number, b: number) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function drawSourceContain(
  ctx: CanvasRenderingContext2D,
  source: RenderContext["source"],
  width: number,
  height: number
) {
  if (!source) return;
  const { w, h } = mediaSize(source);
  if (w <= 0 || h <= 0) return;
  const scale = Math.min(width / w, height / h);
  const dw = Math.max(1, w * scale);
  const dh = Math.max(1, h * scale);
  const dx = (width - dw) * 0.5;
  const dy = (height - dh) * 0.5;
  ctx.drawImage(source, dx, dy, dw, dh);
}

/** Draw the source image pixel-by-pixel with the active color mode applied to each pixel's brightness. */
export function drawColoredSource(
  rc: RenderContext,
  color: ColorOptions,
  filter = "none",
  alpha = 1
) {
  const { ctx, source, width, height, time } = rc;
  if (!source) return;

  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.floor(width));
  off.height = Math.max(1, Math.floor(height));
  const octx = off.getContext("2d", { willReadFrequently: true })!;
  octx.clearRect(0, 0, off.width, off.height);
  octx.filter = filter;
  drawSourceContain(octx, source, width, height);
  octx.filter = "none";

  const img = octx.getImageData(0, 0, off.width, off.height);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const v = brightness(r, g, b);
    const rgb = colorRgbFor(
      color,
      { ox: 0, oy: 0, x: 0, y: 0, vx: 0, vy: 0, r, g, b, brightness: v, edge: 0, edgeAngle: 0 },
      v,
      time
    );
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
  }
  octx.putImageData(img, 0, 0);

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.drawImage(off, 0, 0, width, height);
  ctx.restore();
}
