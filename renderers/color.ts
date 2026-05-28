import { ColorOptions } from "@/lib/types";
import { Cell } from "./types";
import { hexToRgb } from "@/lib/color";

export type RGB = [number, number, number];

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v) | 0;
const TAU = Math.PI * 2;

function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;

  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const m = l - c / 2;
  return [clamp255((r + m) * 255), clamp255((g + m) * 255), clamp255((b + m) * 255)];
}

function animatedRgb(base: RGB, value: number, time: number, speed: number): RGB {
  const p = time * speed;
  const wobble = 0.5 + 0.5 * Math.sin(p * TAU + value * 6);
  const pulse = 0.88 + 0.24 * (0.5 + 0.5 * Math.sin((p + value) * TAU));
  const drift = 0.2 + 0.55 * wobble;
  const r = base[0] * pulse * (1 - drift) + base[1] * drift;
  const g = base[1] * pulse * (1 - drift) + base[2] * drift;
  const b = base[2] * pulse * (1 - drift) + base[0] * drift;
  return [clamp255(r), clamp255(g), clamp255(b)];
}

/** Resolve the final RGB for a cell given the active color mode, brightness value, and animation time. */
export function colorRgbFor(
  opts: ColorOptions,
  c: Cell,
  value: number,
  time: number
): RGB {
  const animTick = opts.cycleColors ? Math.floor(time * opts.animationSpeed) : 0;
  let rgb: RGB;
  switch (opts.mode) {
    case "source":
      rgb = [c.r, c.g, c.b];
      break;
    case "complementary":
      rgb = [255 - c.r, 255 - c.g, 255 - c.b];
      break;
    case "palette": {
      const len = opts.palette.length;
      if (len === 0) {
        rgb = hexToRgb(opts.color);
        break;
      }
      let pi = Math.floor(value * len) + animTick;
      pi = ((pi % len) + len) % len;
      rgb = hexToRgb(opts.palette[pi]);
      break;
    }
    case "rainbow": {
      // Sweep hue across the full spectrum and keep it moving over time.
      const shift = ((time * opts.animationSpeed * 0.15) % 1 + 1) % 1;
      const hue = (((value + shift) % 1 + 1) % 1) * 360;
      rgb = hslToRgb(hue, 1, 0.5);
      break;
    }
    case "single":
    default:
      rgb = hexToRgb(opts.color);
      break;
  }
  if (opts.mode === "rainbow") return rgb;
  if (!opts.cycleColors) return rgb;
  // Palette color cycling uses discrete index rotation only.
  if (opts.mode === "palette") return rgb;
  return animatedRgb(rgb, value, time, opts.animationSpeed);
}

export function rgbToCss(rgb: RGB): string {
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

export function withTone(rgb: RGB, tone: number): RGB {
  return [clamp255(rgb[0] + tone), clamp255(rgb[1] + tone), clamp255(rgb[2] + tone)];
}

/** Convenience: get the css color string in one call. */
export function colorCssFor(
  opts: ColorOptions,
  c: Cell,
  value: number,
  time: number
): string {
  return rgbToCss(colorRgbFor(opts, c, value, time));
}
