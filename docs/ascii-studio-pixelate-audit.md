# ASCII Studio & Pixelate — Architectural Audit and Integration Strategy

**Date:** 2026-11-26
**Scope:** `/Users/angelo/Coding/ascii-studio` @ `bd82d7c`, `/Users/angelo/Coding/pixelate` @ `7f15b88` (branch `claude/ascii-pixelate-audit-a63ee7`, identical to `main`)
**Status:** Research and recommendation only. No code modified in either repository.

Throughout, findings are tagged:

- **[V]** Verified by reading the source at the cited path and line.
- **[A]** Assumption or inference — stated as such, not verified by execution.
- **[P]** Proposal — does not exist today.

---

## 1. Executive Summary

You have two codebases that are far less overlapping than their feature lists suggest, and one of them is doing something the other structurally cannot.

**Pixelate** is a mature *image-space* pipeline. 39 render modes, a keyframe timeline with deep parameter interpolation, layer compositing with blend modes, pointer physics, a unified post-processing stack, and a visual identity you want to keep. Its defining constraint, and it is a hard one: **every single mode requires an imported `MediaSource`.** The ones labelled "Generative" are not generative — `renderEffect` opens with `const img = readSource(rc); if (!img) return;` (`renderers/effects.ts:693-694`) **[V]**. Pixelate cannot draw anything without a photo or a video behind it.

**ASCII Studio** is an immature *geometry-space* pipeline wrapped in a weaker application. 8 procedural scenes, a deterministic clock, a Three.js scene graph, and — the genuine prize — a renderer that projects 3D surface point clouds into a per-cell Z-buffer with analytical lighting, directional depth-edge glyphs, and stable particle identity (`src/engine/renderers/GeometryAsciiRenderer.ts`) **[V]**. It also has the only real video export of the two: deterministic offscreen frame-by-frame rendering piped to local FFmpeg (`src/engine/export/Exporter.ts:112-197`, `src/server/exportPlugin.ts:236`) **[V]**.

Three findings reshape the decision:

1. **There is almost no code duplication.** I expected to find two ASCII renderers doing the same job. They do not. Pixelate's `renderAscii` maps a 2D luminance grid to a character ramp. ASCII Studio's `GeometryAsciiRenderer` resolves depth, computes per-sample Lambert+Blinn lighting from normals, and derives glyphs from depth discontinuities. These are different algorithms solving different problems. The only genuinely duplicated logic is a handful of small utilities — charsets, hex↔RGB, Bayer matrices, luminance constants — maybe 150 lines total. **Duplication is not a reason to merge.**

2. **ASCII Studio's flagship renderer is a direct TypeScript port of the Edward Jones reference, not original work.** `GeometryAsciiRenderer.ts:366` is `lum = (0.25 + 0.95*diff + 0.3*(1-absNz)²) * (0.25 + 0.75*ao) + emitK*glow`. `references/edwardjones-ascii-art/butterfly/butterfly.py:252` is `lum = (0.25 + 0.95*diff + 0.3*(1-nd)**2) * (0.25 + 0.75*ao) + 0.6*glow`. The edge thresholds (`0.28`, `1.8`), the angle buckets (`22.5/67.5/112.5`), the DOF curve (`0.55 + 0.45*…`), the rim-shift vector (`0.22, -0.02, 0.10`) and the `lumt` weighting (`0.35 + 0.65*max(rgb)`) are identical **[V]**. The reference is MIT-licensed and the LICENSE is vendored, so this is legally fine — but the renderer's own description string calls itself "State-of-the-art" with no attribution (`GeometryAsciiRenderer.ts:162`), and `AGENTS.md` presents the technique as a house invention. Before any of this lands in a public repo, add attribution. This also reframes the "comparable sophistication to Edward Jones" goal: on the rasterizer you are already *at* parity, because it is the same rasterizer. The gap is entirely in **scene authorship**, not rendering.

3. **The integration seam is a single type.** Pixelate's `MediaSource = HTMLImageElement | HTMLVideoElement` (`lib/types.ts:208`) is consumed through exactly two functions: `mediaSize()` (`lib/types.ts:214`) and `ctx.drawImage(source, …)` inside `drawSourceContain` (`renderers/sourceColor.ts:24`) and `sampleSource` (`lib/imageData.ts:69`) **[V]**. An `HTMLCanvasElement` satisfies `drawImage` natively. Widening that union to include a canvas-backed procedural source makes **all 39 existing modes work on procedural geometry on day one**, with no renderer changes. That is an unusually cheap integration, and it is the strongest argument for Option C.

**Recommendation: Option C, scoped tightly — procedural scenes become a Pixelate source type, not a Pixelate sub-application.** Port the scene contract, the deterministic clock, the geometry ASCII renderer and the FFmpeg export path into Pixelate as additive modules. Retire ASCII Studio's React shell, its 4 image-space renderers (Pixelate's equivalents are better), its preset manager (Pixelate's timeline supersedes it), and its DialKit dependency (which, verified below, does nothing). Keep the ASCII Studio repository alive as a mathematics scratchpad, not as a second production app.

**Do not** build Option B's shared library. Two consumers, one of which you are about to retire, does not justify a package boundary — it buys you versioning overhead and buys the artwork nothing.

---

## 2. Complete Annotated File Trees

### 2.1 ASCII Studio — `/Users/angelo/Coding/ascii-studio`

Engine: 7,884 LOC across `src/engine` **[V]**.

```
ascii-studio/
├── AGENTS.md                       Scene-creation contract for agents. Accurate on the IScene
│                                     interface; overstates DialKit ("mapped to DialKit" — it is not,
│                                     §3.9) and presents the ported rasterizer as original. ACTIVE.
├── README.md                       Feature overview. Claims a 4K export preset and "Live DialKit
│                                     sliders"; both are inaccurate (§3.9, §8 debt table). ACTIVE.
├── package.json                    Vite + React 19 + three 0.187. `"verify": "tsx scripts/
│                                     verify-studio.ts"` points at a file that does not exist [V].
├── vite.config.ts                  Mounts the FFmpeg export middleware into the dev server.
│                                     Consequence: export only works under `npm run dev`.
├── index.html / src/main.tsx       Standard Vite entry. ACTIVE.
│
├── src/engine/                     ── ZERO-REACT CORE. This is the portable asset. ──
│   ├── types.ts            (154)   IScene, IRenderer, GeometrySampleCloud, Preset, CameraParams,
│   │                                 FrameInfo, TypographyOverlayParams. Depends on: three (types
│   │                                 only). Consumed by: everything. ACTIVE. → PORT WHOLESALE.
│   ├── Clock.ts            (146)   AnimationClock. `getExplicitFrameInfo(f)` gives t = f/fps —
│   │                                 the basis of deterministic export. No duplicate in Pixelate.
│   │                                 ACTIVE. → PORT.
│   ├── Camera.ts            (67)   Spherical orbit controller; azimuth advances off frameInfo.time,
│   │                                 not wall clock (Camera.ts:49) so it is seek-safe. ACTIVE. → PORT.
│   ├── StudioEngine.ts     (295)   Owns preview canvas, offscreen WebGL, rAF loop, scene/renderer
│   │                                 swap, preset load. Smuggles the active scene to the renderer via
│   │                                 `(threeScene as any)._activeStudioScene` (StudioEngine.ts:157)
│   │                                 — a deliberate escape hatch, and the one piece of the design I
│   │                                 would not copy. ACTIVE. → REFACTOR during port.
│   ├── SceneRegistry.ts     (42)   id → factory map, 8 scenes. ACTIVE. → PORT (trivial).
│   ├── RendererRegistry.ts  (36)   id → factory map, 5 renderers. ACTIVE. → PARTIALLY RETIRE.
│   │
│   ├── scenes/                     ── THE ACTUAL CREATIVE CAPITAL. 4,855 LOC. ──
│   │   ├── ButterflyScene.ts    (1108)  getSampleCloud ✓  stages ✓  Most complete. Wing surface
│   │   │                                  emission, veins, spots, chrysalis crack, dust trail.
│   │   ├── BloomingFlowerScene.ts(1010) getSampleCloud ✓  stages ✓  Fibonacci whorls, 5 stages.
│   │   ├── CreationScene.ts      (808)  getSampleCloud ✓  stages ✓  101 Math.* calls — densest.
│   │   ├── JellyfishScene.ts     (471)  getSampleCloud ✗  stages ✗  DEGRADED (see below).
│   │   ├── GalaxySupernovaScene.ts(448) getSampleCloud ✓  stages ✓
│   │   ├── BlackHoleScene.ts     (386)  getSampleCloud ✗  stages ✗  DEGRADED.
│   │   ├── MorphingAbstractScene.ts(358)getSampleCloud ✗  stages ✗  DEGRADED.
│   │   └── OceanWavesScene.ts    (266)  getSampleCloud ✗  stages ✗  DEGRADED.
│   │                               **Only 4 of 8 scenes implement getSampleCloud** [V]. The other
│   │                               four fall through to GeometryAsciiRenderer's mesh-vertex
│   │                               fallback (:604-667), which emits one sample per *vertex* with a
│   │                               flat per-mesh colour, no AO, no glow, no flying flags. Tessellated
│   │                               geometry produces a sparse, unlit point cloud. These four scenes
│   │                               look markedly worse in the flagship renderer, and the repo does
│   │                               not say so anywhere. → 4 PRESERVE, 4 NEED WORK.
│   │
│   ├── renderers/
│   │   ├── GeometryAsciiRenderer.ts (676) id `ascii`. THE PRIZE. Per-cell Z-buffer, view-space
│   │   │                                  normals, Blinn-Phong, depth-edge glyphs, embedded
│   │   │                                  highlight text, materialization glitch, 2-scale additive
│   │   │                                  bloom. Port of butterfly.py rasterize()+edge_chars() [V].
│   │   │                                  No Pixelate equivalent. → PORT. HIGHEST VALUE.
│   │   ├── AsciiRenderer.ts     (373) id `ascii_image`. WebGL→downsample→luminance→char ramp.
│   │   │                                  Pixelate's renderers/ascii.ts does this better (6 algorithms
│   │   │                                  incl. Sobel, FS dithering, 5 colour modes). → RETIRE.
│   │   ├── DitherRenderer.ts    (271) Bayer 2×2/4×4 + 6 hardware palettes. Pixelate's `dithering`
│   │   │                                  mode has 5 styles incl. Sierra/Atkinson. Palettes are worth
│   │   │                                  salvaging as data. → RETIRE CODE, KEEP RETRO_PALETTES.
│   │   ├── HalftoneRenderer.ts  (238) Dot screen. Pixelate has `halftone_cmyk`. → RETIRE.
│   │   └── ShadedRenderer.ts    (179) Straight WebGL blit + ACES + vignette. Only way to see a scene
│   │                                  un-stylized — genuinely useful as a "raw" preview. → PORT (small).
│   │
│   ├── overlays/TypographyOverlay.ts (160) Title/subtitle/watermark with fade, plus safe-area guides
│   │                                  for TikTok/Reels. Pixelate has nothing comparable. → PORT.
│   ├── presets/PresetManager.ts  (96) localStorage presets + parameter randomizer with per-key
│   │                                  locking. The randomizer (:52-78) is a real creative tool.
│   │                                  Preset storage is superseded by Pixelate's timeline.
│   │                                  → PORT RANDOMIZER, RETIRE STORAGE.
│   └── export/Exporter.ts       (296) Deterministic export: isolated WebGL + canvas, loop f=0..N,
│                                      `clock.getExplicitFrameInfo(f)`, `toDataURL`, POST each frame
│                                      to the dev server (:112-166). Also `renderStillPng`. The
│                                      per-frame base64 HTTP round-trip is the slow part [A].
│                                      → PORT, REWORK TRANSPORT.
│
├── src/server/exportPlugin.ts   (334) Vite middleware: /api/export/{start,frame,finish,cancel},
│                                      /api/exports. Spawns ffmpeg with array args (:236, no shell
│                                      injection), writes exports/manifest.json, cover PNG and
│                                      preset JSON. Dev-server only. → PORT as a Next.js route handler.
│
├── src/ui/                      (1775 tsx) HeaderBar, Viewport, TimelineBar, ControlPanel,
│   │                                  ExportModal, ExportHistoryModal. All inline-styled, dark-blue
│   │                                  (#0a0c10 / #38bdf8), visually unrelated to Pixelate.
│   │                                  → RETIRE ENTIRELY.
│   └── (ControlPanel.tsx:109-195 renders every parameter with hand-rolled
│        <input type="range|color|checkbox"> and <select>. Not DialKit.) [V]
│
├── src/App.tsx                  (338) Wires engine ↔ UI. Imports `DialRoot` from dialkit and mounts
│                                      `<DialRoot />` at :335 — the *only* DialKit usage in the
│                                      codebase [V]. The dependency is effectively dead. → RETIRE.
│
├── scripts/                     (~1000) Headless verification via @napi-rs/canvas:
│   ├── verify-all-renderers.ts        Renders every scene × renderer to PNG → dist/verify/*.png.
│   ├── verify-production-export.ts    Full 1080×1920 export + ffprobe assertion.
│   ├── export-butterfly-production.ts Scripted production export (SCENE env var).
│   ├── probe-butterfly-density.ts     Glyph-density tuning probe.
│   ├── test-camera-proj.ts / test-camera-render.ts / verify-synthetic-benchmark.ts
│   └── test-browser-render.ts         Static server + headless browser render.
│       These are a real asset — agent-runnable visual verification without a browser. ACTIVE.
│       → PORT THE PATTERN. (Note: no script named verify-studio.ts, which package.json calls.)
│
├── skills/create-scene/SKILL.md  (29) Agent checklist for authoring a scene. Concise, accurate,
│                                      points at the verify scripts. ACTIVE. → PORT.
├── references/
│   ├── edwardjones-ascii-art/          Vendored MIT reference: bloom3d.py (329), butterfly.py (393),
│   │                                   plus mp4/gif assets. SOURCE OF THE PORTED RASTERIZER.
│   └── butterfly-video-timeline/       Output of the ui-recording-timeline skill against
│                                       butterfly.mp4 — paint-timing analysis of the reference video.
├── exports/                            8 real MP4s (7.3M–39M), covers, preset JSON, manifest.json.
│                                       Hard evidence the export path works end to end [V].
├── dist/                               Build output incl. dist/verify/*.png render proofs.
├── reference/                          EMPTY. Dead directory. → DELETE.
├── public/                             EMPTY. → DELETE or populate.
└── node_modules/, .git/, package-lock.json   (excluded from analysis)
```

### 2.2 Pixelate — `/Users/angelo/Coding/pixelate`

Renderers + lib: 2,633 LOC. Components: 2,264 LOC **[V]**.

```
pixelate/
├── CLAUDE.md                     (87) Project working notes. Accurate and current. ACTIVE.
├── README.md                    (238) User-facing docs. Accurate. ACTIVE.
├── CONTRIBUTING.md              (241) ACTIVE.
├── package.json                       Next 14.2 + React 18 + Tailwind. No three.js, no WebGL.
├── next.config.js / postcss.config.js / tailwind.config.ts / tsconfig.json
│
├── app/
│   ├── page.tsx                  (16) Reads public/demos/*.webm, sorts numerically, feeds LandingPage.
│   ├── layout.tsx                (24) Root layout + @vercel/analytics.
│   ├── globals.css              (508) ALL custom CSS. Holds the visual identity: .px-slider,
│   │                                   .px-num, .ed-* landing classes. ACTIVE.
│   ├── app/page.tsx             (278) THE EDITOR. Owns AppState, media load/dispose, timeline
│   │                                   evaluation (:62-70), all 5 export handlers. ACTIVE.
│   │                                   → THIS IS THE FILE A SOURCE-TYPE CHANGE TOUCHES.
│   └── favicon.ico/route.ts       (7) Route handler for the favicon.
│
├── lib/
│   ├── types.ts                 (217) RenderMode (39 modes), per-mode settings, VisualState,
│   │                                   AppState, TimelineKeyframe, RenderLayer, and critically
│   │                                   `MediaSource` + `mediaSize()` (:208-217) — THE SEAM. ACTIVE.
│   ├── defaults.ts              (130) defaultState + palette helpers. ACTIVE.
│   ├── modes.ts                  (59) MODE_OPTIONS (39 entries, grouped), EFFECT_MODES set (32),
│   │                                   modeLabel(). Verified: union and options are in sync, no
│   │                                   orphan modes [V]. ACTIVE.
│   ├── charsets.ts               (19) 6 charset presets. DUPLICATES ascii-studio's ASCII_CHAR_SETS
│   │                                   and GeometryAsciiRenderer's inline ramps. ACTIVE.
│   ├── color.ts                  (24) hexToRgb etc. DUPLICATES PresetManager.hslToHex logic. ACTIVE.
│   ├── imageData.ts             (217) computeGridDims, sampleSource (Sobel incl. angle, :80-94),
│   │                                   buildCells, resampleCells (per-frame video, no realloc),
│   │                                   loadMedia, disposeMedia. ACTIVE. → SOURCE SEAM lives here too.
│   ├── timeline.ts              (140) Structural deep interpolation of VisualState: numbers lerp,
│   │                                   hex colours lerp in RGB, booleans/strings step at t=0.5,
│   │                                   arrays and objects recurse (:44-78). No ASCII Studio
│   │                                   equivalent. ACTIVE. → MAJOR ASSET.
│   └── export.ts                (276) exportPNG, exportIco (hand-built multi-size ICO, :37-75),
│                                      buildSVG (cell modes only), buildReactComponent,
│                                      startVideoRecording (MediaRecorder, :250-276). ACTIVE.
│                                      → VIDEO PATH IS THE WEAK LINK (§4.9).
│
├── hooks/useRenderer.ts         (886) THE RENDER LOOP. Canvas sizing + render resolution (:153-232),
│                                      cell rebuild (:116-150), cell physics (:235-288) and proxy-field
│                                      physics for non-cell modes (:290-357), lens warp (:360-432),
│                                      grid warp (:435-522), output adjustments (:525-596), layer
│                                      compositing (:634-701), rAF scheduling with an idle-stop
│                                      condition (:764-771). ACTIVE. Largest single file; doing five
│                                      jobs. → REFACTOR CANDIDATE, but working and load-bearing.
│
├── renderers/
│   ├── index.ts                  (32) mode → fn dispatch; CELL_MODES set.
│   ├── types.ts                  (30) Cell, RenderContext. `source: MediaSource | null` — THE SEAM.
│   ├── ascii.ts                 (123) 6 value algorithms incl. Sobel magnitude and Sobel *angle* →
│   │                                   directional glyphs (:31-47), Floyd–Steinberg on the value grid
│   │                                   (:79-97), animated char cycling + glyph wobble. MORE CAPABLE
│   │                                   than ascii-studio's AsciiRenderer in image space. ACTIVE.
│   ├── pixelBlocks.ts (31) / dots.ts (35) / mosaic.ts (41)   Cell-grid modes. ACTIVE.
│   ├── blurred.ts (22) / black.ts (55) / transparent.ts (18) Direct-source filters. ACTIVE.
│   ├── effects.ts               (960) ALL 32 effect modes behind one `renderEffect` switch.
│   │                                   Includes a real Navier–Stokes-ish fluid solver (diffuse/
│   │                                   project/advect, :489-690) with persistent module-level state.
│   │                                   Gated on media at :693. ACTIVE. → BIGGEST FILE, NEEDS SPLIT.
│   ├── color.ts                 (102) 5 colour modes (single/source/palette/complementary/rainbow)
│   │                                   + cycling + animated wobble. Shared by every mode. ACTIVE.
│   │                                   → SUPERIOR to ascii-studio's per-renderer colorMode blocks.
│   ├── sourceColor.ts            (70) drawSourceContain (:10-25) and drawColoredSource. ACTIVE.
│   ├── background.ts             (15) Shared background fill. ACTIVE.
│   └── util.ts                   (17) roundRect. ACTIVE.
│
├── components/
│   ├── Sidebar.tsx             (1111) EVERY control, hand-written per mode. Mode select, Layers,
│   │                                   Timeline, then one hardcoded <Section> block per mode
│   │                                   (:505-920), then Output / Mouse / Canvas / Source / Export.
│   │                                   ACTIVE. → THE SCALING PROBLEM (§4.11).
│   ├── LandingPage.tsx          (585) Self-contained marketing page. No shared state with editor.
│   ├── Canvas.tsx                (40) Canvas + container refs, exposes snapshot() for SVG export.
│   ├── UploadZone.tsx           (125) Drag-drop / picker.
│   ├── ExportModal.tsx           (82) Code-output modal (React component text).
│   └── controls/                (281) SliderInput, ColorInput, Toggle, Select, TextInput,
│                                      ModeSwitch, Section, ColorControls. Small, consistent,
│                                      Tailwind-based. ACTIVE. → THESE ARE THE VISUAL IDENTITY.
│
├── public/
│   ├── demos/                          10 .webm demo clips for the landing marquee. (not expanded)
│   ├── dreamscape-field.png            Before/after section asset.
│   └── icon.svg
└── .next/, node_modules/, .git/        (excluded)
```

---

## 3. ASCII Studio — End-to-End Breakdown

### 3.1 Core engine architecture

The engine is a two-registry coordinator. `StudioEngine.init()` (`StudioEngine.ts:57`) creates a 2D preview context on the visible canvas plus a *separate* offscreen canvas carrying a `THREE.WebGLRenderer`. Scenes and renderers are looked up by id and instantiated fresh on every swap. Per frame (`StudioEngine.ts:247-285`): advance clock → `camera.update(params, frameInfo)` → `scene.update(frameInfo, params)` → `renderer.render(threeScene, camera, threeRenderer, params, frameInfo)` → optional typography overlay → optional safe areas → notify listeners.

The decoupling claim in `AGENTS.md` holds: `src/engine` imports nothing from React **[V]**. The headless scripts under `scripts/` prove it by driving the same engine through `@napi-rs/canvas`.

### 3.2 Procedural scene generation

A scene is a class implementing `IScene` (`types.ts:59-73`). `init()` builds Three.js meshes; `update(frameInfo, params)` mutates them as a pure function of `frameInfo.time`; `getSampleCloud()` optionally emits a dense point cloud for the geometry ASCII renderer. Scenes carry their own `paramDefs`, `defaultParams`, `presets` and optional `stages`.

Scene quality is uneven. `ButterflyScene` (1,108 lines) builds a parametric wing from a keyed `smooth_curve`, emits a `WING_U × WING_V` surface grid with per-point normals, veins, edge darkening and spot rows, and drives a 4-stage chrysalis→flight sequence. `OceanWavesScene` (266 lines) is a Gerstner displacement with no sample cloud at all.

### 3.3 Three.js integration

Three is used as a scene graph and a math library, not really as a renderer. `ShadedRenderer` is the only one that blits the WebGL output directly. The other four treat the WebGL canvas as an intermediate raster to downsample (`AsciiRenderer.ts:227`, `DitherRenderer`, `HalftoneRenderer`), and `GeometryAsciiRenderer` bypasses WebGL rendering entirely — it only borrows the camera matrices (`GeometryAsciiRenderer.ts:284-287`). **[V]**

This matters for the port: the geometry renderer needs `THREE.Matrix4`/`Matrix3`/`Vector3` and a `PerspectiveCamera`, but no WebGL context. **[A]** A Pixelate integration could ship the geometry renderer with Three as a math dependency and no GL surface at all, which keeps the Next.js bundle honest.

### 3.4 Mathematical geometry and surface sampling

The `GeometrySampleCloud` contract (`types.ts:41-49`) is the good idea in this repo: flat `Float32Array`s of positions, normals, colours, plus optional AO, stable ids, a `flying` flag and glow. It separates "what the surface is" from "how it is drawn" at the right granularity — denser than vertices, cheaper than a mesh.

Scenes build these analytically. `ButterflyScene.emitWingSurface` (:703) walks a u/v parameter grid and computes normals from the parametric derivatives rather than from geometry. That is what makes the lighting read as a surface rather than as a point spray.

### 3.5 Image-space ASCII rendering (`ascii_image`)

`AsciiRenderer.render` (:190-361): attach three lights → render the scene to WebGL → `drawImage` the GL canvas down to a `cols × rows` sample canvas → `getImageData` → Rec.709 luminance → brightness/contrast → index a char ramp → `fillText`. 8 charsets, 6 colour modes, optional shadow-blur glow. Competent and completely ordinary. Pixelate's `renderAscii` does strictly more.

### 3.6 Geometry-space ASCII rendering (`ascii`) — the differentiator

`GeometryAsciiRenderer.render` (:238-584), in order:

1. Derive cell grid from `fontSize × 0.6` aspect; allocate nine parallel grids (`depth`, `lum`, `color`, `edge`, `edgeChar`, `flying`, `pid`, `firstOn`, `settle`) (:216-236).
2. Fetch the cloud via the `_activeStudioScene` back-channel, else fall back to mesh vertices (:589-667).
3. Build `viewProj` and a normal matrix from the camera; compute a view-space light and half-vector (:284-294).
4. For each sample: view-transform, near-clip, project to NDC, map to a cell, **Z-test against `depthGrid`** (:335), flip back-facing normals, compute `diff`/`spec`, apply the AO-weighted luminance formula and the DOF falloff, write the winning sample's colour, lum, flying flag and particle id into the cell (:304-386).
5. Scan the depth grid for discontinuities; where `maxJump > edgeThreshold` and the cell is a near-side silhouette, compute the depth gradient and bucket its angle into `- / | \` (:392-432).
6. Draw, with glyph priority: glitch (recently materialized) → flying particle letter (stable by `pid`) → directional edge char → embedded message (where `lum > 0.82`) → density ramp (:481-504). Colours are quantized to 10-step buckets for a terminal feel (:526-528).
7. Two downscale passes (1/5, 1/18) composited back with `globalCompositeOperation = 'lighter'` (:538-583).

**This is the single capability Pixelate cannot express.** Everything Pixelate does starts from an RGB raster; the depth buffer, the normals and the particle identity simply do not exist on that side of the seam.

### 3.7 Depth buffering

Per-cell, not per-pixel, and deliberately so: `if (depth <= this.depthGrid[cellIdx]) continue;` (:335). The grid is the character grid. This is why thin geometry does not shred — one glyph, one winning sample.

### 3.8 Lighting, materials, particles, choreography, camera

- **Lighting** is analytical and lives in the renderer, not in Three materials: a fixed world-space light `(-0.45, 0.65, 0.85)` transformed into view space, Lambert `diff` + Blinn `spec^specularPower`, AO-weighted, with a rim term from `(1 - |nz|)²` (:291-376). Three's `MeshStandardMaterial` only matters for the three *image-space* renderers.
- **Particles** are expressed as the `flying` flag plus a stable `ids` array, so an airborne sample keeps the same letter across frames (:492) rather than flickering.
- **Choreography** is `SceneStage[]` — `{id, name, startTime, endTime, description}` arrays on 4 of 8 scenes. They are *descriptive metadata only*: nothing in the engine reads `stages`. The actual staging is hand-written `if (progress < x)` branching inside each `update()`. **[V]** So "cinematic choreography" is a documentation convention and a set of hand-coded timelines, not a system.
- **Camera** is a 7-parameter spherical orbit (`Camera.ts`). Auto-rotation integrates `frameInfo.time`, so seeking is exact. There is no keyframing, no path, no DOF control, no look-at target other than `(0, targetY, 0)`.

### 3.9 DialKit integration — **it does not exist**

`dialkit@^2.2.1` is a dependency. The entire usage is `import { DialRoot } from 'dialkit'` and `<DialRoot />` at `App.tsx:2` and `App.tsx:335` **[V]**. Every parameter widget in `ControlPanel.tsx` is a hand-rolled `<input type="range">`, `<input type="color">`, `<select>` or `<input type="checkbox">` with inline styles (`ControlPanel.tsx:109-195`) **[V]**. The README's "Live DialKit sliders, color pickers, and selects" and `AGENTS.md`'s "mapped to DialKit" are both untrue of the current code.

**Consequence for your question about unifying Pixelate's controls with DialKit: there is nothing to unify with.** The valuable thing here is not DialKit, it is the `ParameterDefinition` schema. See §10.4.

### 3.10 Parameter schemas and preset management

`ParameterDefinition` (`types.ts:5-17`) is a good, small schema: `key`, `name`, `type` (number|boolean|color|select|string), `default`, `min`/`max`/`step`/`unit`, `options`, `category`, `description`. `ControlPanel` renders any array of them generically, and `PresetManager.randomizeParams` (:52-78) consumes the same schema to shuffle unlocked parameters — numbers snapped to step, colours generated in HSL for harmony, selects picked uniformly. That randomizer-with-locks is a genuinely good creative tool and has no Pixelate equivalent.

`Preset` (`types.ts:131-144`) is a full snapshot: scene id, renderer id, both parameter maps, camera, overlay, duration, fps, aspect ratio. Persisted to `localStorage` (`PresetManager.ts:4`). Built-in presets live on the scenes; user presets are appended.

### 3.11 Typography

Two layers. `TypographyOverlay` (160 lines) draws title/subtitle/watermark with fade in/out and optional glow, plus TikTok/Reels safe-area guides that are preview-only. Separately, the geometry renderer does *typographic shading* — the `embeddedMessage` stamped into highlights and the per-particle letter identity. The second is the artistically interesting one.

### 3.12 Video export

The only real export of the two apps. `StudioExporter.exportVideo` (:36-223):

1. `POST /api/export/start` → server creates a temp dir (`exportPlugin.ts:94-140`).
2. Build an **isolated** WebGL renderer, scene, camera and output canvas — not the live preview (:66-105). Means export is unaffected by preview state.
3. For `f = 0..totalFrames`: `clock.getExplicitFrameInfo(f)` → camera → scene → renderer → overlay → `canvas.toDataURL('image/png')` → `POST /api/export/frame` (:112-166).
4. `POST /api/export/finish` → server runs `spawn('ffmpeg', args)` with array arguments (`exportPlugin.ts:236`), writes the MP4, a cover PNG and the preset JSON, and prepends a record to `exports/manifest.json`.

`exports/manifest.json` records 8 completed exports at 1080×1920, 30 and 60 fps, 7.3MB–39MB **[V]**. This pipeline demonstrably works.

Its weakness is the transport: a base64 PNG data URL per frame over HTTP, synchronously awaited. At 1080×1920 that is roughly 2–4 MB of base64 per frame, 180–600 times per export **[A]** — almost certainly the dominant cost, and the reason a 6-second export is slow.

### 3.13 Scene creation skill — how an agent actually adds an animation today

Per `skills/create-scene/SKILL.md` and `AGENTS.md`:

1. Formulate parametric equations and analytical normals.
2. Write `src/engine/scenes/XScene.ts` implementing `IScene`: Three meshes in `init()` for the image-space renderers, plus `getSampleCloud()` for the geometry renderer.
3. Declare `paramDefs` with ranges/steps/categories.
4. Author ≥3 presets spanning ASCII/halftone/dither.
5. `SceneRegistry.register('x', () => new XScene())`.
6. Verify: `npm run build`, then `npx tsx scripts/verify-production-export.ts`, then `ffprobe` the result.

This is a good workflow and the best-designed part of the repository. One registration line, one file, and the scene appears everywhere with controls, presets, randomization and export. **Preserve this contract verbatim.**

### 3.14 Python / NumPy sandbox — **does not exist**

There is no Python sandbox in ASCII Studio. `find . -name "*.py"` outside `references/` returns only a vendored skill script **[V]**. `reference/` (singular) is an empty directory. The only Python is Edward Jones's MIT-licensed `bloom3d.py` and `butterfly.py` under `references/`, which are read material, not a sandbox. Section 9 answers whether to create one.

### 3.15 Unnecessary complexity and limitations

| Issue | Evidence | Severity |
|---|---|---|
| Scene smuggled through `(scene as any)._activeStudioScene` | `StudioEngine.ts:157`, `Exporter.ts:82`, `GeometryAsciiRenderer.ts:595` | Medium — defeats the IRenderer contract; the renderer secretly needs the scene |
| Half the scenes lack `getSampleCloud` | 4/8 **[V]** | High — flagship renderer silently degrades, undocumented |
| `stages` is inert metadata | No engine reads it **[V]** | Low — but it is documented as a feature |
| DialKit dependency does nothing | `App.tsx:2,335` only **[V]** | Low — dead weight, false docs |
| `npm run verify` points at a missing file | `package.json` vs `scripts/` **[V]** | Low |
| Export only works under `vite dev` | `vite.config.ts` middleware | Medium — no production export path |
| Per-frame base64 HTTP | `Exporter.ts:137-148` | Medium — export throughput |
| README claims 4K preset | `ASPECT_RATIOS` has no 4K; `ExportModal.tsx:324` offers 2160×3840 | Low — export honours it, preview does not |
| Three renderers duplicate the same WebGL→downsample→getImageData preamble | `AsciiRenderer`, `DitherRenderer`, `HalftoneRenderer` | Low — ~60 lines, all slated for retirement |

---

## 4. Pixelate — End-to-End Breakdown

### 4.1 Image and video import

`loadMedia(file)` (`imageData.ts:157-200`) branches on MIME. Videos become a hidden, muted, looping, autoplaying `<video>` appended to the document at 1×1px opacity 0 (so `play()` is honoured), awaited on `loadedmetadata`. Images become an `Image` awaited on `onload`. `disposeMedia` revokes blob URLs and detaches the element (:203-217). Accepted: PNG/JPEG/WebP, MP4/WebM/Ogg/MOV.

### 4.2 Rendering architecture

```
AppState → (timeline eval) → renderState → useRenderer → per frame:
  rebuild? → buildCells | ensureProxyField
  video?   → resampleCells (in place, no realloc)
  physics  → stepPhysics (cells) | stepProxyPhysics (proxy grid)
  draw     → render(rc) → applyWarp → applyOutputAdjustments → composite layers
```

`render()` (`renderers/index.ts:29`) is a plain mode→function lookup; all 32 effect modes map to the single `renderEffect`. Cell modes get a pre-sampled `Cell[]`; everything else reads the source directly.

The canvas carries a CSS size and a separate backing-store size (`useRenderer.ts:200-227`), so "render resolution" raises export quality without changing layout. The rAF loop stops itself when nothing is animating (:764-771) — a detail ASCII Studio does not have (it spins unconditionally).

### 4.3 ASCII rendering

`renderAscii` (`renderers/ascii.ts:49-123`). 6 value algorithms including Sobel magnitude and Sobel *angle* bucketed into `| / - \` (:31-47), optional inversion, optional Floyd–Steinberg error diffusion across the value grid (:79-97), animated ramp-index cycling and a per-glyph sine wobble (:117). Colour comes from the shared `colorCssFor`.

In image space this is **better** than ASCII Studio's `ascii_image`: FS dithering, directional edges from real Sobel angles, and 5 shared colour modes vs 6 hardcoded ones.

### 4.4 Halftone, dithering, pixel

- Halftone: `renderHalftone` (`effects.ts:195`) plus a `halftone_cmyk` mode.
- Dithering: `renderDither` (`effects.ts:229`) with 5 styles — `floyd | bayer | ordered | sierra | atkinson`. Error-diffusion kernels, not just ordered matrices. Broader than ASCII Studio's Bayer-only renderer, though ASCII Studio's 6 hardware palettes (`RETRO_PALETTES`) are worth lifting.
- Pixel: `pixelBlocks.ts` / `dots.ts` / `mosaic.ts` — cell-grid modes with gap, roundness, size-from-brightness, jitter and rotation.

### 4.5 Other artistic effects

32 modes behind `renderEffect` (`effects.ts:692`), implemented through a handful of shared helpers: `paintImageData` (per-pixel), `drawBlocky` (per-block), `drawSourceWithFilter` (CSS filter stack), `blitImageData`. Covers painterly (watercolour, oil, pointillism, stippling), print (linocut, risograph, CMYK), camera (thermal with a real heat ramp, infrared, night camera with scanlines + vignette + noise), structural (voronoi, flow field, string art, topographic, stained glass), and databending (pixel sort with per-row segment sorting, glitch).

### 4.6 "Procedural and generative" capabilities — **there are none**

The `Generative` group in `MODE_OPTIONS` is a *stylistic* label. `renderEffect` returns immediately without a source (`effects.ts:693-694`) **[V]**. Voronoi stipple, flow field, string art, topographic — all derive their structure from the imported image's luminance. `makeEffectSourceCanvas` (:424) likewise returns `null` with no source.

This is the hole ASCII Studio fills, and it is the whole case for integration.

### 4.7 Interactive effects

Two interaction systems:

- **Cell modes**: each `Cell` is a spring-damper particle (`ox, oy, x, y, vx, vy`). `stepPhysics` (:235-288) pushes cells along the pointer velocity vector within a radius, springs them home, damps, integrates. Then `applyMouseWarp` (:360-432) does a lens magnification plus horizontal slice-shear inside the cursor circle.
- **Non-cell modes**: a `ProxyField` of up to 2,200 spring points (`ensureProxyField`, :89-114) runs the same physics, and `applyProxyWarp` (:435-522) re-blits the frame cell-by-cell through the displaced grid. This is what makes filters and effects interactive at all.

Plus genuinely stateful simulations: `renderLiquid` (:584-690) is a grid fluid solver with diffusion, projection and semi-Lagrangian advection, holding `liquidState` at module scope across frames.

### 4.8 Animation and keyframes

`lib/timeline.ts` is the strongest piece of system design in either repo. `captureVisualState` strips `timeline` and `layers` and deep-clones the rest. `evaluateKeyframedVisualState` (:110-140) finds the bracketing keyframes and calls `interpolateAny` (:44-78), which recurses the whole `VisualState` tree: numbers lerp, hex colours lerp in RGB space, arrays recurse elementwise, objects recurse by key union, booleans and non-colour strings step at `t = 0.5`.

**Any new parameter on `VisualState` is keyframable with zero extra code.** That is the property that makes the scene-parameter integration in §10 cheap.

### 4.9 Export formats

| Format | Path | Quality |
|---|---|---|
| PNG | `canvas.toBlob` | Solid. Honours render resolution. |
| `.ico` | Hand-built ICONDIR + 6 PNG payloads (`export.ts:37-75`) | Correct and genuinely nice work. |
| SVG | `buildSVG` (:129-212) | Cell modes only; freezes `time = 0`; carries output filters as CSS. Blank for the other 35 modes — documented and expected. |
| React | `buildReactComponent` (:230) | SVG with JSX attribute renaming. |
| **Video** | `startVideoRecording` (:250-276) | **The weak link.** |

Video is `canvas.captureStream(30)` into a `MediaRecorder`. That is a **real-time screen capture of the live canvas**: it drops frames when a mode is slow, its duration drifts, its container depends on browser support (`video/mp4;codecs=avc1` → VP9 → VP8 → webm), and it cannot render above real time. Combined with the wall-clock `time` in `useRenderer.ts:709`, **Pixelate cannot currently produce a deterministic, reproducible video.** For the stated goal — polished exports for TikTok/Reels/Shorts/LinkedIn — this is the most consequential limitation in either codebase.

### 4.10 Performance and GPU

No GPU acceleration anywhere. No WebGL, no WebGPU, no shaders, no OffscreenCanvas, no workers, no WASM. Everything is CPU Canvas2D with typed arrays.

Mitigations that are actually present and sensible: self-stopping rAF (:764-771); in-place `resampleCells` for video (`imageData.ts:135`); the proxy point budget cap at 2,200 (:94); grid rebuild only on the parameters that change grid shape (:846-858); `willReadFrequently` on every `getImageData` context; early-out in `applyOutputAdjustments` when all five values are neutral (:530-536); and bounded warp regions (:494-501).

Costs that remain: `renderEffect` allocates a full-size offscreen canvas and calls `getImageData` **every frame, per effect** (`effects.ts:25-35`) — no reuse. `applyOutputAdjustments` does a full-canvas JS loop whenever `luminance ≠ 1` (:567-583). Layer compositing re-runs `buildCells` per layer per frame for cell-mode layers (`useRenderer.ts:660-671`). **[A]** At 2160p with layers and luminance active this is likely the bottleneck; I did not profile.

### 4.11 Architectural strengths, limitations, unique capabilities

**Strengths**

- One post-processing stack applied uniformly after every mode (`applyOutputAdjustments`). ASCII Studio has nothing equivalent; each renderer reinvents brightness/contrast.
- One colour system (`renderers/color.ts`) shared across all 39 modes.
- Structural keyframe interpolation that generalizes to any new field.
- Layer compositing with arbitrary `GlobalCompositeOperation` blend modes.
- Interaction that works on *every* mode via the proxy field, not just cell modes.
- `RenderContext` is a flat, serializable-ish bag — easy to reuse and test.
- The UI identity: monochrome, `uppercase tracking-[0.18em]` micro-labels, `tabular-nums font-mono` readouts, hairline `border-white/5` dividers, large viewport, 380px inspector.

**Limitations**

- No source but imported media. No generation.
- Wall-clock animation time → no seeking, no determinism, no frame-exact export.
- Real-time `MediaRecorder` video.
- No preset system at all. No save/load/share of a look; nothing in `localStorage` **[V]**. The timeline is the only persistence-shaped feature and it is in-memory.
- `Sidebar.tsx` is 1,111 lines of hardcoded per-mode blocks. Adding a mode means editing a growing `if (state.mode === …)` ladder.
- `effects.ts` is 960 lines with module-level mutable simulation state.
- No 3D, no depth, no normals, no camera.
- No headless/offline render path — nothing like ASCII Studio's `scripts/`.

**Unique capabilities** (nothing in ASCII Studio comes close): per-pixel effect breadth, the fluid solver, keyframes, layers, universal interaction, `.ico` export, the vector SVG/React exports.

---

## 5. Rendering Pipeline Comparison

### 5.1 ASCII Studio — geometry space

```
                  ┌──────────────────────────────┐
 params ─────────►│  IScene.update(frameInfo)    │  pure f(t): no frame-rate dependence
                  │   • Three.js mesh mutation   │
                  │   • analytic surface math    │
                  └──────┬───────────────┬───────┘
                         │               │
          getSampleCloud()│               │ Three.Scene graph
                         ▼               ▼
         ┌───────────────────────┐   ┌──────────────────────────┐
         │ GeometrySampleCloud   │   │ THREE.WebGLRenderer      │
         │ pos/nrm/col/ao/id/    │   │  (rasterizes to GL canvas)│
         │ flying/glow (Float32) │   └──────────┬───────────────┘
         └───────────┬───────────┘              │
                     │                          │ drawImage → downsample
   camera matrices   │                          ▼
   (viewProj, normal)│              ┌────────────────────────────┐
                     ▼              │ cols×rows sample canvas    │
   ┌─────────────────────────────┐  │ getImageData → RGB grid    │
   │ GeometryAsciiRenderer       │  └──────────┬─────────────────┘
   │ 1 project → cell            │             │
   │ 2 Z-TEST per cell  ◄────────┼─ depth      ▼
   │ 3 Lambert+Blinn from normals│   ascii_image | halftone | dither | shaded
   │ 4 depth-gradient edge glyphs│
   │ 5 glyph priority ladder     │   (image-space siblings — same preamble,
   │ 6 2-scale additive bloom    │    different glyph/dot/palette mapping)
   └──────────┬──────────────────┘
              ▼
       2D output canvas ──► TypographyOverlay ──► toDataURL ──► HTTP ──► FFmpeg ──► MP4
                                                                 (deterministic, t = f/fps)
```

### 5.2 Pixelate — image space

```
  File ──► loadMedia ──► MediaSource (HTMLImage | HTMLVideo)
                               │
            ┌──────────────────┴───────────────────┐
            │                                      │
   CELL MODES (4)                          NON-CELL MODES (35)
            │                                      │
   computeGridDims                          readSource / drawSourceContain
   sampleSource → cols×rows                 → full-res ImageData
   Sobel mag + angle                                │
   → Cell[] {rgb, brightness,               ┌───────┴────────┐
      edge, edgeAngle, spring}              │ filters (3)    │ effects (32)
            │                               │ blur/black/    │ paintImageData
   stepPhysics (spring-damper)              │ transparent    │ drawBlocky
            │                               └───────┬────────┘ renderLiquid …
   renderAscii|Pixels|Dots|Mosaic                   │
            │                                       │
            └───────────────┬───────────────────────┘
                            ▼
                 applyMouseWarp | applyProxyWarp      ← pointer physics, EVERY mode
                            ▼
                 applyOutputAdjustments               ← brightness/sat/hue/lum/opacity
                            ▼
                 layer compositing (blend modes)
                            ▼
      ┌─────────┬──────────┬────────────┬──────────────────────┐
     PNG      .ico      SVG/React     MediaRecorder (real-time, wall clock)
                      (cell modes)
            ▲
            │
   timeline.evaluateKeyframedVisualState(t) feeds AppState every frame
```

### 5.3 The distinctions, concretely

| | Image space (Pixelate) | Geometry space (ASCII Studio) |
|---|---|---|
| Input primitive | RGBA pixel | 3D sample {pos, nrm, col, ao, id, flags} |
| Occlusion | None — painter's order | Per-cell Z-buffer |
| Lighting | Baked into the source | Computed per sample from normals |
| Edges | Sobel on luminance | Depth-gradient on the Z-buffer |
| Identity across frames | None | Stable `pid` → stable glyph |
| Can render without media | No | Yes |
| Can render *a photograph* | Yes | No |

The asymmetry is the point: **these are not competing implementations, they are complementary stages.** A Sobel edge on a photo and a depth edge on a surface are genuinely different images, and both are worth having.

### 5.4 Procedural generation vs imported media

ASCII Studio generates: `update(t)` mutates geometry; the renderer is a pure function of that geometry plus camera. Pixelate transforms: everything is a function of a sampled raster. The two meet precisely at the raster. A procedural scene that renders to a canvas *becomes* imported media, and Pixelate's whole catalogue applies to it unchanged.

### 5.5 CPU vs GPU

Both are overwhelmingly CPU. ASCII Studio touches the GPU twice: `ShadedRenderer`'s blit, and the three image-space renderers' WebGL rasterize-then-downsample. The flagship geometry renderer runs entirely on the CPU — a per-sample loop over Float32Arrays. Pixelate is 100% CPU Canvas2D.

**[A]** Neither is GPU-bound today; both are bound by per-pixel/per-sample JS loops and by `getImageData` round trips. A WebGPU rewrite would be the single largest performance lever available, and also the single largest way to delay making artwork. Do not do it now.

### 5.6 Python/NumPy vs TypeScript

The reference `butterfly.py` and the ported `GeometryAsciiRenderer.ts` compute identical results by different means: NumPy does the Z-resolution with `argsort` + `np.unique(return_index=True)` over the whole sample array (butterfly.py:266-271); the TS port does it with a scalar `if (depth <= depthGrid[i]) continue` loop (:335). The NumPy version is vastly more concise and the TS version is more granular and easier to extend with per-cell state (`firstOn`, `settle`, `pid`).

That is the honest trade: **NumPy is better for deriving a formula, TypeScript is better for shipping it interactively.** See §9.

### 5.7 Could they share a common interface?

Yes, and narrowly. `IRenderer.render(scene, camera, glRenderer, params, frameInfo)` (`types.ts:81-91`) is a Three-shaped interface and does **not** generalize to Pixelate's 39 modes, which need `Cell[]`, `MediaSource` and `GridDims`. Forcing Pixelate's renderers into it would be destructive.

The interface that *does* generalize is the one layer down: **`ParameterDefinition[]` as the schema, and "a thing that can produce a drawable raster" as the source.** That is a far smaller commitment than a shared renderer contract, and it is what §10 proposes.

### 5.8 Would ASCII Studio's geometry renderer meaningfully improve Pixelate?

**Yes — it is the single highest-value transfer in this audit.** It gives Pixelate a mode class it structurally cannot otherwise have: occlusion-correct, surface-lit, depth-edged ASCII. Prerequisite: a geometry source must exist, which is the same prerequisite as the whole integration.

**Caveat:** it cannot be applied to photos or video. There is no depth buffer for a JPEG. Any UI that lets you pick it with an image loaded is lying. This is the first of the compatibility boundaries you asked me to establish (§7.2).

### 5.9 Would Pixelate's effects meaningfully improve ASCII Studio?

**Yes, and by a wider margin numerically** — 32 effect modes versus 4 renderers, plus keyframes, layers, universal interaction and a unified post stack. But this comparison is the wrong way round: it argues for *retiring ASCII Studio's application layer*, not for porting Pixelate into it. ASCII Studio's UI would have to grow a mode system, a timeline, a layer stack and a colour system it does not have, to arrive at something Pixelate already is.

---

## 6. Feature and Code Overlap Matrix

### 6.1 Capability matrix

| Capability | ASCII Studio | Pixelate | More mature | More reusable | Verdict |
|---|---|---|---|---|---|
| Procedural 3D scene generation | ✅ 8 scenes | ❌ none | **AS** | AS (`IScene` is clean) | **Transfer to Pixelate** |
| Geometry/depth ASCII | ✅ flagship | ❌ | **AS** | AS (needs cloud + camera) | **Transfer** |
| Image-space ASCII | ✅ basic | ✅ 6 algos + FS dither | **PX** | PX | Keep PX, retire AS |
| Dithering | ✅ Bayer ×2, 6 palettes | ✅ 5 styles incl. Sierra/Atkinson | **PX** | PX | Keep PX, lift AS palettes |
| Halftone | ✅ 3 shapes | ✅ + CMYK | **PX** | PX | Keep PX, retire AS |
| Shaded 3D preview | ✅ ACES + vignette | ❌ | **AS** | AS | Transfer (small) |
| Painterly / print / camera effects | ❌ | ✅ 32 modes | **PX** | PX | Keep PX |
| Fluid / reaction-diffusion sims | ❌ | ✅ real solver | **PX** | PX | Keep PX |
| Colour system | ⚠️ per-renderer, hardcoded | ✅ 5 shared modes + cycling | **PX** | PX | Keep PX |
| Output post-processing | ❌ per-renderer | ✅ unified 5-param stack | **PX** | PX | Keep PX |
| Pointer interaction | ❌ | ✅ cells + proxy field | **PX** | PX | Keep PX |
| Keyframe animation | ❌ | ✅ structural interpolation | **PX** | PX | Keep PX |
| Layers + blend modes | ❌ | ✅ | **PX** | PX | Keep PX |
| Multi-stage choreography | ⚠️ hand-coded + inert metadata | ❌ | AS (weakly) | neither | **Rebuild on PX timeline** |
| Deterministic clock | ✅ `t = f/fps` | ❌ wall clock | **AS** | AS | **Transfer — critical** |
| Camera system | ✅ spherical orbit | ❌ | **AS** | AS | Transfer |
| Typography overlay + safe areas | ✅ | ❌ | **AS** | AS | Transfer |
| Parameter schema | ✅ `ParameterDefinition` | ❌ hardcoded JSX | **AS** | AS | **Transfer — see §10.4** |
| Parameter randomizer w/ locks | ✅ | ❌ | **AS** | AS | Transfer |
| Preset save/load | ✅ localStorage | ❌ none | **AS** | AS | Transfer (reshaped) |
| Video export | ✅ deterministic + FFmpeg | ⚠️ real-time MediaRecorder | **AS** | AS | **Transfer — critical** |
| PNG export | ✅ | ✅ + render resolution | tie | PX | Keep PX |
| SVG / React export | ❌ | ✅ | **PX** | PX | Keep PX |
| `.ico` export | ❌ | ✅ | **PX** | PX | Keep PX |
| Export history/manifest | ✅ | ❌ | **AS** | AS | Transfer |
| Headless verification scripts | ✅ 7 scripts | ❌ | **AS** | AS (pattern) | **Transfer the pattern** |
| Agent scene-authoring contract | ✅ AGENTS.md + skill | ⚠️ CLAUDE.md only | **AS** | AS | Transfer |
| GPU acceleration | ⚠️ incidental WebGL | ❌ | neither | — | Out of scope |
| Landing page / product surface | ❌ | ✅ | **PX** | PX | Keep PX |
| UI visual identity | ⚠️ inline-styled dark blue | ✅ monochrome technical | **PX** | PX | **Keep PX** |

Score: ASCII Studio leads on 11, Pixelate leads on 15. But the 11 are *structural capabilities Pixelate cannot grow on its own*, and the 15 are *breadth Pixelate already has*. This is exactly the shape that favours absorbing the former into the latter.

### 6.2 Actual code duplication — file, function, verdict

| Concern | ASCII Studio | Pixelate | Lines | Real duplication? |
|---|---|---|---|---|
| Character ramps | `AsciiRenderer.ts:4-13` (`ASCII_CHAR_SETS`, 8 sets) **and** `GeometryAsciiRenderer.ts:444-448` (inline, 5 ramps — duplicated *within* ASCII Studio) | `lib/charsets.ts` (6 presets) | ~40 | **Yes.** Three copies across two repos. Consolidate to one data module. |
| Rec.601/709 luminance | `AsciiRenderer.ts:300` (0.2126/0.7152/0.0722) | `imageData.ts:75`, `effects.ts:11`, `useRenderer.ts:575` (0.299/0.587/0.114) | ~8 | **Yes**, and the two repos use *different standards* — a real inconsistency, not just duplication. |
| Hex ↔ RGB | `AsciiRenderer.ts:279-282`, `PresetManager.ts:80-89` (hslToHex) | `lib/color.ts`, `lib/timeline.ts:21-39` (own copies) | ~50 | **Yes.** Four copies. |
| Bayer matrices | `DitherRenderer.ts:4-9` (4×4) + inline 2×2 (:238) | `effects.ts:229` `renderDither` | ~20 | **Yes**, but both are slated to converge on Pixelate's implementation. |
| Floyd–Steinberg | — | `ascii.ts:79-97` **and** `effects.ts:229` | ~20 | **Yes, within Pixelate.** Two FS implementations. |
| WebGL → downsample → getImageData preamble | `AsciiRenderer.ts:220-241`, `DitherRenderer`, `HalftoneRenderer` | — | ~60 | **Yes, within ASCII Studio.** Moot — all three retire. |
| Spherical→Cartesian camera | `Camera.ts:52-58` | — | — | No |
| Z-buffer / normals / depth edges | `GeometryAsciiRenderer.ts` | — | — | No |
| Spring-damper physics | — | `useRenderer.ts:235-357` (cell + proxy — **near-identical twice**) | ~120 | **Yes, within Pixelate.** The two step functions differ mainly in the bounding-box early-out. |
| Cell→glyph mapping | `GeometryAsciiRenderer.ts:481-504` (priority ladder) | `ascii.ts:99-122` (ramp index) | — | **No.** Superficially similar, algorithmically unrelated. |
| Parameter → widget rendering | `ControlPanel.tsx:109-195` (schema-driven, generic) | `Sidebar.tsx:505-920` (hardcoded per mode) | — | **No** — opposite approaches. This is the gap, not the duplication. |

**Conclusion.** Genuine cross-repo duplication is roughly **120–150 lines of small utilities**. The more interesting finding is that *each repo duplicates things inside itself*: ASCII Studio has three char-ramp definitions and three copies of the WebGL preamble; Pixelate has two Floyd–Steinberg implementations and two near-identical physics integrators. **The superficial overlap in feature names (both "do ASCII", both "do dithering") hides almost no shared architecture.**

---

## 7. Integration Options

Common assumptions: solo developer; the objective is artwork throughput, not infrastructure; Pixelate is deployed and public (`pixelate-seven.vercel.app`), ASCII Studio is local-only.

### Option A — Independent Applications

Keep both. Add attribution to the port; fix the broken `verify` script; document the 4 degraded scenes.

| Dimension | Assessment |
|---|---|
| Development effort | **Zero.** Only correctness fixes. |
| Architectural complexity | Lowest. Two small, coherent apps. |
| Maintainability | Deceptively poor — two dependency trees (React 18 vs 19, Next vs Vite), two UIs, two build systems, two mental models. |
| Performance | Unchanged. Both acceptable for their current scope. |
| User experience | **Worst outcome.** Procedural work and media work never meet. To stylize a scene with Pixelate you export an MP4 from one app and import it into the other — a lossy, manual, slow round-trip that destroys the live-tuning loop you asked for. |
| Creative flexibility | Capped. Depth ASCII never reaches photos (fine — it can't anyway); Pixelate's 32 effects never reach procedural geometry (**not** fine — they could). |
| Extensibility | Each extends independently; neither compounds. |
| Agent compatibility | Mixed. ASCII Studio's scene contract is excellent for agents. Pixelate's 1,111-line Sidebar is hostile — adding a mode means hand-editing a conditional ladder. |
| Preservation | Perfect. Nothing at risk. |
| Technical debt | Accumulates in both; the dead DialKit dep, inert `stages`, missing verify script and absent attribution all persist. |
| Scalability | Poor. Shared utilities drift further apart (already two luminance standards). |

**Verdict: reject.** It is the only option that forecloses the stated objective.

### Option B — Shared Rendering Library

Extract `@gelo/creative-core`: parameter schema, clock, colour, charsets, dither kernels, export utilities. Both apps consume it.

| Dimension | Assessment |
|---|---|
| Development effort | **Medium–high, disproportionate.** Package setup, build config, two consumers, version bumps, local linking — to share ~150 lines of genuinely duplicated code. |
| Architectural complexity | Increases. Three repos, a publish step, a cross-repo refactor loop. |
| Maintainability | Worse in practice at this scale. Every shared-code change becomes a three-repo dance. |
| Performance | Neutral. |
| User experience | **Unchanged — still two apps.** The round-trip problem remains. This is the option's fatal flaw: it addresses duplication, which is not the problem. |
| Creative flexibility | Unchanged. |
| Extensibility | Good *if* you ever had a third consumer. You do not. |
| Agent compatibility | Worse — agents must reason across three repos. |
| Preservation | Good. |
| Technical debt | Trades code debt for packaging debt. |
| Scalability | Good at 3+ apps. You have 2, becoming 1. |

**Verdict: reject.** Correct engineering instinct, wrong problem. The duplication (§6.2) is too small to justify the boundary, and this option does nothing for the workflow.

### Option C — ASCII Studio as a Pixelate Module *(recommended)*

Procedural scenes become a **source type** alongside image and video. The geometry ASCII renderer becomes a mode, gated to geometry sources. The deterministic clock and FFmpeg export replace `MediaRecorder`. ASCII Studio's application layer is retired; its repo persists as a scratchpad.

| Dimension | Assessment |
|---|---|
| Development effort | **Medium, and front-loaded with a cheap high-value phase.** The seam is `MediaSource` + two call sites (§1, finding 3). Phase 1 alone — scenes as a source feeding all 39 existing modes — is genuinely small. |
| Architectural complexity | Moderate increase in Pixelate, contained: `lib/sources/`, `engine/`, `renderers/geometryAscii.ts`. One new concept in the UI (Source type), not a new application. |
| Maintainability | **Best.** One repo, one build, one dependency tree, one UI, one deployment. |
| Performance | Mixed and manageable. Three.js adds bundle weight — mitigable by dynamic-importing the engine only when a procedural source is selected **[P]**. Scene `update` + cloud generation per frame is real CPU work; the existing self-stopping rAF and resolution control already give you the knobs. |
| User experience | **Best, and it preserves your identity.** Same viewport, same inspector, same monochrome language. Procedural geometry appears where "Replace media" lives today. No second app to learn or switch to. |
| Creative flexibility | **Highest.** 39 image-space modes × N procedural scenes, plus depth ASCII on geometry, plus keyframes and layers across both. A procedural butterfly rendered through `pixel_sort`, or composited as a layer over a photo, becomes trivially available — neither app can do that today. |
| Extensibility | **Strong.** New scene = one file + one registry line, inheriting modes, timeline, layers, export, interaction. New mode = unchanged from today. |
| Agent compatibility | **Strongest.** Port `AGENTS.md` + `create-scene` skill + the headless verify scripts into Pixelate, and agent-authored scenes land directly in the production tool with visual verification. This is the capability you actually want. |
| Preservation | **Good, with discipline.** Risk concentrates in `useRenderer.ts` and `app/app/page.tsx`. Mitigated by making the source type purely additive and keeping media the default (§11). |
| Technical debt | Net reduction: retires the DialKit dep, 4 redundant renderers, a whole React shell, three char-ramp copies, three WebGL preambles. Adds: Three.js, a source abstraction, a server export route. |
| Scalability | **Good.** Clear axes — add sources, add modes, add scenes — with defined compatibility rules (§7.2). |

### Option D — Unified Creative Application (greenfield)

Design a new app from both codebases' strongest parts.

| Dimension | Assessment |
|---|---|
| Development effort | **Highest by a wide margin.** Rebuilding 39 modes, a timeline, layers, physics, 8 scenes, 5 export paths and a landing page. Months. |
| Architectural complexity | Highest up front; potentially cleanest at the end. |
| Maintainability | Good *eventually*. Irrelevant if it never ships. |
| Performance | Opportunity to design for GPU from the start — the only option that really opens that door. |
| User experience | Could be the best; could also lose the identity you explicitly want preserved. |
| Creative flexibility | Highest in theory. |
| Extensibility | Highest in theory. |
| Agent compatibility | Good if designed for it. |
| Preservation | **Worst.** Every working feature is re-implementation risk. Pixelate is deployed and working; this puts all of it in flight at once. |
| Technical debt | Starts at zero, pays for it with a long period of producing no artwork. |
| Scalability | Best in theory. |

**Verdict: reject now.** This is the classic second-system trap. Option C reaches ~85% of D's creative capability by *moving four modules*, and leaves the door open: if Pixelate's architecture strains under procedural sources in a year, you will then have real evidence about what D should be, instead of guessing.

### 7.1 Why C over the others, in one line each

- **Not A**, because the round-trip between apps is exactly the friction that stops artwork getting made.
- **Not B**, because it solves duplication (~150 lines) and ignores the workflow (the actual problem).
- **Not D**, because it risks everything that currently works for a benefit C mostly delivers.
- **C**, because the integration seam is a single type union and the two systems are complementary rather than competing.

### 7.2 Compatibility boundaries — **not every mode works on every source**

You asked me to establish these rather than assume universality. Based on what each renderer actually reads:

| Mode class | Image | Video | Procedural geometry | Why |
|---|---|---|---|---|
| Cell modes (ascii, pixels, dots, mosaic) | ✅ | ✅ | ✅ | They read a sampled raster; a scene-rendered canvas is a raster. |
| Direct-source filters (blurred, black, transparent) | ✅ | ✅ | ✅ | `drawSourceContain` accepts any `CanvasImageSource`. |
| 32 effect modes | ✅ | ✅ | ✅ | All go through `readSource` → `ImageData`. |
| **Geometry ASCII** | ❌ | ❌ | ✅ | Requires `GeometrySampleCloud` + camera matrices. No depth exists for a photo. |
| **Shaded 3D** | ❌ | ❌ | ✅ | Requires a Three scene graph. |
| SVG / React export | cell modes only | cell modes only | cell modes only | Already true today; unchanged. |
| Pointer physics | ✅ | ✅ | ✅ | Operates on cells or the proxy field, both source-agnostic. |
| Keyframes | ✅ | ✅ | ✅ *plus scene params* | `interpolateAny` recurses any added `VisualState` field. |
| Camera controls | n/a | n/a | ✅ only | Meaningless without geometry. |
| Deterministic export | ⚠️ images yes; video sources need frame-accurate `currentTime` seeking **[A]** | ⚠️ | ✅ | Scenes are pure `f(t)`; a `<video>` is not trivially seekable frame-exact. |

**UI rule [P]:** the mode list filters, or visibly disables with a reason, on the active source type. Geometry ASCII and Shaded should not be selectable with a photo loaded. This is a small addition to `MODE_OPTIONS` (a `sources: SourceKind[]` field) and one filter in the Sidebar — it does not change the visual language.

---

## 8. Product and Creative Workflow Strategy

Measuring each option against your nine stated wants:

| Want | Today in AS | Today in PX | After Option C |
|---|---|---|---|
| Generate procedural animations with agents | ✅ good contract, weak app | ❌ | ✅ same contract, production app |
| Mathematically intricate organic forms | ✅ (4 strong scenes) | ❌ | ✅ |
| Import photos and video | ❌ | ✅ | ✅ |
| Transform footage into ASCII and other styles | ⚠️ not from footage | ✅ 39 modes | ✅ |
| Experiment with colour, type, lighting, motion | ⚠️ partial, siloed | ⚠️ no lighting/type | ✅ all four in one surface |
| Adjust parameters live | ✅ | ✅ | ✅ |
| Create and preserve reusable algorithms | ✅ scene registry | ⚠️ modes only | ✅ scenes + modes |
| Save artistic presets | ✅ localStorage | ❌ **none** | ✅ (gap to close — §10.5) |
| Export polished social video | ✅ deterministic + FFmpeg | ⚠️ real-time capture | ✅ |

Two things stand out.

**First, the preset gap is larger than it looks.** Pixelate has no way to save a look at all. For your workflow — experiment, find something good, keep it, come back to it — that is a bigger day-to-day cost than anything in the rendering pipeline. ASCII Studio's `Preset` shape plus Pixelate's `captureVisualState` give you this almost for free.

**Second, on "comparable or greater sophistication to Edward Jones":** you are already at rasterizer parity, because `GeometryAsciiRenderer` *is* that rasterizer in TypeScript (§1, finding 2). What distinguishes his work is not the renderer, it is the **scene authorship** — the wing curve keys, the stage timing, the choreography of the text layer. Those are hand-crafted per piece. So the lever for better artwork is **more and better scenes**, which is precisely what the agent workflow is for, and it argues for the simplest possible path from "agent writes a scene file" to "I see it in the tool I already use."

The honest risk to name: **you have eight scenes, four of which render poorly in the flagship renderer, and zero original artwork published from this pipeline.** The infrastructure is ahead of the output. Any plan that spends two months on architecture before producing a piece is the wrong plan. Phase 1 of §11 is deliberately shaped to produce artwork in the first week.

### 8.1 On multiple input sources

A single `SourceKind` union is justified for: **image, video, procedural scene.** Those three are real, present (two) or nearly-present (one) capabilities.

**Imported 3D assets (GLTF/OBJ) — [P], and I would defer it.** It is technically easy: `GeometryAsciiRenderer`'s mesh-vertex fallback (:604-667) already consumes an arbitrary Three scene graph. But it is exactly the "possible therefore build it" trap you warned against. Imported models have no `getSampleCloud`, so they would land on the degraded path and look worse than your procedural scenes. Revisit only when a specific piece needs a model you cannot write.

**Mathematical simulations** are not a separate source — they are scenes. `reaction_diffusion` and `liquid` already exist as *effect modes* seeded by media; a procedural variant seeded by nothing is just a scene whose `update()` steps a solver. Do not add a fourth source kind for it.

---

## 9. Python / NumPy Experimentation Sandbox

**Current state [V]:** no sandbox exists. No Python in ASCII Studio outside the vendored MIT reference. `reference/` is an empty directory. `requirements.txt` belongs to Edward Jones's code, not yours.

**Assessment: create a minimal one — but as a *derivation* tool, explicitly not a second renderer.**

The argument for it is concrete and visible in this very repository. `butterfly.py:241-289` expresses the entire rasterizer — Z-resolution, lighting, edge classification — in about 45 lines of vectorized NumPy. The TypeScript equivalent is ~200 lines of scalar loops. When you are *deriving* a surface formula, computing normals, or tuning a lighting curve, that density is a real iteration-speed advantage, and `matplotlib`/`pygame` gives you an instant visual check without a browser, a build, or a React remount.

The argument against a *full* Python engine is decisive: a second production renderer means every scene exists twice, drifts, and must be verified twice. `AGENTS.md`'s own decoupling rule exists to prevent exactly that kind of split.

**Recommendation [P]:**

```
ascii-studio/sandbox/                 (or pixelate/sandbox/ post-migration)
├── README.md                 Scope: derivation only. Never a render target.
├── requirements.txt          numpy, matplotlib, pillow  (pygame optional)
├── surfaces/                 One .py per surface being derived.
│   └── <name>.py             Emits: a matplotlib/pygame preview AND
│                             a .npz of {positions, normals, colors} for eyeballing.
└── port-notes/<name>.md      The formula, the constants, and the TS port decisions.
```

Rules that keep it from metastasizing:

1. Python never renders a deliverable. No MP4, no PNG for publication.
2. Nothing in the TypeScript app imports from or shells out to `sandbox/`. **Zero runtime dependency** — this is the non-negotiable one.
3. The transfer artefact is a **formula written down in `port-notes/`**, hand-ported to TypeScript. Not a code generator, not a transpiler, not a JSON mesh dump — those all become coupling.
4. A sandbox file is disposable. If it has not been opened in six months, delete it.

**Honest counterpoint:** you may not need this. You derived four good scenes without it, and `scripts/test-camera-render.ts` + `@napi-rs/canvas` already gives you a headless TypeScript render-to-PNG loop that is nearly as fast to iterate. **[A]** My suggestion: do not build the sandbox as part of the migration. Build it the first time you hit a surface whose math you cannot get right in TypeScript within an hour. If that never happens, you have saved the effort.

---

## 10. Recommended Future Architecture

### 10.1 Shape

**One application: Pixelate.** Three source kinds feeding one render pipeline, one timeline, one export path.

```
                        ┌──────────────────────────────────────┐
                        │            SOURCE LAYER              │
                        │  image  │  video  │  procedural scene│
                        └────┬────────┬───────────┬────────────┘
                             │        │           │
                             │        │     StudioEngine.renderToCanvas(t)
                             │        │           │  + GeometrySampleCloud
                             │        │           │  + camera matrices
                             ▼        ▼           ▼
                        ┌──────────────────────────────────────┐
                        │  ResolvedSource                      │
                        │   raster : CanvasImageSource   ◄─ all │
                        │   cloud? : GeometrySampleCloud ◄─ geo │
                        │   camera?: PerspectiveCamera   ◄─ geo │
                        └────┬─────────────────────────┬───────┘
                             │                         │
        ┌────────────────────┴───────┐     ┌───────────┴─────────────┐
        │  IMAGE-SPACE MODES (39)    │     │ GEOMETRY-SPACE MODES (2)│
        │  cells · filters · effects │     │ geometry_ascii · shaded │
        │  (unchanged)               │     │ (ported from AS)        │
        └────────────────┬───────────┘     └───────────┬─────────────┘
                         └───────────┬─────────────────┘
                                     ▼
                     pointer warp → output adjustments → layers
                                     ▼
                    ┌────────────────┴─────────────────┐
                    │  PNG · ICO · SVG · React         │
                    │  VIDEO: deterministic t = f/fps  │
                    │         → frames → FFmpeg → MP4  │
                    └──────────────────────────────────┘
                                     ▲
                    timeline.evaluateKeyframedVisualState(t)
                    now also interpolating scene params + camera
```

### 10.2 Proposed file tree (Pixelate after migration)

New and changed files marked. Everything unmarked is untouched.

```
pixelate/
├── AGENTS.md                            ★ NEW — ported scene contract (from ascii-studio)
├── CLAUDE.md                              updated: source kinds, engine boundary
├── .claude/skills/create-scene/SKILL.md ★ NEW — ported authoring skill
│
├── engine/                              ★ NEW — zero-React, zero-Next core (from src/engine)
│   ├── types.ts                           IScene, GeometrySampleCloud, SceneContext, FrameInfo,
│   │                                       ParameterDefinition  ← ported verbatim
│   ├── Clock.ts                           AnimationClock  ← ported verbatim
│   ├── Camera.ts                          StudioCameraController  ← ported verbatim
│   ├── SceneRegistry.ts                   id → factory
│   ├── SceneHost.ts                     ★ REPLACES StudioEngine — no rAF loop, no preview
│   │                                       canvas, no renderer registry. Pure:
│   │                                       renderToCanvas(t) and getSampleCloud(t).
│   │                                       Removes the `_activeStudioScene` back-channel by
│   │                                       passing the cloud explicitly.
│   ├── scenes/                            ← 8 ported scenes (4 need getSampleCloud added)
│   │   ├── ButterflyScene.ts   ✓ cloud
│   │   ├── BloomingFlowerScene.ts ✓
│   │   ├── CreationScene.ts    ✓
│   │   ├── GalaxySupernovaScene.ts ✓
│   │   ├── JellyfishScene.ts   ⚠ needs cloud
│   │   ├── BlackHoleScene.ts   ⚠ needs cloud
│   │   ├── OceanWavesScene.ts  ⚠ needs cloud
│   │   └── MorphingAbstractScene.ts ⚠ needs cloud
│   └── overlays/TypographyOverlay.ts      ← ported (title/subtitle/watermark/safe areas)
│
├── lib/
│   ├── types.ts                         ✎ CHANGED — SourceKind, ProceduralSource,
│   │                                       ResolvedSource; MediaSource widened.
│   │                                       VisualState gains `scene` + `camera`.
│   ├── sources/                         ★ NEW
│   │   ├── index.ts                       resolveSource(descriptor, t) → ResolvedSource
│   │   ├── mediaSource.ts                 image/video (moved from imageData.ts)
│   │   └── proceduralSource.ts            wraps SceneHost; renders to an offscreen canvas,
│   │                                       exposes {raster, cloud, camera, width, height}
│   ├── params/                          ★ NEW
│   │   ├── schema.ts                      ParameterDefinition (shared with engine)
│   │   └── randomize.ts                   ← ported from PresetManager (locks + HSL harmony)
│   ├── presets.ts                       ★ NEW — save/load a full AppState snapshot
│   ├── charsets.ts                      ✎ CHANGED — single source of truth; absorbs
│   │                                       ASCII_CHAR_SETS and the geometry ramps
│   ├── color.ts                         ✎ CHANGED — absorbs the 4 hex↔RGB copies;
│   │                                       one documented luminance standard
│   ├── imageData.ts                     ✎ CHANGED — sampleSource accepts CanvasImageSource
│   ├── modes.ts                         ✎ CHANGED — ModeOption gains `sources: SourceKind[]`
│   ├── timeline.ts                        unchanged — gains scene/camera keyframing for free
│   ├── defaults.ts                      ✎ CHANGED — scene/camera defaults
│   └── export.ts                        ✎ CHANGED — MediaRecorder demoted to "quick capture";
│                                           deterministic path added
│
├── lib/export/                          ★ NEW
│   ├── deterministic.ts                   frame loop at t = f/fps; posts frames
│   └── types.ts                           ExportProgress (← ported)
│
├── app/api/export/[action]/route.ts     ★ NEW — Next route handler replacing the Vite
│                                           middleware: start / frame / finish / cancel.
│                                           spawn('ffmpeg', [...]) with array args.
│                                           Local-dev only; guarded in production.
│
├── renderers/
│   ├── types.ts                         ✎ CHANGED — RenderContext.source becomes
│   │                                       ResolvedSource (raster + optional cloud/camera)
│   ├── geometryAscii.ts                 ★ NEW — ported GeometryAsciiRenderer, reshaped to
│   │                                       (rc) => void and reading rc.source.cloud
│   ├── shaded.ts                        ★ NEW — ported ShadedRenderer (raw 3D preview)
│   ├── index.ts                         ✎ CHANGED — registers the two geometry modes
│   ├── ascii.ts, effects.ts, color.ts, …  unchanged
│   └── (effects.ts split is a separate, optional refactor — §11 Phase 5)
│
├── hooks/useRenderer.ts                 ✎ CHANGED — the riskiest file. Changes:
│                                           · time becomes clock-driven, not wall-clock
│                                           · rebuild() resolves the source each frame when
│                                             the source is procedural
│                                           · geometry modes bypass buildCells
│
├── components/
│   ├── Sidebar.tsx                      ✎ CHANGED — adds a Source section, a Scene section
│   │                                       (schema-driven, §10.4) and a Camera section.
│   │                                       Mode list filtered by source kind.
│   ├── controls/
│   │   ├── ParamControl.tsx             ★ NEW — renders one ParameterDefinition using the
│   │   │                                   EXISTING SliderInput / ColorInput / Select /
│   │   │                                   Toggle / TextInput. Zero new visual language.
│   │   └── (existing primitives unchanged)
│   ├── SourcePicker.tsx                 ★ NEW — image | video | scene
│   └── Canvas.tsx, UploadZone.tsx, ExportModal.tsx, LandingPage.tsx   unchanged
│
├── scripts/                             ★ NEW — ported headless verification
│   ├── verify-scenes.ts                   every scene × compatible mode → PNG
│   └── verify-export.ts                   full 1080×1920 export + ffprobe assertion
│
└── app/globals.css                        unchanged — identity preserved
```

### 10.3 Component responsibilities

| Component | Owns | Does **not** own |
|---|---|---|
| `engine/` | Scene math, geometry, Three graph, clock, camera. Pure TS, zero React/Next. | Canvas sizing, modes, UI, export transport. |
| `engine/SceneHost` | `renderToCanvas(t)`, `getSampleCloud(t)`. Stateless w.r.t. playback. | The rAF loop (Pixelate's `useRenderer` keeps it). |
| `lib/sources/` | Turning a descriptor + time into a `ResolvedSource`. | Rendering. |
| `renderers/` | Pixels. One function per mode. | Scheduling, source acquisition. |
| `hooks/useRenderer` | Scheduling, sizing, physics, warp, post, layers. | Mode internals, scene math. |
| `lib/timeline` | Interpolating `VisualState` across keyframes. | Playback; what the fields mean. |
| `lib/export/` | Deterministic frame production. | Encoding (the route handler does that). |
| `components/` | The visual language and the controls. | Any rendering logic. |

### 10.4 Parameter schema and the DialKit question — answered

You asked whether Pixelate's controls could unify with DialKit or a shared schema without losing its identity.

**DialKit: no, and there is nothing to migrate from.** It is an unused dependency in ASCII Studio (§3.9) **[V]**. Adopting it would mean importing a third-party control aesthetic into a UI whose aesthetic is the point. **Drop the dependency.**

**A shared parameter schema: yes, and it is the right move — but applied selectively.**

The split that preserves your identity:

- **Keep `Sidebar.tsx`'s hand-written blocks for the 39 existing modes.** They are tuned, they read well, and rewriting them schema-first is a pure-risk refactor with no artistic payoff. Do not touch them.
- **Use `ParameterDefinition[]` only for scene parameters**, where it is load-bearing: a scene declares `paramDefs`, and the Scene section renders them generically. That is what lets an agent add a scene with 20 parameters and get a full control panel from one file — the exact capability you want.
- **Render those definitions through Pixelate's existing primitives.** A new `ParamControl.tsx` maps `type` → component:

  | `ParameterDefinition.type` | Existing Pixelate component |
  |---|---|
  | `number` | `SliderInput` (slider + `tabular-nums` numeric field) |
  | `color` | `ColorInput` |
  | `select` | `Select` |
  | `boolean` | `Toggle` |
  | `string` | `TextInput` |
  | grouping by `category` | `Section` |

  Every primitive already exists (`components/controls/`, 281 LOC) **[V]**. The schema supplies `name`, `min`, `max`, `step`, `unit`, `options` — exactly the props those components take. **The visual identity is not merely preserved, it is literally the same components.**

- **The schema then unlocks three things for free:** parameter randomization with per-key locking (port `PresetManager.randomizeParams`), keyframing (scene params live on `VisualState`, so `interpolateAny` handles them), and preset serialization.

### 10.5 Modules: preserve / consolidate / refactor / retire

**Preserve untouched (Pixelate):** `renderers/` (all 39 modes), `lib/timeline.ts`, `lib/color.ts`'s colour-mode system, `components/controls/*`, `app/globals.css`, `LandingPage.tsx`, `lib/export.ts`'s PNG/ICO/SVG/React paths.

**Preserve and port (ASCII Studio):** `engine/types.ts`, `Clock.ts`, `Camera.ts`, `SceneRegistry.ts`, all 8 scenes, `GeometryAsciiRenderer.ts`, `ShadedRenderer.ts`, `TypographyOverlay.ts`, `AGENTS.md`, `skills/create-scene`, `scripts/verify-*.ts`.

**Consolidate:**
- 3 charset definitions → `lib/charsets.ts`.
- 4 hex↔RGB copies → `lib/color.ts`.
- 2 luminance standards → one, documented. (Pick Rec.601 — Pixelate uses it in three places and it is the perceptually warmer choice for ASCII ramps. **[A]** Changing it will shift existing output slightly; do it deliberately, not accidentally.)
- 2 Floyd–Steinberg implementations → one.
- ASCII Studio's `RETRO_PALETTES` → Pixelate's dither mode as data.

**Refactor:**
- `StudioEngine` → `SceneHost`, dropping the rAF loop and the `_activeStudioScene` back-channel (pass the cloud as a return value).
- `Exporter`'s per-frame base64 HTTP → a blob/multipart transport **[P]**.
- `useRenderer`'s two near-identical physics integrators → one parameterized function (optional, low priority).
- `effects.ts` (960 lines) → `renderers/effects/` by family (optional, Phase 5).

**Retire:**
- ASCII Studio's `src/ui/*`, `src/App.tsx`, `src/main.tsx`, `index.html` (1,775 LOC).
- `AsciiRenderer.ts`, `DitherRenderer.ts`, `HalftoneRenderer.ts` (882 LOC) — Pixelate's equivalents are better.
- `PresetManager`'s localStorage layer (keep the randomizer).
- The `dialkit`, `lucide-react` and `motion` dependencies.
- The empty `reference/` and `public/` directories.
- The broken `"verify"` npm script.

### 10.6 Migration dependency order

```
engine/types.ts + Clock + Camera          (no dependencies — do first)
        ↓
lib/sources/ + widened MediaSource         (unlocks everything downstream)
        ↓
┌───────┴────────────┬──────────────────────┐
scenes ported    geometry renderer     deterministic export
        └────────────┴──────────────────────┘
        ↓
Sidebar: Source + Scene (schema) + Camera sections
        ↓
timeline keyframing of scene params  →  presets  →  utility consolidation
```

### 10.7 Risks and trade-offs

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `useRenderer.ts` regression — 886 lines, five jobs, load-bearing | **High** | **High** | Make the source type purely additive; media stays the default path; keep the wall-clock branch until deterministic playback is proven. Visual-regression PNGs before/after via the ported verify scripts. |
| Three.js bundle weight on a deployed Next app | High | Medium | Dynamic-import `engine/` only when a procedural source is selected; scenes code-split per scene **[P]**. |
| Procedural frame cost (scene update + cloud + projection) kills interactivity | Medium | High | Already have the levers: render resolution control, self-stopping rAF. Add a preview-quality cloud density parameter **[P]**. Measure before optimizing. |
| 4 scenes look bad in geometry ASCII | **Certain (already true)** | Medium | Ship Phase 1 with the 4 good scenes only; add clouds to the rest in Phase 4, or drop them. |
| FFmpeg export cannot run on Vercel | **Certain** | Medium | Scope it to local dev explicitly. Keep `MediaRecorder` as the deployed "quick capture". Document the split. Do not try to make serverless FFmpeg work. |
| Luminance-standard unification shifts existing output | Medium | Low | Do it in its own commit with before/after PNGs. |
| Scope creep — "while we're in here" | **High** | **High** | Phase boundaries are hard. §11 acceptance criteria are the gate. |
| The migration consumes the time that was meant for artwork | **High** | **High** | Phase 1 is shaped to produce a finished piece in week one. If Phase 1 does not, stop and reassess. |
| Attribution omission in a public repo | Current | Medium–legal | Fix immediately — it is a 5-minute change and it is Phase 0. |

---

## 11. Phased Migration Roadmap

Ordered by your stated priorities: preserve working functionality, improve output, remove duplication, build reusable primitives, improve the agent workflow, keep export reliable, avoid complexity.

Every phase is independently revertable: each lands on its own branch and touches a disjoint-ish file set.

### Phase 0 — Corrections (no integration) · ~1 hour · **do regardless of direction**

| Task | File |
|---|---|
| Attribute the Edward Jones port | `GeometryAsciiRenderer.ts` header comment + `README.md` + `AGENTS.md` |
| Fix or remove the broken verify script | `package.json` |
| Document the 4 scenes lacking `getSampleCloud` | `AGENTS.md` |
| Remove the `dialkit` dependency and `<DialRoot />` | `package.json`, `App.tsx` |
| Correct the README's DialKit and 4K claims | `README.md` |
| Delete empty `reference/`, `public/` | — |

**Acceptance:** `npx tsc --noEmit` passes (it does today **[V]**); `npm run dev` still boots; the studio renders.
**Rollback:** trivial, documentation-only.

### Phase 1 — Procedural source into Pixelate · ~2–4 days · **the high-value phase**

The smallest change that produces new artwork. **No geometry renderer yet.**

1. Port `engine/types.ts`, `Clock.ts`, `Camera.ts`, `SceneRegistry.ts`, and **4 scenes only** (butterfly, flower, creation, galaxy — the ones with sample clouds).
2. Write `engine/SceneHost.ts`: `renderToCanvas(canvas, t)` using Three's WebGL renderer offscreen.
3. Write `lib/sources/proceduralSource.ts` exposing `{ raster: HTMLCanvasElement, width, height }`.
4. Widen `MediaSource`; make `mediaSize()` handle a canvas (`lib/types.ts:214`).
5. Add a Source section to `Sidebar.tsx` with a scene picker. **No scene parameters yet** — defaults only.
6. In `useRenderer`, re-render the procedural source each frame before `rebuild`/`readSource`.

**Acceptance criteria**
- All 39 existing modes render a procedural scene.
- Image and video behaviour is **bit-identical** to today (verify with before/after PNG diffs on 5 modes).
- Keyframes, layers, pointer physics and PNG export all work on a procedural source.
- **You export one finished piece** — a procedural scene through a Pixelate effect — that neither app could make before.

**Rollback:** revert the branch. All changes are additive except the `MediaSource` widening and the `useRenderer` hook, both small and isolated.

> If Phase 1 does not produce a piece you want to post, **stop and reassess the whole plan.** That is the real test of this recommendation.

### Phase 2 — Scene parameters and the schema bridge · ~2–3 days

1. `components/controls/ParamControl.tsx` mapping `ParameterDefinition.type` → existing primitives (§10.4).
2. Add `scene: { id, params }` to `VisualState`; render `paramDefs` in a Scene section grouped by `category`.
3. Add `camera: CameraParams` to `VisualState` + a Camera section (7 sliders/toggles).
4. Port `randomizeParams` with per-key locking.

**Acceptance**
- Scene parameters tune live.
- They keyframe and interpolate with **no change to `timeline.ts`** (this is the test of §4.8's claim).
- The Scene section is visually indistinguishable in style from the existing sections — same `Section`, same `SliderInput`, same type scale.
- Randomize-with-locks works.

**Rollback:** additive; `VisualState` field additions are backward-compatible with `interpolateAny`.

### Phase 3 — Geometry ASCII renderer · ~2–3 days

1. `lib/sources/proceduralSource.ts` also exposes `cloud` and `camera`.
2. `RenderContext.source` → `ResolvedSource`.
3. Port `GeometryAsciiRenderer` → `renderers/geometryAscii.ts` as `(rc) => void`, reading `rc.source.cloud`. **Remove the `_activeStudioScene` back-channel** — the cloud arrives through the context.
4. Port `ShadedRenderer` → `renderers/shaded.ts`.
5. Add `sources: SourceKind[]` to `ModeOption`; filter the mode list by active source (§7.2).

**Acceptance**
- `geometry_ascii` on the butterfly scene matches ASCII Studio's output (side-by-side PNG at the same `t`, same params).
- Both geometry modes are hidden/disabled with an image or video loaded.
- Its parameters render through `ParamControl` and keyframe.
- The 39 image-space modes are unaffected.

**Rollback:** two new renderer files plus a context type change — revertable, though the `RenderContext` change touches every renderer's type signature. Do that type change in its own commit.

### Phase 4 — Deterministic export · ~3–4 days · **highest artistic payoff after Phase 1**

1. Introduce a clock-driven `time` in `useRenderer` with seek; keep wall-clock behind a flag until proven.
2. `lib/export/deterministic.ts`: loop `f = 0..N`, set `t = f/fps`, evaluate the timeline at `t`, render, capture.
3. `app/api/export/[action]/route.ts` porting `exportPlugin.ts` — `spawn('ffmpeg', [...])`, manifest, cover PNG. **Local dev only**, guarded.
4. Export UI: resolution, fps, duration, progress. Keep `MediaRecorder` as "quick capture (real-time)".
5. Port the two verify scripts.

**Acceptance**
- A 1080×1920 H.264 `yuv420p` 30fps MP4 from a procedural scene, verified with `ffprobe`.
- Two exports of the same preset are **byte-comparable frame-for-frame** (the determinism test).
- Keyframed parameter animation appears correctly in the exported file.
- `MediaRecorder` still works for video sources and on the deployed site.
- `scripts/verify-scenes.ts` renders every scene × compatible mode headlessly.

**Rollback:** the route handler and export module are new files. The `useRenderer` clock change is the risk — keep the flag until Phase 4 is signed off, then remove it in a follow-up.

### Phase 5 — Consolidation and presets · ~2–3 days · **deferrable**

1. `lib/presets.ts` — save/load a full `AppState` snapshot (localStorage first; file export later).
2. Merge charsets, hex↔RGB, Floyd–Steinberg; unify the luminance standard (own commit, with diffs).
3. Lift `RETRO_PALETTES` into the dither mode.
4. Port `AGENTS.md` + `create-scene` skill into Pixelate; update `CLAUDE.md`.
5. **Optional:** split `effects.ts` by family; merge the two physics integrators.

**Acceptance**
- A saved preset restores an identical frame at the same `t`.
- Visual regression on 10 representative modes shows only the intended luminance shift.
- An agent can add a scene following `AGENTS.md` and see it appear with full controls, keyframing and export — **this is the capability the whole migration is for.**

**Rollback:** each item is independent; the luminance change is the only one with visual consequences, and it is isolated to one commit.

### Phase 6 — Retire ASCII Studio as an application · ~half a day

1. Archive the repo's `src/ui`, `src/App.tsx`, `src/main.tsx`, `index.html`, and the 3 superseded renderers.
2. Keep: `references/` (the Edward Jones material), `exports/` (your output history), and optionally a `sandbox/` (§9).
3. README becomes: "Superseded by Pixelate. Retained as reference and scratchpad."

**Acceptance:** nothing in Pixelate imports from the ascii-studio path; Pixelate builds and deploys clean.

### Immediately safe vs deliberately deferred

**Do now (low risk, real benefit):** all of Phase 0. Utility consolidation (charsets, hex↔RGB) — it is safe in either direction. Phase 1, which is additive and produces artwork.

**Defer:** the `effects.ts` split (large diff, zero artistic payoff). Merging the physics integrators (works today). Imported 3D assets (§8.1). Any WebGPU work. Any Option D thinking. The Python sandbox until a specific surface demands it.

---

## 12. Open Questions and Unresolved Items

1. **Procedural frame budget.** I did not profile. Three.js scene update + `getSampleCloud` + ~50k-sample projection, per frame, in addition to Pixelate's existing per-frame `getImageData`, is the main technical unknown in this plan. **Phase 1 answers it cheaply** — measure before building Phase 3.
2. **Frame-exact video seeking.** Deterministic export of an *imported video* source needs frame-accurate `video.currentTime` seeking, which is unreliable across browsers **[A]**. Scenes and images are fine. This may mean video sources keep the real-time path indefinitely — acceptable, but it should be a deliberate decision.
3. **The 4 scenes without sample clouds.** Add clouds, or retire them? Fixing `OceanWavesScene` means authoring a Gerstner surface sampler with analytical normals — real work. Worth asking whether those four scenes earn it.
4. **Deployed export story.** Pixelate is on Vercel; FFmpeg is not. Does the deployed site keep `MediaRecorder` forever while local dev gets the good path? That is a legitimate answer but it splits the product.
5. **Luminance standard.** Rec.601 vs Rec.709 changes existing output. Which do you prefer for ASCII ramps? Needs an eyeball test, not an argument.
6. **Attribution wording.** Edward Jones's MIT licence is satisfied by retaining the notice, which you do. How prominently you credit the rasterizer port in a public repo is a judgement call I am flagging, not making.
7. **Whether the Python sandbox ever gets built.** My recommendation is "only on demand" (§9). You may disagree — you have more evidence than I do about where your math iteration actually slows down.

---

### Appendix — Primary evidence index

| Claim | Path:line |
|---|---|
| Geometry ASCII is a port of butterfly.py | `ascii-studio/src/engine/renderers/GeometryAsciiRenderer.ts:363,366,412,420-428` vs `ascii-studio/references/edwardjones-ascii-art/butterfly/butterfly.py:252-258,278-289` |
| Every Pixelate effect requires media | `pixelate/renderers/effects.ts:693-694`, `:25-35`, `:424-432` |
| The integration seam | `pixelate/lib/types.ts:208-217`; `pixelate/renderers/sourceColor.ts:10-25`; `pixelate/lib/imageData.ts:69` |
| DialKit unused | `ascii-studio/src/App.tsx:2,335`; `ascii-studio/src/ui/components/ControlPanel.tsx:109-195` |
| Pixelate time is wall-clock | `pixelate/hooks/useRenderer.ts:709` |
| Pixelate video is real-time capture | `pixelate/lib/export.ts:250-276` |
| ASCII Studio export is deterministic | `ascii-studio/src/engine/export/Exporter.ts:112-166`; `ascii-studio/src/server/exportPlugin.ts:236` |
| Export pipeline demonstrably works | `ascii-studio/exports/manifest.json` (8 records, 1080×1920) |
| 4 of 8 scenes lack `getSampleCloud` | `ascii-studio/src/engine/scenes/` — Jellyfish, BlackHole, OceanWaves, MorphingAbstract |
| `stages` is inert | No consumer of `IScene.stages` in `src/engine/` |
| Structural keyframe interpolation | `pixelate/lib/timeline.ts:44-78,110-140` |
| Pixelate has no preset system | No `localStorage` outside charset naming |
| Pixelate control primitives | `pixelate/components/controls/` (281 LOC) |
| ASCII Studio typechecks clean | `npx tsc --noEmit` → exit 0 |
