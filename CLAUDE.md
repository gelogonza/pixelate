# Pixelate Working Notes

## Current App

Pixelate is a Next.js 14 + React 18 + TypeScript canvas renderer. The app accepts image and video files, renders them through selectable visual modes, and exports PNG, SVG, React component code, video, or favicon `.ico`. A landing page lives at `/`; the editor is at `/app`.

## Architecture

- `hooks/useRenderer.ts` owns canvas sizing, render resolution, animation scheduling, media resampling, mouse physics, and final output adjustments. It dispatches to the active renderer each frame.
- `renderers/index.ts` maps `AppState.mode` to renderer functions.
- `CELL_MODES` are `ascii`, `pixels`, `dots`, and `mosaic`. These receive a pre-sampled cell grid before render.
- `blurred`, `black`, and `transparent` draw directly from the source image and do not build a cell grid.
- Expanded/effect modes render through `renderers/effects.ts`. They are canvas-native approximations with shared controls rather than separate simulation engines.
- `applyMouseWarp()` runs after every render pass when mouse interaction is enabled. This makes non-cell modes interactive.
- `applyOutputAdjustments()` runs after the mouse warp so every render mode has the same final brightness/saturation/hue/luminance/opacity stack.
- Fixed render resolutions target the short edge and preserve aspect ratio.
- Shared background behavior lives in `renderers/background.ts`.
- Color mode resolution per cell lives in `renderers/color.ts`.

## Route / Component Wiring

- `app/page.tsx` reads `/public/demos/*.webm`, sorts numerically, passes paths to `LandingPage`.
- `app/app/page.tsx` serves the Pixelate editor.
- `components/LandingPage.tsx` is the full landing page — self-contained, no shared state with the editor.
- Landing page media is rooted under `/public/demos/` and referenced as `/demos/...` URLs.

## Landing Page Details

`components/LandingPage.tsx` implements:
- Editorial hero: left text column (PIXELATE wordmark canvas + subtitle + h1 + paragraph), right full-bleed video column.
- `AsciiWordmark` — `<canvas>` component that renders an animated dot/ASCII PIXELATE wordmark. Uses `canvas.offsetWidth` (column width) as render width. CSS `width: 100%` on `.ed-wordmark` makes `offsetWidth` equal the column width, not viewport width.
- Hero height sync: `ResizeObserver` on the text column drives `videoColRef.current.style.height`. A `paddingTop = Math.floor(canvasH * 0.19)` offset aligns the video top with the top of the rendered PIXELATE letters (which draw at `0.52*canvasH` baseline with `0.66*canvasH` font size → top edge at `0.52 − 0.33 = 0.19`).
- Right video bleed: `.ed-hero-bleed` uses `margin-right: calc(50% − 50vw)` on desktop to reach the viewport edge.
- Fixed transparent nav with animated link underlines.
- ASCII trail glyph effects (pointer only — hidden on touch via `pointer: coarse`).
- Showcase marquee: continuous horizontal loop of demo videos. Each marquee item is clickable to open a `MediaModal` (full-size overlay, Escape to close) without stopping the marquee.
- Before/after section using `dreamscape-field.png` and `pixelate(11).webm`.
- Intersection-observer reveal animations (`[data-io]` / `[data-io-child]`).
- `useMagnetic` hook for CTA button spring physics.
- Hero video preference: filename containing `8` or `pixelate_8_` is picked as hero clip.

## CSS Architecture

Custom CSS lives in `app/globals.css`. Tailwind utilities handle most layout/spacing. Custom classes are added only when Tailwind cannot express the requirement.

Key custom classes:
- `.ed-wordmark { display: block; width: 100%; }` — ensures `canvas.offsetWidth` returns column width.
- `.ed-hero-grid` — removes left grid padding at md+ so the text column can use explicit `md:pl-6` padding matching the nav.
- `.ed-hero-bleed` — `height: 100%; margin-right: calc(50% − 50vw)` on desktop for full-bleed right edge. On mobile: `margin-right: 0; height: auto; aspect-ratio: 16/9; border-radius: 8px`.
- `.ed-trail-glyph` — hidden on `pointer: coarse` devices.
- No `.ed-cursor` or `.ed-cursor.is-large` rules — custom cursor was removed.

## Export Notes

- PNG, video, and favicon exports capture the canvas backing store — work for every mode automatically.
- SVG and React exports are meaningful for cell-based modes only. Direct-source/effect modes produce a blank SVG (expected).
- Transparent mode uses `ctx.clearRect()` so PNG exports preserve alpha.
- `lib/export.ts` handles all export logic. SVG/React exports carry filter and opacity settings for representable properties.

## Verified

- `npm.cmd run build` passes on Windows PowerShell.
- Plain `npm run build` may fail in PowerShell if execution policy blocks `npm.ps1`; use `npm.cmd run build` instead.

## Files to Know

| Path | Role |
|---|---|
| `lib/types.ts` | `AppState` and all sub-types |
| `lib/defaults.ts` | Default `AppState` values |
| `lib/modes.ts` | Mode lists, display names, `CELL_MODES` |
| `lib/charsets.ts` | ASCII charset presets |
| `lib/color.ts` | Palette generation and color math |
| `lib/imageData.ts` | Pixel sampling / ImageData utilities |
| `lib/export.ts` | PNG, SVG, React, video, favicon helpers |
| `lib/timeline.ts` | Keyframe interpolation |
| `hooks/useRenderer.ts` | Main render loop |
| `renderers/index.ts` | Mode → renderer dispatch |
| `renderers/effects.ts` | All expanded/generative/live modes |
| `renderers/color.ts` | Color mode resolution per cell |
| `components/Sidebar.tsx` | All editor sidebar controls |
| `components/LandingPage.tsx` | Landing page |
| `app/globals.css` | All custom CSS |
| `public/demos/` | Demo `.webm` files for the landing marquee |

## Ignored Files

- `.pixelate-memory.md` — local working memory, intentionally git-ignored.