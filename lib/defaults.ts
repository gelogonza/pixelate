import { AppState, CameraSettings, ColorMode, ColorOptions, GeometryAsciiSettings } from "./types";
import { sceneStartState } from "@/engine/SceneRegistry";

export const DEFAULT_SCENE_ID = "blooming_flower";

export const defaultCamera: CameraSettings = {
  distance: 5.5,
  fov: 45,
  elevation: 20,
  azimuth: 35,
  autoRotate: true,
  autoRotateSpeed: 15,
  targetY: 0.2,
};

export function defaultGeometryAscii(): GeometryAsciiSettings {
  return {
    charRamp: "classic",
    fontSize: 10,
    embeddedMessage: "become",
    directionalEdges: true,
    edgeThreshold: 0.28,
    edgeBoost: 1.25,
    glitchEffect: true,
    glitchDuration: 0.45,
    multiscaleGlow: true,
    glowIntensity: 0.85,
    specularIntensity: 0.28,
    specularPower: 22,
    emissionBoost: 0.6,
    color: makeColorOptions("source"),
  };
}

export const DEFAULT_PALETTE = [
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#fb923c",
  "#34d399",
  "#facc15",
  "#22d3ee",
  "#f87171",
];

export function resizePalette(palette: string[], size: number): string[] {
  const clamped = Math.max(1, Math.min(8, Math.floor(size)));
  if (clamped <= palette.length) return palette.slice(0, clamped);
  const next = palette.slice();
  while (next.length < clamped) {
    next.push(DEFAULT_PALETTE[next.length % DEFAULT_PALETTE.length]);
  }
  return next;
}

export function makeColorOptions(
  mode: ColorMode = "source",
  overrides: Partial<ColorOptions> = {}
): ColorOptions {
  return {
    mode,
    color: "#e6e6e6",
    palette: DEFAULT_PALETTE.slice(0, 4),
    animated: false,
    cycleColors: false,
    animationSpeed: 4,
    ...overrides,
  };
}

export const defaultState: AppState = {
  mode: "ascii",
  sourceKind: "media",
  sceneAspect: "9:16",
  scene: { id: DEFAULT_SCENE_ID, params: sceneStartState(DEFAULT_SCENE_ID).params },
  camera: sceneStartState(DEFAULT_SCENE_ID).camera ?? { ...defaultCamera },
  geometryAscii: defaultGeometryAscii(),
  background: "#0a0a0a",
  backgroundEnabled: true,
  renderResolution: "auto",
  videoDurationSec: 5,
  ascii: {
    charsetPreset: "standard",
    charset: " .:-=+*#%@",
    density: 110,
    algorithm: "brightness",
    inverted: false,
    dithered: false,
    charAspect: 1,
    color: makeColorOptions("source"),
  },
  pixels: {
    cellSize: 14,
    gap: 1,
    rounded: false,
    roundness: 0.2,
    color: makeColorOptions("source"),
  },
  dots: {
    cellSize: 14,
    sizeFromBrightness: true,
    invertSize: false,
    minSize: 0.05,
    maxSize: 1.0,
    color: makeColorOptions("source"),
  },
  mosaic: {
    cellSize: 18,
    variation: 0.35,
    rotation: 0.2,
    rounded: true,
    color: makeColorOptions("source"),
  },
  blurred: {
    color: makeColorOptions("source"),
    radius: 12,
    saturation: 1.0,
    brightness: 1.0,
  },
  black: {
    color: makeColorOptions("source"),
    threshold: 0.5,
    softness: 0,
    invert: false,
  },
  transparent: {
    color: makeColorOptions("source"),
    opacity: 1.0,
    blur: 0,
  },
  effect: {
    scale: 18,
    intensity: 0.7,
    threshold: 0.5,
    seed: 7,
    text: "PIXELATE",
    emojiSet: " .:-=+*#%@",
    ditherStyle: "floyd",
    color: makeColorOptions("source"),
    shadowColor: "#111827",
    highlightColor: "#f8fafc",
  },
  output: {
    brightness: 1,
    saturation: 1,
    hue: 0,
    luminance: 1,
    opacity: 1,
  },
  mouse: {
    enabled: false,
    radius: 120,
    strength: 0.7,
    returnSpeed: 0.08,
    damping: 0.82,
  },
  timeline: {
    enabled: false,
    playing: false,
    loop: true,
    duration: 5,
    currentTime: 0,
    selectedId: null,
    keyframes: [],
  },
  layers: [],
};
