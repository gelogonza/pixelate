# Pixelate

Pixelate is a local Next.js app for turning images and videos into stylized canvas renders. It ships a landing page at `/` and a full editor at `/app`.

## Requirements

- Node.js 20 or newer
- npm (use `npm.cmd` on Windows PowerShell if execution policy blocks `npm.ps1`)
- A modern browser with Canvas, MediaRecorder, and `canvas.captureStream()` support for video export

## Setup

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js, usually `http://localhost:3000`. The editor is at `http://localhost:3000/app`.

Build and start the production app:

```bash
npm run build
npm run start
```

On Windows PowerShell:

```powershell
npm.cmd run build
npm.cmd run start
```

## Supported Source Media

- Images: PNG, JPG/JPEG, WebP
- Videos: MP4, WebM, Ogg video, MOV/QuickTime

Videos are loaded into a hidden muted looping video element and sampled into the renderer every animation frame.

## Render Modes

The app defaults to ASCII. Use the Render mode dropdown in the sidebar to switch to any other mode.

### Cell-based modes

| Mode | Description |
|---|---|
| ASCII | Maps image values to characters with optional color and motion |
| Pixel Blocks | Renders each sampled cell as a square or rounded block |
| Dots | Renders cells as circles with optional brightness-based sizing |
| Mosaic | Renders jittered painterly tiles with tone variation |

### Direct-source filter modes

| Mode | Description |
|---|---|
| Blurred Image | Draws the source with blur, saturation, and brightness filters |
| Black Silhouette | Thresholds the source into a black silhouette |
| Transparent Image | Clears the canvas alpha and draws the source with optional opacity and blur |

### Pixel / image manipulation

Voronoi diagram, Pointillism, Watercolor, Oil painting, Stippling, Cross hatching, Linocut / woodblock, Risograph, Thermal camera, Infrared, Solarize, Duotone, Halftone CMYK

### Generative / art

Voronoi stipple, Flow field, String art, Topographic, Pixel sort, Databend / glitch, Dithering (Floyd-Steinberg, Bayer matrix, ordered, Sierra, Atkinson — color-aware, respects active color mode), Stained glass

### Text-based

Fill shape with text, Emoji mapping, Word cloud, Binary, Matrix rain

### Interactive / live

Reaction diffusion, Liquid simulation (stable-fluid velocity field used as source-image refraction with wave bands, sliver displacement, caustics, and ripples), Sand simulation, Magnetic field lines, Noise displacement

## ASCII Features

**Character mapping styles**

- Brightness ASCII
- Detailed ASCII
- Block characters
- Braille density glyphs
- Directional edge glyphs
- Custom charset

**Mapping algorithms**

- Perceptual luminance: `0.299R + 0.587G + 0.114B`
- Standard brightness: average RGB
- HSL lightness
- Sobel edge strength
- Sobel edge direction sketch
- Contrast boosted

**Rendering variations**

- Match-image colored ASCII
- Single-color ASCII
- Palette-mapped ASCII
- Complementary-color ASCII
- Inverted mapping
- Floyd-Steinberg dithering
- Animated character and palette cycling

## Shared Color Controls

All render modes share the same color section:

- Single color
- Match image
- Palette
- Complementary
- Rainbow
- Palette size from 1 to 8 colors
- Per-slot palette color pickers
- Palette animation speed

## Shared Output Controls

Every render mode shares the same final output adjustments, applied after the renderer and mouse interaction:

- Brightness
- Saturation
- Hue
- Luminance
- Opacity

These affect the live canvas plus PNG, video, and favicon exports. SVG/React exports carry representable filter and opacity settings.

## Animation

- **Animate mode**: animates the active renderer behavior.
- **Cycle colors**: keeps renderer behavior static but cycles color assignments.

Both work across all color modes (single, source, palette, complementary).

## Timeline and Keyframes

Timeline lets you animate one image through multiple edit states.

1. Enable Timeline in the sidebar.
2. Set Duration and move the Playhead.
3. Add keyframes at different times after changing mode/settings/colors.
4. Select, update, or delete keyframes.
5. Play/Pause with optional loop to preview interpolated animation.

The canvas renders interpolated state between keyframes, so mode, color, and control changes animate over time.

## Mouse Interaction

Mouse interaction is available in every render mode. Cell-based modes move their sampled cells with spring physics. All modes also receive a post-render canvas warp so direct-source and generative modes respond to the pointer.

## Canvas Resolution

The Canvas section controls render/export resolution:

- **Auto**: display size multiplied by device pixel ratio
- **720p** / **1080p** / **1440p** / **2160p**: target the short edge, preserving aspect ratio

For example, 1080p on a 16:9 source produces a 1920×1080 canvas; on a 9:16 portrait source it produces 1080×1920.

Higher resolutions make live preview heavier, especially dense ASCII. Use Auto while tuning, then switch before export.

The Canvas section also has a **Background** toggle. Turn it off for a transparent canvas. PNG exports preserve alpha, and SVG/React exports omit the background rectangle.

## Exports

| Format | Notes |
|---|---|
| PNG | Saves the current canvas pixels at full backing-store resolution |
| SVG | Exports vector output for cell-based modes |
| React | Opens a modal with a self-contained React component generated from the SVG |
| Video | Records the live canvas for 1–10 seconds using MediaRecorder |
| Favicon | Saves a real `.ico` file with embedded PNG payloads at 16, 32, 48, 64, 128, and 256 px |

SVG and React exports are only meaningful for cell-based modes. Direct-source and generative modes produce a blank SVG.

## Project Structure

```
app/
  layout.tsx          — root layout, metadata
  page.tsx            — landing page
  app/page.tsx        — editor application
  favicon.ico/route.ts — dynamic .ico route

components/
  LandingPage.tsx     — landing page component
  Canvas.tsx          — canvas host
  Sidebar.tsx         — editor sidebar controls
  UploadZone.tsx      — drag-and-drop / click upload
  ExportModal.tsx     — export UI
  controls/           — shared control primitives

hooks/
  useRenderer.ts      — canvas sizing, animation loop, media sampling,
                        mouse physics, output adjustments, render dispatch

lib/
  types.ts            — AppState and sub-types
  defaults.ts         — default state values
  modes.ts            — mode lists and labels
  charsets.ts         — ASCII charset presets
  color.ts            — palette and color math helpers
  imageData.ts        — pixel sampling utilities
  export.ts           — export helpers (PNG, SVG, React, video, favicon)
  timeline.ts         — keyframe interpolation

renderers/
  index.ts            — mode → renderer dispatch
  types.ts            — RenderContext type
  util.ts             — shared drawing primitives
  background.ts       — background fill / clear
  color.ts            — color mode resolution
  sourceColor.ts      — source-image color sampling
  ascii.ts            — ASCII renderer
  pixelBlocks.ts      — Pixel Blocks renderer
  dots.ts             — Dots renderer
  mosaic.ts           — Mosaic renderer
  blurred.ts          — Blurred Image renderer
  black.ts            — Black Silhouette renderer
  transparent.ts      — Transparent Image renderer
  effects.ts          — all expanded effect / generative / live modes

public/
  demos/              — .webm files used by the landing page marquee
```

## Notes

- `.pixelate-memory.md` is intentionally git-ignored and meant for local working notes only.
- Running plain `npm run build` may fail in PowerShell if script execution policy blocks `npm.ps1`; use `npm.cmd run build` in that case.


## Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md)