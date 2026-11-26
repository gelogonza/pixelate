import type { IScene } from "./types";
import { BloomingFlowerScene } from "./scenes/BloomingFlowerScene";
import { ButterflyScene } from "./scenes/ButterflyScene";
import { JellyfishScene } from "./scenes/JellyfishScene";
import { BlackHoleScene } from "./scenes/BlackHoleScene";
import { OceanWavesScene } from "./scenes/OceanWavesScene";
import { MorphingAbstractScene } from "./scenes/MorphingAbstractScene";
import { CreationScene } from "./scenes/CreationScene";
import { GalaxySupernovaScene } from "./scenes/GalaxySupernovaScene";

export interface SceneEntry {
  id: string;
  name: string;
  category: string;
  /** True when the scene supplies a dense GeometrySampleCloud. Scenes without
   *  one fall back to per-vertex mesh sampling, which looks notably sparser in
   *  the geometry ASCII renderer. */
  hasSampleCloud: boolean;
  factory: () => IScene;
}

const entries: SceneEntry[] = [];

function register(
  id: string,
  name: string,
  category: string,
  hasSampleCloud: boolean,
  factory: () => IScene
) {
  entries.push({ id, name, category, hasSampleCloud, factory });
}

register("blooming_flower", "Blooming flower", "Organic", true, () => new BloomingFlowerScene());
register("butterfly", "Butterfly metamorphosis", "Organic", true, () => new ButterflyScene());
register("creation", "Creation", "Narrative", true, () => new CreationScene());
register("galaxy_supernova", "Galaxy supernova", "Cosmic", true, () => new GalaxySupernovaScene());
register("jellyfish", "Jellyfish", "Organic", false, () => new JellyfishScene());
register("black_hole", "Black hole", "Cosmic", false, () => new BlackHoleScene());
register("ocean_waves", "Ocean waves", "Natural", false, () => new OceanWavesScene());
register("morphing_geometry", "Morphing geometry", "Abstract", false, () => new MorphingAbstractScene());

export const SCENE_ENTRIES: readonly SceneEntry[] = entries;

export function getSceneEntry(id: string): SceneEntry {
  return entries.find((e) => e.id === id) ?? entries[0];
}

export function createScene(id: string): IScene {
  return getSceneEntry(id).factory();
}

/** Scene metadata read without running init(). Constructing a scene only sets up
 *  plain fields — no GPU resources are allocated until init(), so this is cheap
 *  and needs no matching dispose(). */
function describe(id: string) {
  const s = createScene(id);
  return { paramDefs: s.paramDefs, defaultParams: s.defaultParams, presets: s.presets };
}

const descriptionCache = new Map<string, ReturnType<typeof describe>>();

function described(id: string) {
  let d = descriptionCache.get(id);
  if (!d) {
    d = describe(id);
    descriptionCache.set(id, d);
  }
  return d;
}

/** Typed parameter schema a scene exposes to the UI. */
export function sceneParamDefs(id: string) {
  return described(id).paramDefs;
}

/** Default parameter map for a scene. */
export function sceneDefaults(id: string): Record<string, unknown> {
  return { ...described(id).defaultParams };
}

/** Presets the scene ships with (scene + renderer + camera snapshots). */
export function scenePresets(id: string) {
  return described(id).presets;
}

/**
 * Scene parameters and camera framing from the scene's first preset.
 *
 * Each scene was authored against a camera it is composed for — distance, fov
 * and elevation differ a lot between, say, a flower seen from above and a
 * butterfly seen side-on — so starting from the preset frames the subject
 * properly instead of leaving it small in the middle of an arbitrary default.
 */
export function sceneStartState(id: string): {
  params: Record<string, any>;
  camera: SceneCamera | null;
  duration: number | null;
} {
  const d = described(id);
  const preset = d.presets?.[0];
  return {
    params: { ...d.defaultParams, ...(preset?.sceneParams ?? {}) },
    camera: preset?.cameraParams ? { ...preset.cameraParams } : null,
    duration: preset?.duration ?? null,
  };
}

export interface SceneCamera {
  distance: number;
  fov: number;
  elevation: number;
  azimuth: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  targetY: number;
}
