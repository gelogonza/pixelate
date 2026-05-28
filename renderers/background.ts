import { AppState } from "@/lib/types";

export function paintBackground(
  ctx: CanvasRenderingContext2D,
  state: AppState,
  width: number,
  height: number
) {
  if (state.backgroundEnabled) {
    ctx.fillStyle = state.background;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }
}
