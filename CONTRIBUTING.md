# Contributing to Pixelate

Thanks for your interest in contributing. This document covers how the project is structured, how to run it locally, and how to add new render modes or features.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Project Structure](#project-structure)
- [Adding a Render Mode](#adding-a-render-mode)
- [Adding Sidebar Controls](#adding-sidebar-controls)
- [Working with Color and Output](#working-with-color-and-output)
- [Export Compatibility](#export-compatibility)
- [Landing Page](#landing-page)
- [Code Style](#code-style)

---

## Prerequisites

- Node.js 20 or newer
- npm (use `npm.cmd` on Windows PowerShell if `npm` is blocked by execution policy)
- A modern browser with Canvas, MediaRecorder, and `canvas.captureStream()` support

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The editor lives at `/app`.

Build and preview a production build:

```bash
npm run build
npm run start
```

On Windows PowerShell:

```powershell
npm.cmd run build
npm.cmd run start
```

---

## Project Structure

```
app/
  layout.tsx          — root layout, metadata, global CSS import
  page.tsx            — landing page (reads /public/demos for marquee)
  app/page.tsx        — editor application
  favicon.ico/route.ts — dynamic .ico route

components/
  LandingPage.tsx     — full landing page component
  Canvas.tsx          — canvas host, receives media + appState
  Sidebar.tsx         — all editor controls
  UploadZone.tsx      — drag-and-drop / click upload
  ExportModal.tsx     — PNG, SVG, React, video, favicon exports
  controls/
    ColorControls.tsx — shared color mode + palette pickers
    SliderInput.tsx
    Toggle.tsx
    Select.tsx
    TextInput.tsx
    ColorInput.tsx
    Section.tsx
    ModeSwitch.tsx

hooks/
  useRenderer.ts      — canvas sizing, animation loop, media sampling,
                        mouse physics, output adjustments, render dispatch

lib/
  types.ts            — AppState and all sub-types
  defaults.ts         — default AppState values
  modes.ts            — mode lists and display names
  charsets.ts         — ASCII charset presets
  color.ts            — palette generation, color math helpers
  imageData.ts        — pixel sampling and ImageData utilities
  export.ts           — PNG, SVG, React, video, favicon export helpers
  timeline.ts         — keyframe interpolation logic

renderers/
  index.ts            — dispatches AppState.mode → renderer function
  types.ts            — shared RenderContext type
  util.ts             — shared drawing primitives
  background.ts       — shared background fill / clear logic
  color.ts            — color mode resolution per cell/pixel
  sourceColor.ts      — source-image color sampling helpers
  ascii.ts            — ASCII renderer (all charsets + algorithms)
  pixelBlocks.ts      — Pixel Blocks renderer
  dots.ts             — Dots renderer
  mosaic.ts           — Mosaic renderer
  blurred.ts          — Blurred Image renderer
  black.ts            — Black Silhouette renderer
  transparent.ts      — Transparent Image renderer
  effects.ts          — all expanded effect/generative/live modes

public/
  demos/              — .webm files used by the landing page marquee
```

---

## Adding a Render Mode

### 1. Register the mode

Open `lib/types.ts` and add your mode name to the `Mode` union type, then add a display label in `lib/modes.ts`.

### 2. Write the renderer

Create a function in `renderers/effects.ts` (or a new file if it's large enough to warrant one):

```ts
import type { RenderContext } from "./types";

export function renderMyMode(ctx: RenderContext): void {
  const { canvas, context, state, sample } = ctx;
  // draw to context...
}
```

`RenderContext` provides:

| Field | Type | Description |
|---|---|---|
| `canvas` | `HTMLCanvasElement` | The output canvas |
| `context` | `CanvasRenderingContext2D` | 2D context for drawing |
| `state` | `AppState` | Full app state snapshot |
| `sample` | `(x, y) => RGBA` | Sample the source image/video at pixel coords |
| `cells` | `Cell[][]` | Pre-built cell grid (cell modes only) |
| `width` / `height` | `number` | Canvas dimensions |
| `time` | `number` | Elapsed time in seconds |

### 3. Dispatch from the router

In `renderers/index.ts`, add a case for your mode:

```ts
case "mymode":
  return renderMyMode(ctx);
```

### 4. Cell vs. direct-source

- **Cell modes** (`ascii`, `pixels`, `dots`, `mosaic`) receive a pre-sampled `cells` grid. Each cell has a position, size, color, and brightness value. Use these for character/block/dot renderers.
- **Direct-source modes** (`blurred`, `black`, `transparent`, and most effect modes) draw directly from the source image via `sample()` or by drawing the media element itself onto the canvas. They do not receive a cell grid.
- `CELL_MODES` in `lib/modes.ts` controls which modes get the cell grid built before render.

### 5. Mouse interaction and output adjustments

You do not need to handle these in your renderer. `hooks/useRenderer.ts` automatically applies:

- `applyMouseWarp()` after every render pass when mouse interaction is enabled
- `applyOutputAdjustments()` after the mouse warp (brightness, saturation, hue, luminance, opacity)

Both work on every mode without any changes to your renderer.

---

## Adding Sidebar Controls

Sidebar controls live in `components/Sidebar.tsx`. Group new controls inside a `<Section>` block, gated by the active mode:

```tsx
{state.mode === "mymode" && (
  <Section label="My Mode">
    <SliderInput
      label="Intensity"
      value={state.effect.intensity}
      min={0} max={1} step={0.01}
      onChange={(v) => setState(s => ({ ...s, effect: { ...s.effect, intensity: v } }))}
    />
  </Section>
)}
```

Available control components: `SliderInput`, `Toggle`, `Select`, `TextInput`, `ColorInput`, `ColorControls`, `ModeSwitch`.

Effect-mode shared settings (scale, intensity, threshold, seed) are stored in `state.effect`. Add new per-mode fields to `AppState` in `lib/types.ts` and their defaults in `lib/defaults.ts`.

---

## Working with Color and Output

### Color modes

All modes can opt into the shared color system. The active color mode is in `state.colorMode`:

| Value | Behavior |
|---|---|
| `"single"` | Use `state.color` |
| `"source"` | Sample from source image |
| `"palette"` | Cycle through `state.palette` |
| `"complementary"` | Derive complement from source |
| `"rainbow"` | Hue-shifted per cell |

`renderers/color.ts` exports `resolveColor(cell, state, time)` which returns the correct fill color for a given cell based on the active color mode. Call this in cell-based renderers.

For direct-source modes, apply color tinting after drawing, or use `state.color` directly for single-color overlays.

### Output adjustments

Do not apply brightness/saturation/hue/luminance/opacity yourself — these are always applied by `applyOutputAdjustments()` in `useRenderer.ts` after your renderer returns.

---

## Export Compatibility

- **PNG / Video / Favicon**: Work automatically for every renderer because they capture the canvas backing store.
- **SVG / React**: Only meaningful for cell-based modes. Each cell is exported as an SVG element. If your mode is not cell-based, SVG export will produce a blank output — that is expected behavior.
- If your cell-based mode produces non-rectangular geometry, map each logical cell to the closest SVG primitive (`<rect>`, `<circle>`, `<text>`) in `lib/export.ts`.

---

## Landing Page

The landing page (`components/LandingPage.tsx`) is a separate self-contained React component. It does not share state with the editor.

Demo videos for the marquee go in `public/demos/`. Any `.webm` file placed there is automatically picked up by `app/page.tsx` and added to the marquee. Files are sorted numerically by filename.

To update the hero video, add a `.webm` to `public/demos/` and name it so that the filename contains `8` or `pixelate_8_` — the hero selection logic prefers that file. See `components/LandingPage.tsx` for the exact matching logic.

---

## Code Style

- TypeScript strict mode is on. No `any` unless unavoidable.
- No comments unless the reason is non-obvious (hidden constraint, workaround, subtle invariant).
- No trailing `console.log` calls.
- Prefer editing existing files over creating new ones.
- Do not add error handling for code paths that cannot fail under normal operation.
- Tailwind utility classes for layout and spacing; custom CSS in `app/globals.css` only when Tailwind cannot express it.
- Run `npm.cmd run build` (Windows) or `npm run build` before submitting to confirm there are no TypeScript errors.
