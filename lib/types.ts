export type RenderMode =
  | "ascii"
  | "pixels"
  | "dots"
  | "mosaic"
  | "blurred"
  | "black"
  | "transparent"
  | "voronoi"
  | "pointillism"
  | "watercolor"
  | "oil_painting"
  | "stippling"
  | "cross_hatching"
  | "linocut"
  | "risograph"
  | "thermal"
  | "infrared"
  | "solarize"
  | "duotone"
  | "halftone_cmyk"
  | "voronoi_stipple"
  | "flow_field"
  | "string_art"
  | "topographic"
  | "pixel_sort"
  | "glitch"
  | "dithering"
  | "stained_glass"
  | "text_fill"
  | "emoji"
  | "word_cloud"
  | "binary"
  | "matrix_rain"
  | "reaction_diffusion"
  | "liquid"
  | "sand"
  | "magnetic_field"
  | "noise_displacement"
  | "night_camera"
  // Geometry-space modes. These read a 3D sample cloud and camera rather than a
  // raster, so they are only available when the source is a procedural scene.
  | "geometry_ascii"
  | "shaded";

export type AsciiAlgorithm =
  | "brightness"   // perceptual luminance (0.299R + 0.587G + 0.114B)
  | "average"      // (R + G + B) / 3
  | "lightness"    // HSL L = (max + min) / 2
  | "edge"         // Sobel magnitude
  | "edge_directional" // Sobel angle, mapped to |-/\
  | "contrast";    // |brightness - 0.5| * 2

export type AsciiCharsetPreset =
  | "standard"
  | "detailed"
  | "blocks"
  | "braille"
  | "directional"
  | "custom";

export type ColorMode = "single" | "source" | "palette" | "complementary" | "rainbow";

export type RenderResolution = "auto" | "720p" | "1080p" | "1440p" | "2160p";

/** Shared color settings every render mode uses. */
export interface ColorOptions {
  mode: ColorMode;
  color: string;
  palette: string[];
  /** Animates renderer behavior for the active mode. */
  animated: boolean;
  /** Optional color-cycling pass independent from mode animation. */
  cycleColors: boolean;
  animationSpeed: number;
}

export interface AsciiSettings {
  charsetPreset: AsciiCharsetPreset;
  charset: string;          // used when preset === "custom"
  density: number;          // chars per row
  algorithm: AsciiAlgorithm;
  inverted: boolean;        // flip mapping (light chars on dark areas, etc.)
  dithered: boolean;        // Floyd-Steinberg error diffusion on the brightness grid
  charAspect: number;
  /**
   * Per-cell background fill behind each glyph, 0–1. Paints the cell in its own
   * sampled colour before the character is drawn, which fills the gaps between
   * glyphs and reads much denser than foreground-only ASCII.
   */
  highlight: number;
  /** 0–1 blend of the original source drawn beneath the ASCII layer. */
  blend: number;
  color: ColorOptions;
}

export interface PixelSettings {
  cellSize: number;
  gap: number;
  rounded: boolean;
  roundness: number;
  color: ColorOptions;
}

export interface DotSettings {
  cellSize: number;
  sizeFromBrightness: boolean;
  invertSize: boolean;
  minSize: number;
  maxSize: number;
  color: ColorOptions;
}

export interface MosaicSettings {
  cellSize: number;
  variation: number;
  rotation: number;
  rounded: boolean;
  color: ColorOptions;
}

export interface BlurredSettings {
  color: ColorOptions;
  radius: number;       // 0–50 px
  saturation: number;   // 0–2 multiplier
  brightness: number;   // 0–2 multiplier
}

export interface BlackSettings {
  color: ColorOptions;
  threshold: number;    // 0–1 brightness cutoff
  softness: number;     // 0–10 px feather blur before threshold
  invert: boolean;      // swap silhouette (image area becomes background)
}

export interface TransparentSettings {
  color: ColorOptions;
  opacity: number;      // 0–1
  blur: number;         // 0–50 px optional blur
}

export type DitherStyle = "floyd" | "bayer" | "ordered" | "sierra" | "atkinson";

export interface EffectSettings {
  scale: number;
  intensity: number;
  threshold: number;
  seed: number;
  text: string;
  emojiSet: string;
  ditherStyle: DitherStyle;
  color: ColorOptions;
  shadowColor: string;
  highlightColor: string;
}

export interface OutputSettings {
  brightness: number;
  saturation: number;
  hue: number;
  luminance: number;
  opacity: number;
}

export interface MouseSettings {
  enabled: boolean;
  radius: number;
  strength: number;
  returnSpeed: number;
  damping: number;
}

/** Where the frame comes from. Imported media, or a procedural scene. */
export type SourceKind = "media" | "scene";

/**
 * Frame shape for procedural sources. Imported media carries its own aspect;
 * a scene does not, so it needs to be told — and the social targets are the
 * whole point of fixing it.
 */
export type FrameAspect = "fill" | "9:16" | "4:5" | "1:1" | "16:9";
// The aspect table and lookup live in lib/modes.ts with the other render-config
// tables; this module stays types-only apart from the media helpers below.

/** Active procedural scene and its parameter map (keyed by its paramDefs). */
export interface SceneSettings {
  id: string;
  params: Record<string, any>;
}

/** Orbit camera, used only when sourceKind === "scene". */
export interface CameraSettings {
  distance: number;
  fov: number;
  elevation: number;
  azimuth: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  targetY: number;
}

export interface GeometryAsciiSettings {
  charRamp: string;
  fontSize: number;
  embeddedMessage: string;
  directionalEdges: boolean;
  edgeThreshold: number;
  edgeBoost: number;
  glitchEffect: boolean;
  glitchDuration: number;
  multiscaleGlow: boolean;
  glowIntensity: number;
  specularIntensity: number;
  specularPower: number;
  emissionBoost: number;
  /** Per-cell background fill behind each glyph, 0–1. */
  highlight: number;
  color: ColorOptions;
}

export interface VisualState {
  mode: RenderMode;
  sourceKind: SourceKind;
  frameAspect: FrameAspect;
  scene: SceneSettings;
  camera: CameraSettings;
  geometryAscii: GeometryAsciiSettings;
  background: string;
  backgroundEnabled: boolean;
  renderResolution: RenderResolution;
  videoDurationSec: number;
  ascii: AsciiSettings;
  pixels: PixelSettings;
  dots: DotSettings;
  mosaic: MosaicSettings;
  blurred: BlurredSettings;
  black: BlackSettings;
  transparent: TransparentSettings;
  effect: EffectSettings;
  output: OutputSettings;
  mouse: MouseSettings;
}

export interface TimelineKeyframe {
  id: string;
  time: number; // seconds
  state: VisualState;
}

export interface TimelineSettings {
  enabled: boolean;
  playing: boolean;
  loop: boolean;
  duration: number; // seconds
  currentTime: number; // seconds
  selectedId: string | null;
  keyframes: TimelineKeyframe[];
}

export interface RenderLayer {
  id: string;
  opacity: number;
  blendMode: string; // GlobalCompositeOperation value
  visual: VisualState;
}

export interface AppState extends VisualState {
  timeline: TimelineSettings;
  layers: RenderLayer[];
}

/**
 * Anything the renderers can draw from. Images, videos and procedurally rendered
 * canvases all satisfy ctx.drawImage, which is the only thing the image-space
 * renderers ever ask of a source — so a scene rendered to a canvas flows through
 * all of them unchanged.
 */
export type MediaSource = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;

export function isVideo(m: MediaSource | null): m is HTMLVideoElement {
  return typeof HTMLVideoElement !== "undefined" && m instanceof HTMLVideoElement;
}

export function isCanvasSource(m: MediaSource | null): m is HTMLCanvasElement {
  return typeof HTMLCanvasElement !== "undefined" && m instanceof HTMLCanvasElement;
}

export function mediaSize(m: MediaSource): { w: number; h: number } {
  if (isVideo(m)) return { w: m.videoWidth || 0, h: m.videoHeight || 0 };
  if (isCanvasSource(m)) return { w: m.width || 0, h: m.height || 0 };
  return { w: m.naturalWidth || m.width || 0, h: m.naturalHeight || m.height || 0 };
}
