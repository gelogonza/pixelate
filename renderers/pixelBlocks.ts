import { RenderContext } from "./types";
import { roundRect } from "./util";
import { colorCssFor } from "./color";
import { paintBackground } from "./background";

export function renderPixels(rc: RenderContext) {
  const { ctx, cells, width, height, dims, state, time } = rc;
  const s = state.pixels;

  paintBackground(ctx, state, width, height);

  const size = Math.max(1, Math.min(dims.cellWidth, dims.cellHeight) - s.gap);
  const half = size / 2;
  const r = s.rounded ? size * s.roundness : 0;
  const amp = s.color.animated ? Math.min(size * 0.18, 2.4) : 0;
  const speed = s.color.animationSpeed;

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const wobble = amp > 0 ? Math.sin(time * speed * 2.1 + c.ox * 0.05 + c.oy * 0.03) * amp : 0;
    const px = c.x + wobble;
    const py = c.y + wobble * 0.6;
    ctx.fillStyle = colorCssFor(s.color, c, c.brightness, time);
    if (r > 0) {
      roundRect(ctx, px - half, py - half, size, size, r);
      ctx.fill();
    } else {
      ctx.fillRect(px - half, py - half, size, size);
    }
  }
}
