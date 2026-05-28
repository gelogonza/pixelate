import { RenderContext } from "./types";
import { paintBackground } from "./background";
import { drawColoredSource } from "./sourceColor";

export function renderBlurred(rc: RenderContext) {
  const { ctx, width, height, state, source, time } = rc;
  const s = state.blurred;

  paintBackground(ctx, state, width, height);
  if (!source) return;

  const parts: string[] = [];
  const speed = s.color.animationSpeed;
  const t = s.color.animated ? Math.sin(time * speed * 1.8) : 0;
  const radius = Math.max(0, s.radius + t * Math.max(0.8, s.radius * 0.08));
  const saturation = Math.max(0, s.saturation + t * 0.08);
  const brightness = Math.max(0, s.brightness + t * 0.06);
  if (radius > 0) parts.push(`blur(${radius}px)`);
  if (saturation !== 1) parts.push(`saturate(${saturation})`);
  if (brightness !== 1) parts.push(`brightness(${brightness})`);
  drawColoredSource(rc, s.color, parts.length > 0 ? parts.join(" ") : "none");
}
