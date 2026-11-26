import { RenderMode, SceneAspect, SourceKind } from "./types";

/** Frame shapes offered for procedural sources, with the social targets first. */
export const SCENE_ASPECTS: { value: SceneAspect; label: string; ratio: number | null }[] = [
  { value: "fill", label: "Fill", ratio: null },
  { value: "9:16", label: "9:16", ratio: 9 / 16 },
  { value: "4:5", label: "4:5", ratio: 4 / 5 },
  { value: "1:1", label: "1:1", ratio: 1 },
  { value: "16:9", label: "16:9", ratio: 16 / 9 },
];

/** null means "fill the available area" — no fixed aspect. */
export function sceneAspectRatio(a: SceneAspect): number | null {
  return SCENE_ASPECTS.find((x) => x.value === a)?.ratio ?? null;
}

export interface ModeOption {
  value: RenderMode;
  label: string;
  group: string;
  /**
   * Source kinds this mode can actually render. Image-space modes work on
   * anything that produces a raster. Geometry-space modes need a depth buffer
   * and surface normals, which only a procedural scene supplies — there is no
   * depth for a photograph, so offering them for media would be a lie.
   */
  sources?: SourceKind[];
}

const ALL: SourceKind[] = ["media", "scene"];
const SCENE_ONLY: SourceKind[] = ["scene"];

export const MODE_OPTIONS: ModeOption[] = [
  { value: "ascii", label: "ASCII", group: "Text", sources: ALL },
  { value: "pixels", label: "Pixels", group: "Pixel", sources: ALL },
  { value: "dots", label: "Dots", group: "Pixel", sources: ALL },
  { value: "mosaic", label: "Mosaic", group: "Pixel", sources: ALL },
  { value: "blurred", label: "Blurred image", group: "Filters", sources: ALL },
  { value: "black", label: "Black silhouette", group: "Filters", sources: ALL },
  { value: "transparent", label: "Transparent image", group: "Filters", sources: ALL },
  { value: "geometry_ascii", label: "Depth ASCII", group: "Geometry", sources: SCENE_ONLY },
  { value: "shaded", label: "Shaded 3D", group: "Geometry", sources: SCENE_ONLY },
  { value: "voronoi", label: "Voronoi diagram", group: "Pixel / Image", sources: ALL },
  { value: "pointillism", label: "Pointillism", group: "Pixel / Image", sources: ALL },
  { value: "watercolor", label: "Watercolor", group: "Pixel / Image", sources: ALL },
  { value: "oil_painting", label: "Oil painting", group: "Pixel / Image", sources: ALL },
  { value: "stippling", label: "Stippling", group: "Pixel / Image", sources: ALL },
  { value: "cross_hatching", label: "Cross hatching", group: "Pixel / Image", sources: ALL },
  { value: "linocut", label: "Linocut / woodblock", group: "Pixel / Image", sources: ALL },
  { value: "risograph", label: "Risograph", group: "Pixel / Image", sources: ALL },
  { value: "thermal", label: "Thermal camera", group: "Pixel / Image", sources: ALL },
  { value: "infrared", label: "Infrared", group: "Pixel / Image", sources: ALL },
  { value: "night_camera", label: "Night camera", group: "Pixel / Image", sources: ALL },
  { value: "solarize", label: "Solarize", group: "Pixel / Image", sources: ALL },
  { value: "duotone", label: "Duotone", group: "Pixel / Image", sources: ALL },
  { value: "halftone_cmyk", label: "Halftone CMYK", group: "Pixel / Image", sources: ALL },
  { value: "voronoi_stipple", label: "Voronoi stipple", group: "Generative", sources: ALL },
  { value: "flow_field", label: "Flow field", group: "Generative", sources: ALL },
  { value: "string_art", label: "String art", group: "Generative", sources: ALL },
  { value: "topographic", label: "Topographic", group: "Generative", sources: ALL },
  { value: "pixel_sort", label: "Pixel sort", group: "Generative", sources: ALL },
  { value: "glitch", label: "Databend / glitch", group: "Generative", sources: ALL },
  { value: "dithering", label: "Dithering styles", group: "Generative", sources: ALL },
  { value: "stained_glass", label: "Stained glass", group: "Generative", sources: ALL },
  { value: "text_fill", label: "Fill shape with text", group: "Text", sources: ALL },
  { value: "emoji", label: "Emoji mapping", group: "Text", sources: ALL },
  { value: "word_cloud", label: "Word cloud", group: "Text", sources: ALL },
  { value: "binary", label: "Binary", group: "Text", sources: ALL },
  { value: "matrix_rain", label: "Matrix rain", group: "Text", sources: ALL },
  { value: "reaction_diffusion", label: "Reaction diffusion", group: "Interactive / Live", sources: ALL },
  { value: "liquid", label: "Liquid simulation", group: "Interactive / Live", sources: ALL },
  { value: "sand", label: "Sand simulation", group: "Interactive / Live", sources: ALL },
  { value: "magnetic_field", label: "Magnetic field lines", group: "Interactive / Live", sources: ALL },
  { value: "noise_displacement", label: "Noise displacement", group: "Interactive / Live", sources: ALL },
];

/** Modes that read a 3D sample cloud instead of a raster. */
export const GEOMETRY_MODES = new Set<RenderMode>(["geometry_ascii", "shaded"]);

export const EFFECT_MODES = new Set<RenderMode>(
  MODE_OPTIONS
    .map((m) => m.value)
    .filter(
      (m) =>
        !["ascii", "pixels", "dots", "mosaic", "blurred", "black", "transparent"].includes(m) &&
        !GEOMETRY_MODES.has(m)
    )
);

export function modeLabel(mode: RenderMode): string {
  return MODE_OPTIONS.find((m) => m.value === mode)?.label ?? mode;
}

export function modeSupportsSource(mode: RenderMode, kind: SourceKind): boolean {
  const opt = MODE_OPTIONS.find((m) => m.value === mode);
  if (!opt?.sources) return true;
  return opt.sources.includes(kind);
}

export function modesForSource(kind: SourceKind): ModeOption[] {
  return MODE_OPTIONS.filter((m) => !m.sources || m.sources.includes(kind));
}

/** Nearest usable mode when the current one is incompatible with a new source. */
export function fallbackModeFor(kind: SourceKind, current: RenderMode): RenderMode {
  if (modeSupportsSource(current, kind)) return current;
  return kind === "scene" ? "geometry_ascii" : "ascii";
}
