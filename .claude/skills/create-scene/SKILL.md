---
name: create-scene
description: Canonical guide and checklist for agents creating original procedural animation scenes for Pixelate.
---

# Create Scene Skill — Pixelate

Use this skill whenever asked to add, extend, or design a new procedural animation scene in Pixelate.

## Workflow Checklist

1. **Geometry & Math Formulation**:
   - Formulate clean parametric equations (e.g. logarithmic spirals, Fibonacci phyllotaxis, Catmull-Rom splines, or Riemann surfaces).
   - Compute or approximate analytical surface normals $\vec{N}$ to empower the lighting and directional edge detection engine.
2. **Implement `IScene`**:
   - Create `engine/scenes/YourSceneNameScene.ts`.
   - Provide standard Three.js meshes in `init()` so the shaded raster path works.
   - Implement `getSampleCloud(frameInfo, params)` to provide dense 3D points with normals, colors, ambient occlusion, stable IDs, and flying flags for `GeometryAsciiRenderer`.
3. **Expose Typed Parameters**:
   - Declare parameters with ranges, steps, defaults, and categories in `paramDefs`.
   - Ensure color gradients, speeds, and geometric scales are tunable.
4. **Author Presets**:
   - At least one preset. Its `cameraParams` frame your subject when the scene loads, so tune them.
5. **Register in `SceneRegistry.ts`**:
   - Add `register("your_id", "Your scene", "Category", true, () => new YourSceneNameScene())`.
6. **Verify Visually & Offline**:
   - Run `npx tsc --noEmit` and `npm run build`.
   - Run `npm run dev`, open `/app`, set Source to Scene and pick yours.
   - Confirm it reads in Depth ASCII and in at least one image-space mode.
   - Scrub time both directions and confirm the same `t` gives the same frame.

Full contract and the compatibility boundaries: see `AGENTS.md` at the repo root.
