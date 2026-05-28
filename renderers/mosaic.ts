import { RenderContext } from "./types";
import { roundRect } from "./util";
import { colorRgbFor, rgbToCss, withTone } from "./color";
import { paintBackground } from "./background";

export function renderMosaic(rc: RenderContext) {
  const { ctx, cells, width, height, dims, state, time } = rc;
  const s = state.mosaic;

  paintBackground(ctx, state, width, height);

  const base = Math.min(dims.cellWidth, dims.cellHeight);
  const speed = s.color.animationSpeed;

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const seed = (c.ox * 7919 + c.oy * 6917) | 0;
    const t = s.color.animated ? time * speed : 0;
    const jx = Math.sin(seed + t * 0.8) * 0.5 * s.variation * base * 0.3;
    const jy = Math.cos(seed * 1.3 + t * 0.6) * 0.5 * s.variation * base * 0.3;
    const rot = Math.sin(seed * 0.7 + t * 0.7) * s.rotation * 0.6;
    const tone = Math.sin(seed * 1.7) * 20 * s.variation;
    const wobbleSize = s.color.animated ? 1 + 0.06 * Math.sin(t * 1.8 + seed * 0.01) : 1;
    const size = base * (1 - s.variation * 0.1) * wobbleSize;

    const base_rgb = colorRgbFor(s.color, c, c.brightness, time);
    const final_rgb = withTone(base_rgb, tone);

    ctx.save();
    ctx.translate(c.x + jx, c.y + jy);
    ctx.rotate(rot);
    ctx.fillStyle = rgbToCss(final_rgb);
    if (s.rounded) {
      roundRect(ctx, -size / 2, -size / 2, size, size, size * 0.15);
      ctx.fill();
    } else {
      ctx.fillRect(-size / 2, -size / 2, size, size);
    }
    ctx.restore();
  }
}
