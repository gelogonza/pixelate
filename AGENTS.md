# AGENTS.md — Procedural Scene Authoring

How to add an original procedural animation to Pixelate. Ported from ASCII Studio,
where this contract was developed.

A scene is the only thing you need to write. Registering it gives you, for free:
all 39 image-space render modes, the depth-ASCII and shaded geometry modes, a full
control panel built from your parameter schema, keyframing, layers, pointer
interaction and every export format.

---

## 1. Architectural rules

1. **`engine/` has zero React and zero Next imports.** All scene math, Three.js
   geometry and animation must run as plain TypeScript, so it works in the browser
   and in a headless Node script alike.

2. **Deterministic time.** Motion must be a pure function of `frameInfo.time` and
   `frameInfo.progress`. Never read `performance.now()`, never accumulate per-frame
   deltas, never depend on frame rate. Rendering the same `t` twice must produce the
   same image — seeking, keyframing and reproducible export all rely on it.

3. **Geometry is separate from style.** A scene describes a moving 3D form. It does
   not decide how that form is drawn. The same scene must survive being rendered as
   depth ASCII, as a shaded raster, or through any image-space mode.

4. **Verify before claiming it works.** Render actual frames and look at them. A
   scene that typechecks is not a scene that renders.

---

## 2. The `IScene` contract

Implement `IScene` from `engine/types.ts`:

```ts
export interface IScene {
  id: string;                        // stable lowercase id, e.g. 'butterfly'
  name: string;
  description: string;
  category: string;                  // 'Organic' | 'Cosmic' | 'Abstract' | ...
  paramDefs: ParameterDefinition[];  // typed schema → becomes the UI
  defaultParams: ParameterMap;
  presets: Preset[];                 // at least one, carrying camera framing
  stages?: SceneStage[];             // descriptive timeline metadata (see §6)

  init(ctx: SceneContext, params: ParameterMap): Promise<void> | void;
  update(frameInfo: FrameInfo, params: ParameterMap): void;
  getSampleCloud?(frameInfo: FrameInfo, params: ParameterMap): GeometrySampleCloud | null;
  onResize(width: number, height: number): void;
  dispose(): void;
}
```

Register it in `engine/SceneRegistry.ts`:

```ts
register("my_scene", "My scene", "Abstract", /* hasSampleCloud */ true,
         () => new MyScene());
```

That one line is the whole integration.

---

## 3. `getSampleCloud` — implement it

This is the difference between a scene that looks good and one that does not.

```ts
export interface GeometrySampleCloud {
  positions: Float32Array;          // [x,y,z, ...] world space
  normals: Float32Array;            // [nx,ny,nz, ...] unit vectors
  colors: Float32Array;             // [r,g,b, ...] 0..1
  ambientOcclusion?: Float32Array;  // 0..1, lower in crevices
  ids?: Int32Array;                 // stable per-sample id
  flying?: Uint8Array;              // 1 = airborne particle, 0 = solid surface
  glow?: Float32Array;              // 0..1 self-emission
}
```

The depth-ASCII renderer Z-buffers these samples per character cell and lights each
from its normal. If you omit `getSampleCloud`, `SceneHost` falls back to emitting one
sample per mesh *vertex* with a flat per-mesh colour, no AO, no glow and no particle
identity — which renders visibly sparse and unlit. Four of the eight scenes ported
from ASCII Studio are in that state (`jellyfish`, `black_hole`, `ocean_waves`,
`morphing_geometry`) and they look worse than the four that are not.

Guidance that matters in practice:

- **Sample the surface, not the mesh.** Walk a `(u, v)` parameter grid and evaluate
  your parametric equations. Aim for enough samples that each covered character cell
  wins at least one — sparse clouds read as noise.
- **Derive normals from the surface**, by finite differences on the `(u, v)` grid or
  analytically. A constant per-patch normal produces flat banding, because the ASCII
  ramp maps luminance to glyph weight and kills the form twice over.
- **Compute normals before applying displacement noise**, or the gradients pick up
  the noise instead of the shape.
- **Keep `ids` stable across frames.** Airborne samples (`flying = 1`) are drawn as a
  single letter of the embedded message chosen by `id`, so an unstable id makes
  particles flicker through the alphabet.

---

## 4. Parameter schema

`paramDefs` drives the inspector directly — `components/controls/ParamControl.tsx`
maps each type onto Pixelate's existing controls, so you get the house look for free.

```ts
export const MY_PARAMS: ParameterDefinition[] = [
  { key: "scale", name: "Object scale", type: "number",
    default: 1.5, min: 0.5, max: 3, step: 0.1, unit: "x", category: "Geometry" },
  { key: "tint", name: "Primary tint", type: "color",
    default: "#38bdf8", category: "Materials" },
  { key: "mode", name: "Motion", type: "select", default: "harmonic",
    options: [{ label: "Harmonic", value: "harmonic" },
              { label: "Vortex", value: "vortex" }], category: "Motion" },
];
```

`category` becomes a `<Section>`. Give every number a sane `min`/`max`/`step` — they
are the slider bounds, and a bad range makes the control useless.

Scene parameters live on `VisualState`, so they are keyframed by
`lib/timeline.ts` with no extra work.

---

## 5. Presets and camera framing

Ship at least one preset. Its `cameraParams` are loaded when the scene is selected
(`sceneStartState` in `engine/SceneRegistry.ts`), so this is how you frame your own
subject. A scene composed for a top-down view at 48° elevation looks like a smear at
the global default of 20°.

Set `duration` too — it becomes the loop length.

---

## 6. Staging

`stages` is **descriptive metadata only**. Nothing in the engine reads it. Actual
choreography is hand-written inside `update()`, branching on `frameInfo.progress`.
Keep `stages` accurate anyway: it documents the intended beats for whoever edits the
scene next.

---

## 7. Verification

```bash
npx tsc --noEmit        # types
npm run build           # production build
npm run dev             # then open /app, pick Source → Scene
```

Check, in the app:

- The scene renders in **Depth ASCII** with readable form and visible depth edges.
- It renders through at least one image-space mode (it is just a raster there).
- Your parameters appear in the inspector and changing them does something.
- Scrubbing time forwards and backwards returns to the same image.

---

## 8. Compatibility boundaries

Not every mode works on every source, and the UI enforces it
(`modesForSource` in `lib/modes.ts`):

| Mode class | Image | Video | Scene |
|---|---|---|---|
| Cell modes, filters, the 32 effect modes | yes | yes | yes |
| Depth ASCII, Shaded 3D | no | no | **yes only** |

Geometry modes need a sample cloud and camera matrices. There is no depth buffer for
a photograph, so they are hidden when the source is media.

---

## Attribution

The depth-ASCII renderer (`renderers/geometryAscii.ts`) is a TypeScript port of the
rasterizer in Edward Jones's ASCII art project (MIT),
https://github.com/edwardjones7/ascii-art — specifically the `rasterize()` and
`edge_chars()` routines in `butterfly/butterfly.py`. The surface luminance term, the
edge thresholds, the gradient-angle buckets and the depth-of-field falloff are his.
