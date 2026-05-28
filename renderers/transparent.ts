import { RenderContext } from "./types";
import { drawColoredSource } from "./sourceColor";

/**
 * Transparent mode: leaves the canvas alpha untouched so PNG exports
 * include real transparency. Optional blur + opacity.
 */
export function renderTransparent(rc: RenderContext) {
  const { ctx, width, height, state, source, time } = rc;
  const s = state.transparent;

  ctx.clearRect(0, 0, width, height);
  if (!source) return;
  const t = s.color.animated ? Math.sin(time * s.color.animationSpeed * 1.9) : 0;
  const blur = Math.max(0, s.blur + t * Math.max(0.8, s.blur * 0.08));
  const opacity = Math.max(0, Math.min(1, s.opacity + t * 0.08));
  drawColoredSource(rc, s.color, blur > 0 ? `blur(${blur}px)` : "none", opacity);
}
