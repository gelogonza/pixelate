import { RenderContext } from "./types";
import { colorCssFor } from "./color";
import { paintBackground } from "./background";

export function renderDots(rc: RenderContext) {
  const { ctx, cells, width, height, dims, state, time } = rc;
  const s = state.dots;

  paintBackground(ctx, state, width, height);

  const maxR = Math.min(dims.cellWidth, dims.cellHeight) * 0.5;
  const speed = s.color.animationSpeed;
  const globalPulse =
    s.color.animated
      ? 0.86 + 0.2 * (0.5 + 0.5 * Math.sin(time * speed * 2.4))
      : 1;

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    let rad: number;
    if (s.sizeFromBrightness) {
      const t = s.invertSize ? 1 - c.brightness : c.brightness;
      rad = maxR * (s.minSize + (s.maxSize - s.minSize) * t);
    } else {
      rad = maxR * s.maxSize;
    }
    if (rad < 0.3) continue;
    rad *= globalPulse;

    ctx.fillStyle = colorCssFor(s.color, c, c.brightness, time);
    ctx.beginPath();
    ctx.arc(c.x, c.y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
}
