import { RenderContext, ModeRenderer } from "./types";
import { renderAscii } from "./ascii";
import { renderPixels } from "./pixelBlocks";
import { renderDots } from "./dots";
import { renderMosaic } from "./mosaic";
import { renderBlurred } from "./blurred";
import { renderBlack } from "./black";
import { renderTransparent } from "./transparent";
import { renderEffect } from "./effects";
import { EFFECT_MODES } from "@/lib/modes";

export const renderers: Record<string, ModeRenderer> = {
  ascii: renderAscii,
  pixels: renderPixels,
  dots: renderDots,
  mosaic: renderMosaic,
  blurred: renderBlurred,
  black: renderBlack,
  transparent: renderTransparent,
};

for (const mode of EFFECT_MODES) {
  renderers[mode] = renderEffect;
}

/** True for modes that use the cell grid (ascii/pixels/dots/mosaic). */
export const CELL_MODES = new Set(["ascii", "pixels", "dots", "mosaic"]);

export function render(rc: RenderContext) {
  const fn = renderers[rc.state.mode];
  if (fn) fn(rc);
}
