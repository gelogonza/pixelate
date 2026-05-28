import { RenderMode } from "./types";

export interface ModeOption {
  value: RenderMode;
  label: string;
  group: string;
}

export const MODE_OPTIONS: ModeOption[] = [
  { value: "ascii", label: "ASCII", group: "Text" },
  { value: "pixels", label: "Pixels", group: "Pixel" },
  { value: "dots", label: "Dots", group: "Pixel" },
  { value: "mosaic", label: "Mosaic", group: "Pixel" },
  { value: "blurred", label: "Blurred image", group: "Filters" },
  { value: "black", label: "Black silhouette", group: "Filters" },
  { value: "transparent", label: "Transparent image", group: "Filters" },
  { value: "voronoi", label: "Voronoi diagram", group: "Pixel / Image" },
  { value: "pointillism", label: "Pointillism", group: "Pixel / Image" },
  { value: "watercolor", label: "Watercolor", group: "Pixel / Image" },
  { value: "oil_painting", label: "Oil painting", group: "Pixel / Image" },
  { value: "stippling", label: "Stippling", group: "Pixel / Image" },
  { value: "cross_hatching", label: "Cross hatching", group: "Pixel / Image" },
  { value: "linocut", label: "Linocut / woodblock", group: "Pixel / Image" },
  { value: "risograph", label: "Risograph", group: "Pixel / Image" },
  { value: "thermal", label: "Thermal camera", group: "Pixel / Image" },
  { value: "infrared", label: "Infrared", group: "Pixel / Image" },
  { value: "solarize", label: "Solarize", group: "Pixel / Image" },
  { value: "duotone", label: "Duotone", group: "Pixel / Image" },
  { value: "halftone_cmyk", label: "Halftone CMYK", group: "Pixel / Image" },
  { value: "voronoi_stipple", label: "Voronoi stipple", group: "Generative" },
  { value: "flow_field", label: "Flow field", group: "Generative" },
  { value: "string_art", label: "String art", group: "Generative" },
  { value: "topographic", label: "Topographic", group: "Generative" },
  { value: "pixel_sort", label: "Pixel sort", group: "Generative" },
  { value: "glitch", label: "Databend / glitch", group: "Generative" },
  { value: "dithering", label: "Dithering styles", group: "Generative" },
  { value: "stained_glass", label: "Stained glass", group: "Generative" },
  { value: "text_fill", label: "Fill shape with text", group: "Text" },
  { value: "emoji", label: "Emoji mapping", group: "Text" },
  { value: "word_cloud", label: "Word cloud", group: "Text" },
  { value: "binary", label: "Binary", group: "Text" },
  { value: "matrix_rain", label: "Matrix rain", group: "Text" },
  { value: "reaction_diffusion", label: "Reaction diffusion", group: "Interactive / Live" },
  { value: "liquid", label: "Liquid simulation", group: "Interactive / Live" },
  { value: "sand", label: "Sand simulation", group: "Interactive / Live" },
  { value: "magnetic_field", label: "Magnetic field lines", group: "Interactive / Live" },
  { value: "noise_displacement", label: "Noise displacement", group: "Interactive / Live" },
];

export const EFFECT_MODES = new Set<RenderMode>(
  MODE_OPTIONS
    .map((m) => m.value)
    .filter((m) => !["ascii", "pixels", "dots", "mosaic", "blurred", "black", "transparent"].includes(m))
);

export function modeLabel(mode: RenderMode): string {
  return MODE_OPTIONS.find((m) => m.value === mode)?.label ?? mode;
}
