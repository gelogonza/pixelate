"use client";

import { useEffect, useRef, useCallback } from "react";
import { AppState, MediaSource, isVideo } from "@/lib/types";
import { buildCells, computeGridDims, GridDims, resampleCells } from "@/lib/imageData";
import { Cell, GeometryContext, RenderContext } from "@/renderers/types";
import { render, CELL_MODES } from "@/renderers";
import { EFFECT_MODES, GEOMETRY_MODES, frameAspectRatio } from "@/lib/modes";
import { paintBackground } from "@/renderers/background";
import { SceneHost } from "@/engine/SceneHost";
import type { FrameInfo } from "@/engine/types";

export interface RendererHandle {
  exportSnapshot: () => { cells: Cell[]; dims: GridDims; width: number; height: number } | null;
  /**
   * Render one exact frame at `time` seconds and leave it on the canvas.
   *
   * Call with increasing `time` starting from 0: several modes carry state
   * across frames on purpose (the fluid solver, matrix rain, the depth
   * renderer's materialization timing), so they must be stepped in order.
   *
   * Pointer physics is skipped, which is what makes the result reproducible.
   * Returns false if nothing could be rendered.
   */
  renderFrameAt: (time: number) => Promise<boolean>;
  /** Reset cross-frame renderer state so an export starts from a clean slate. */
  resetForExport: () => void;
}

interface MouseState {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  inside: boolean;
  // counter for frames where we still want to apply velocity even after pointer stops
  pulse: number;
}

interface ProxyPoint {
  ox: number;
  oy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface ProxyField {
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  points: ProxyPoint[];
}

/** Central render loop: owns canvas sizing, cell grid, animation scheduling, mouse physics, and output adjustments. */
export function useRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  containerRef: React.RefObject<HTMLDivElement>,
  media: MediaSource | null,
  state: AppState,
  onResize?: (size: { width: number; height: number; dpr: number }) => void
): RendererHandle {
  const stateRef = useRef(state);
  stateRef.current = state;
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;
  const mediaRef = useRef<MediaSource | null>(media);
  mediaRef.current = media;

  const cellsRef = useRef<Cell[]>([]);
  const dimsRef = useRef<GridDims>({ cols: 0, rows: 0, cellWidth: 0, cellHeight: 0 });
  const sizeRef = useRef({ width: 0, height: 0 });
  const dprRef = useRef(1);
  const mouseRef = useRef<MouseState>({
    x: -9999, y: -9999, px: -9999, py: -9999, vx: 0, vy: 0, inside: false, pulse: 0,
  });
  const warpCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const proxyFieldRef = useRef<ProxyField | null>(null);
  const layerCanvasMapRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // Procedural source. The host is created lazily so media-only sessions never
  // pay for a WebGL context.
  const sceneHostRef = useRef<SceneHost | null>(null);
  /** The source actually being drawn this frame: imported media, or the scene's raster. */
  const activeSourceRef = useRef<MediaSource | null>(null);
  const geometryRef = useRef<GeometryContext | null>(null);

  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef(0);
  const startTRef = useRef(0);
  const needsRebuildRef = useRef(true);

  const requestFrame = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const proxyCellSizeForState = useCallback((s: AppState) => {
    if (s.mode === "blurred") return Math.max(16, s.blurred.radius * 0.8 + 12);
    if (s.mode === "black") return 20;
    if (s.mode === "transparent") return Math.max(16, s.transparent.blur * 0.8 + 12);
    if (EFFECT_MODES.has(s.mode)) return Math.max(16, s.effect.scale * 0.8 + 12);
    return 18;
  }, []);

  const ensureProxyField = useCallback((width: number, height: number) => {
    const s = stateRef.current;
    const baseSpacing = proxyCellSizeForState(s);
    // Cap proxy point count so non-cell mouse physics stays responsive even at
    // high render resolutions.
    const maxPoints = 2200;
    const minSpacingForBudget = Math.sqrt((width * height) / maxPoints);
    const spacing = Math.max(baseSpacing, minSpacingForBudget);
    const cols = Math.max(8, Math.floor(width / spacing) + 1);
    const rows = Math.max(6, Math.floor(height / spacing) + 1);
    const cellWidth = width / Math.max(1, cols - 1);
    const cellHeight = height / Math.max(1, rows - 1);

    const current = proxyFieldRef.current;
    if (current && current.cols === cols && current.rows === rows) return;

    const points: ProxyPoint[] = new Array(cols * rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = x * cellWidth;
        const py = y * cellHeight;
        points[y * cols + x] = { ox: px, oy: py, x: px, y: py, vx: 0, vy: 0 };
      }
    }
    proxyFieldRef.current = { cols, rows, cellWidth, cellHeight, points };
  }, [proxyCellSizeForState]);

  /**
   * Advance the procedural scene to `time` and publish its raster and sample
   * cloud for this frame. Returns the source the renderers should draw from.
   *
   * The scene is a pure function of time, so this is seek-safe: the same `time`
   * always produces the same frame.
   */
  const resolveSource = useCallback((time: number): MediaSource | null => {
    const s = stateRef.current;
    if (s.sourceKind !== "scene") {
      geometryRef.current = null;
      activeSourceRef.current = mediaRef.current;
      return mediaRef.current;
    }

    let host = sceneHostRef.current;
    if (!host) {
      host = new SceneHost();
      sceneHostRef.current = host;
    }

    const { width, height } = sizeRef.current;
    const canvas = canvasRef.current;
    // Render the scene at the canvas backing-store resolution so export quality
    // follows the render-resolution setting rather than the CSS size.
    const rw = Math.max(1, canvas?.width || Math.floor(width) || 1);
    const rh = Math.max(1, canvas?.height || Math.floor(height) || 1);

    host.setScene(s.scene.id, s.scene.params);
    host.resize(rw, rh);

    const fps = 30;
    const duration = Math.max(0.1, s.videoDurationSec || 6);
    const t = duration > 0 ? time % duration : time;
    const frameInfo: FrameInfo = {
      frame: Math.round(t * fps),
      time: t,
      duration,
      progress: duration > 0 ? t / duration : 0,
      fps,
      width: rw,
      height: rh,
      aspectRatio: rw / rh,
    };

    host.update(frameInfo, s.scene.params, s.camera);

    if (GEOMETRY_MODES.has(s.mode)) {
      geometryRef.current = { cloud: host.cloud(frameInfo, s.scene.params), camera: host.getCamera() };
    } else {
      geometryRef.current = null;
    }

    // Shaded mode blits the raster itself; depth ASCII never needs one.
    const needsRaster = s.mode !== "geometry_ascii";
    const raster = needsRaster
      ? host.raster(s.backgroundEnabled ? s.background : null)
      : null;

    activeSourceRef.current = raster;
    return raster;
  }, [canvasRef]);

  const rebuild = useCallback((): boolean => {
    const src = activeSourceRef.current;
    const canvas = canvasRef.current;
    const sNow = stateRef.current;

    // Geometry modes read the sample cloud, not a raster or a cell grid.
    if (GEOMETRY_MODES.has(sNow.mode)) {
      cellsRef.current = [];
      const { width: gw, height: gh } = sizeRef.current;
      if (gw > 0 && gh > 0) ensureProxyField(gw, gh);
      return true;
    }

    if (!src || !canvas) {
      cellsRef.current = [];
      proxyFieldRef.current = null;
      return false;
    }
    const { width, height } = sizeRef.current;
    if (width === 0 || height === 0) return false;
    const s = stateRef.current;
    if (!CELL_MODES.has(s.mode)) {
      // Non-cell modes use a spring proxy field for mouse interaction.
      ensureProxyField(width, height);
      cellsRef.current = [];
      return true;
    }
    const cellMode = s.mode as "ascii" | "pixels" | "dots" | "mosaic";
    const params =
      cellMode === "ascii"
        ? { density: s.ascii.density, charAspect: s.ascii.charAspect }
        : cellMode === "pixels"
        ? { cellSize: s.pixels.cellSize }
        : cellMode === "dots"
        ? { cellSize: s.dots.cellSize }
        : { cellSize: s.mosaic.cellSize };
    const dims = computeGridDims(cellMode, width, height, params);
    dimsRef.current = dims;
    const withEdges =
      cellMode === "ascii" &&
      (s.ascii.algorithm === "edge" || s.ascii.algorithm === "edge_directional");
    cellsRef.current = buildCells(src, dims, withEdges);
    proxyFieldRef.current = null;
    return true;
  }, [canvasRef, ensureProxyField]);

  /** Resize the canvas to match container, preserving image aspect. */
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const src = mediaRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const availW = Math.max(0, rect.width - 32);
    const availH = Math.max(0, rect.height - 32);
    if (availW < 4 || availH < 4) {
      requestAnimationFrame(() => resize());
      return;
    }

    // An explicit frame aspect wins for every source kind — it is what the export
    // is shaped to. Media is then letterboxed into that frame by the renderers,
    // which all contain-fit the source. With "auto", media keeps its own aspect
    // and a scene fills the available area.
    let iw = 0, ih = 0;
    const forcedRatio = frameAspectRatio(stateRef.current.frameAspect);
    if (forcedRatio) {
      iw = forcedRatio * 1000;
      ih = 1000;
    } else if (stateRef.current.sourceKind === "scene") {
      // No intrinsic size and no forced shape: fill the viewport.
      iw = 0;
      ih = 0;
    } else if (src) {
      if (isVideo(src)) {
        iw = src.videoWidth;
        ih = src.videoHeight;
      } else {
        iw = (src as HTMLImageElement).naturalWidth || src.width;
        ih = (src as HTMLImageElement).naturalHeight || src.height;
      }
    }

    let cssW = availW;
    let cssH = availH;
    if (iw > 0 && ih > 0) {
      const ia = iw / ih;
      const ca = availW / availH;
      if (ia > ca) {
        cssW = availW;
        cssH = availW / ia;
      } else {
        cssH = availH;
        cssW = availH * ia;
      }
    }
    cssW = Math.max(1, Math.floor(cssW));
    cssH = Math.max(1, Math.floor(cssH));

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    dprRef.current = dpr;

    // Compute the canvas internal (backing-store) resolution. CSS coords are
    // unchanged — only the underlying pixel grid grows so PNG/Video exports
    // ship at the target resolution.
    const res = stateRef.current.renderResolution;
    let internalW: number;
    let internalH: number;
    if (res === "auto") {
      internalW = Math.floor(cssW * dpr);
      internalH = Math.floor(cssH * dpr);
    } else {
      const target =
        res === "720p" ? 720 :
        res === "1080p" ? 1080 :
        res === "1440p" ? 1440 :
        2160;
      // Short edge = target; long edge scales by aspect.
      const aspect = cssW / cssH;
      if (aspect >= 1) {
        internalH = target;
        internalW = Math.round(target * aspect);
      } else {
        internalW = target;
        internalH = Math.round(target / aspect);
      }
    }

    canvas.width = internalW;
    canvas.height = internalH;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    sizeRef.current = { width: cssW, height: cssH };
    onResizeRef.current?.({ width: internalW, height: internalH, dpr });

    needsRebuildRef.current = true;
    requestFrame();
  }, [canvasRef, containerRef, requestFrame]);

  /** Physics tick. Returns true if any cell moved meaningfully. */
  const stepPhysics = useCallback((dt: number): boolean => {
    const m = mouseRef.current;
    if (m.pulse > 0) m.pulse -= 1;
    m.vx *= 0.7;
    m.vy *= 0.7;

    const cells = cellsRef.current;
    if (cells.length === 0) return false;
    const ms = stateRef.current.mouse;
    let moved = false;

    const radius = ms.radius;
    const r2 = radius * radius;
    const strength = ms.strength;
    const damping = ms.damping;
    const ret = ms.returnSpeed;
    const dtScale = Math.max(0.5, Math.min(2, dt * 60)); // normalize to 60fps step

    const apply = ms.enabled && (m.inside || m.pulse > 0) && (Math.abs(m.vx) > 0.001 || Math.abs(m.vy) > 0.001 || m.pulse > 0);
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];

      if (apply) {
        const dx = c.x - m.x;
        const dy = c.y - m.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const d = Math.sqrt(d2) || 1;
          const falloff = 1 - d / radius;
          // Push in direction of mouse motion, scaled by closeness.
          c.vx += m.vx * falloff * strength;
          c.vy += m.vy * falloff * strength;
        }
      }

      // Spring back to origin
      c.vx += (c.ox - c.x) * ret;
      c.vy += (c.oy - c.y) * ret;

      // Damping
      c.vx *= damping;
      c.vy *= damping;

      // Integrate
      c.x += c.vx * dtScale;
      c.y += c.vy * dtScale;

      if (Math.abs(c.vx) > 0.02 || Math.abs(c.vy) > 0.02 || Math.abs(c.x - c.ox) > 0.05 || Math.abs(c.y - c.oy) > 0.05) {
        moved = true;
      }
    }

    return moved;
  }, []);

  const stepProxyPhysics = useCallback((dt: number): boolean => {
    const proxy = proxyFieldRef.current;
    if (!proxy) return false;
    const ms = stateRef.current.mouse;
    const m = mouseRef.current;
    const points = proxy.points;
    const radius = ms.radius;
    const r2 = radius * radius;
    const strength = ms.strength;
    const damping = ms.damping;
    const ret = ms.returnSpeed;
    const dtScale = Math.max(0.5, Math.min(2, dt * 60));
    const apply =
      ms.enabled &&
      (m.inside || m.pulse > 0) &&
      (Math.abs(m.vx) > 0.001 || Math.abs(m.vy) > 0.001 || m.pulse > 0);
    const forceRadius = radius * 1.15;
    const minFx = m.x - forceRadius;
    const maxFx = m.x + forceRadius;
    const minFy = m.y - forceRadius;
    const maxFy = m.y + forceRadius;

    let moved = false;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (
        !apply &&
        Math.abs(p.vx) < 0.001 &&
        Math.abs(p.vy) < 0.001 &&
        Math.abs(p.x - p.ox) < 0.001 &&
        Math.abs(p.y - p.oy) < 0.001
      ) {
        continue;
      }
      if (apply) {
        if (p.x < minFx || p.x > maxFx || p.y < minFy || p.y > maxFy) {
          // Outside the interaction box, only spring return applies.
        } else {
        const dx = p.x - m.x;
        const dy = p.y - m.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const d = Math.sqrt(d2) || 1;
          const falloff = 1 - d / radius;
          p.vx += m.vx * falloff * strength;
          p.vy += m.vy * falloff * strength;
        }
        }
      }

      p.vx += (p.ox - p.x) * ret;
      p.vy += (p.oy - p.y) * ret;
      p.vx *= damping;
      p.vy *= damping;
      p.x += p.vx * dtScale;
      p.y += p.vy * dtScale;

      if (
        Math.abs(p.vx) > 0.02 ||
        Math.abs(p.vy) > 0.02 ||
        Math.abs(p.x - p.ox) > 0.05 ||
        Math.abs(p.y - p.oy) > 0.05
      ) {
        moved = true;
      }
    }
    return moved;
  }, []);

  /** Lens-magnify warp centered on the cursor for cell-based modes. */
  const applyMouseWarp = useCallback((
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    scaleX: number,
    scaleY: number
  ): boolean => {
    const ms = stateRef.current.mouse;
    const m = mouseRef.current;
    if (!ms.enabled || (!m.inside && m.pulse <= 0)) return false;

    const radius = Math.max(8, ms.radius * Math.max(scaleX, scaleY));
    const cx = m.x * scaleX;
    const cy = m.y * scaleY;
    if (cx + radius < 0 || cy + radius < 0 || cx - radius > canvas.width || cy - radius > canvas.height) {
      return false;
    }

    let copy = warpCanvasRef.current;
    if (!copy) {
      copy = document.createElement("canvas");
      warpCanvasRef.current = copy;
    }
    if (copy.width !== canvas.width || copy.height !== canvas.height) {
      copy.width = canvas.width;
      copy.height = canvas.height;
    }
    const cctx = copy.getContext("2d")!;
    cctx.setTransform(1, 0, 0, 1, 0, 0);
    cctx.clearRect(0, 0, copy.width, copy.height);
    cctx.drawImage(canvas, 0, 0);

    const speed = Math.hypot(m.vx * scaleX, m.vy * scaleY);
    const lift = 1 + Math.min(0.28, ms.strength * 0.08 + speed * 0.002);
    const srcSize = (radius * 2) / lift;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.globalAlpha = 0.72;
    ctx.drawImage(
      copy,
      cx - srcSize / 2,
      cy - srcSize / 2,
      srcSize,
      srcSize,
      cx - radius,
      cy - radius,
      radius * 2,
      radius * 2
    );

    const slice = Math.max(2, Math.floor(radius / 18));
    const motionX = m.vx * scaleX * ms.strength * 1.6;
    const motionY = m.vy * scaleY * ms.strength * 1.6;
    ctx.globalAlpha = Math.min(0.42, 0.12 + ms.strength * 0.12);
    for (let y = -radius; y <= radius; y += slice) {
      const band = Math.sqrt(Math.max(0, 1 - (y * y) / (radius * radius)));
      const wobble = Math.sin(y * 0.04 + performance.now() * 0.008) * ms.strength * band * 5;
      const sx = cx - radius;
      const sy = cy + y;
      const sw = radius * 2;
      const sh = slice;
      const dx = sx + motionX * band + wobble;
      const dy = sy + motionY * band;
      ctx.drawImage(copy, sx, sy, sw, sh, dx, dy, sw, sh);
    }

    ctx.restore();
    return true;
  }, []);

  /** Grid-based displacement warp for non-cell (direct-source / effect) modes. */
  const applyProxyWarp = useCallback((
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    scaleX: number,
    scaleY: number
  ): boolean => {
    const proxy = proxyFieldRef.current;
    if (!proxy) return false;
    const ms = stateRef.current.mouse;
    const m = mouseRef.current;
    if (!ms.enabled) return false;

    const cw = proxy.cellWidth * scaleX;
    const ch = proxy.cellHeight * scaleY;
    const pointerRadiusPx = ms.radius * Math.max(scaleX, scaleY) + Math.max(cw, ch) * 1.7;
    const cx = m.x * scaleX;
    const cy = m.y * scaleY;
    const pointerRange2 = pointerRadiusPx * pointerRadiusPx;
    const dispThreshold2 = 0.08 * 0.08;

    let shouldWarp = false;
    for (let i = 0; i < proxy.points.length; i++) {
      const p = proxy.points[i];
      const ddx = (p.x - p.ox) * scaleX;
      const ddy = (p.y - p.oy) * scaleY;
      if (ddx * ddx + ddy * ddy > dispThreshold2) {
        shouldWarp = true;
        break;
      }
      if (m.inside || m.pulse > 0) {
        const pdx = p.x * scaleX - cx;
        const pdy = p.y * scaleY - cy;
        if (pdx * pdx + pdy * pdy < pointerRange2) {
          shouldWarp = true;
          break;
        }
      }
    }
    if (!shouldWarp) return false;

    let copy = warpCanvasRef.current;
    if (!copy) {
      copy = document.createElement("canvas");
      warpCanvasRef.current = copy;
    }
    if (copy.width !== canvas.width || copy.height !== canvas.height) {
      copy.width = canvas.width;
      copy.height = canvas.height;
    }
    const cctx = copy.getContext("2d")!;
    cctx.setTransform(1, 0, 0, 1, 0, 0);
    cctx.drawImage(canvas, 0, 0);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(copy, 0, 0);

    const minX = cx - pointerRadiusPx;
    const maxX = cx + pointerRadiusPx;
    const minY = cy - pointerRadiusPx;
    const maxY = cy + pointerRadiusPx;

    ctx.beginPath();
    ctx.rect(Math.max(0, minX), Math.max(0, minY), Math.min(canvas.width, maxX) - Math.max(0, minX), Math.min(canvas.height, maxY) - Math.max(0, minY));
    ctx.clip();
    ctx.globalAlpha = 0.96;

    for (let i = 0; i < proxy.points.length; i++) {
      const p = proxy.points[i];
      const pdx = p.x * scaleX - cx;
      const pdy = p.y * scaleY - cy;
      const nearPointer = pdx * pdx + pdy * pdy < pointerRange2;
      const mdx = (p.x - p.ox) * scaleX;
      const mdy = (p.y - p.oy) * scaleY;
      const moved = mdx * mdx + mdy * mdy > dispThreshold2;
      if (!nearPointer && !moved) continue;
      const sx = Math.max(0, Math.min(canvas.width - cw, p.ox * scaleX - cw * 0.5));
      const sy = Math.max(0, Math.min(canvas.height - ch, p.oy * scaleY - ch * 0.5));
      const dx = p.x * scaleX - cw * 0.5;
      const dy = p.y * scaleY - ch * 0.5;
      ctx.drawImage(copy, sx, sy, cw, ch, dx, dy, cw + 1, ch + 1);
    }

    ctx.restore();
    return true;
  }, []);

  /** Final-pass brightness/saturation/hue/luminance/opacity applied after every renderer and warp. */
  const applyOutputAdjustments = useCallback((
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) => {
    const out = stateRef.current.output;
    const needsFilter =
      out.brightness !== 1 ||
      out.saturation !== 1 ||
      out.hue !== 0 ||
      out.luminance !== 1 ||
      out.opacity !== 1;
    if (!needsFilter) return;

    let copy = outputCanvasRef.current;
    if (!copy) {
      copy = document.createElement("canvas");
      outputCanvasRef.current = copy;
    }
    if (copy.width !== canvas.width || copy.height !== canvas.height) {
      copy.width = canvas.width;
      copy.height = canvas.height;
    }

    const cctx = copy.getContext("2d", { willReadFrequently: true })!;
    cctx.setTransform(1, 0, 0, 1, 0, 0);
    cctx.globalAlpha = 1;
    cctx.globalCompositeOperation = "source-over";
    cctx.clearRect(0, 0, copy.width, copy.height);

    // Bake brightness / saturation / hue into the offscreen copy so the CSS
    // filter is applied in a plain drawImage call (most reliable path across
    // browsers). Applying ctx.filter on the main canvas while using a
    // non-source-over composite is unreliable — silently ignored on iOS Safari
    // < 18 — so we never set ctx.filter on the main context.
    const hasColorFilter = out.brightness !== 1 || out.saturation !== 1 || out.hue !== 0;
    cctx.filter = hasColorFilter
      ? `brightness(${out.brightness}) saturate(${out.saturation}) hue-rotate(${out.hue}deg)`
      : "none";
    cctx.drawImage(canvas, 0, 0);
    cctx.filter = "none";

    // Luminance pass on the already color-filtered copy.
    if (out.luminance !== 1) {
      const img = cctx.getImageData(0, 0, copy.width, copy.height);
      const data = img.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        const nextY = Math.max(0, Math.min(255, y * out.luminance));
        const factor = y > 0 ? nextY / y : out.luminance;
        data[i] = Math.max(0, Math.min(255, r * factor));
        data[i + 1] = Math.max(0, Math.min(255, g * factor));
        data[i + 2] = Math.max(0, Math.min(255, b * factor));
      }
      cctx.putImageData(img, 0, 0);
    }

    // Blit the fully-processed copy back using only globalAlpha for opacity.
    // No filter on the main ctx, no "copy" composite — plain source-over after
    // clearing is equivalent and works everywhere.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = "none";
    ctx.globalAlpha = Math.max(0, Math.min(1, out.opacity));
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(copy, 0, 0);
    ctx.restore();
  }, []);

  /** Single-frame draw: set transform, dispatch renderer, apply warp and output adjustments. */
  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = sizeRef.current;
    const scaleX = canvas.width / width;
    const scaleY = canvas.height / height;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

    const rc: RenderContext = {
      ctx,
      cells: cellsRef.current,
      width,
      height,
      dims: dimsRef.current,
      state: stateRef.current,
      time,
      source: activeSourceRef.current,
      geometry: geometryRef.current,
    };

    const s = stateRef.current;
    const isCellMode = CELL_MODES.has(s.mode);
    if (isCellMode && cellsRef.current.length === 0) {
      paintBackground(ctx, s, width, height);
      return;
    }
    render(rc);
    if (!isCellMode) {
      applyProxyWarp(ctx, canvas, scaleX, scaleY);
    } else {
      applyMouseWarp(ctx, canvas, scaleX, scaleY);
    }
    applyOutputAdjustments(ctx, canvas);

    // Composite additional layers
    const layers = stateRef.current.layers ?? [];
    const canvasMap = layerCanvasMapRef.current;
    // Clean up stale canvases
    for (const key of Array.from(canvasMap.keys())) {
      if (!layers.find(l => l.id === key)) canvasMap.delete(key);
    }
    for (const layer of layers) {
      let offscreen = canvasMap.get(layer.id);
      if (!offscreen) {
        offscreen = document.createElement("canvas");
        canvasMap.set(layer.id, offscreen);
      }
      if (offscreen.width !== canvas.width || offscreen.height !== canvas.height) {
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
      }
      const octx = offscreen.getContext("2d")!;
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.clearRect(0, 0, offscreen.width, offscreen.height);
      octx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

      // Build cells for cell-mode layers
      let layerCells: Cell[] = [];
      let layerDims: GridDims = dimsRef.current;
      const src = activeSourceRef.current;
      if (CELL_MODES.has(layer.visual.mode) && src) {
        const cellMode = layer.visual.mode as "ascii" | "pixels" | "dots" | "mosaic";
        const params =
          cellMode === "ascii" ? { density: layer.visual.ascii.density, charAspect: layer.visual.ascii.charAspect }
          : cellMode === "pixels" ? { cellSize: layer.visual.pixels.cellSize }
          : cellMode === "dots" ? { cellSize: layer.visual.dots.cellSize }
          : { cellSize: layer.visual.mosaic.cellSize };
        layerDims = computeGridDims(cellMode, width, height, params);
        const withEdges =
          cellMode === "ascii" &&
          (layer.visual.ascii.algorithm === "edge" || layer.visual.ascii.algorithm === "edge_directional");
        layerCells = buildCells(src, layerDims, withEdges);
      }

      // Force transparent background so blend modes work correctly
      const layerState: AppState = {
        ...stateRef.current,
        ...layer.visual,
        backgroundEnabled: false,
        timeline: stateRef.current.timeline,
        layers: [],
      };

      render({
        ctx: octx,
        cells: layerCells,
        width,
        height,
        dims: layerDims,
        state: layerState,
        time,
        source: src,
        geometry: geometryRef.current,
      });

      // Composite onto main canvas
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
      ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
      ctx.drawImage(offscreen, 0, 0);
      ctx.restore();
    }
  }, [applyMouseWarp, applyOutputAdjustments, applyProxyWarp, canvasRef]);

  const loop = useCallback((t: number) => {
    rafRef.current = null;
    if (startTRef.current === 0) startTRef.current = t;
    const dt = lastTRef.current ? Math.min(0.1, (t - lastTRef.current) / 1000) : 1 / 60;
    lastTRef.current = t;
    const time = (t - startTRef.current) / 1000;

    // Advance the active source (scene render, or just the current media) first,
    // so cell building and drawing both see this frame's raster.
    const sNow = stateRef.current;
    const isScene = sNow.sourceKind === "scene";
    resolveSource(time);

    if (needsRebuildRef.current) {
      const ok = rebuild();
      if (ok) needsRebuildRef.current = false;
    }

    if (!CELL_MODES.has(sNow.mode)) {
      const sz = sizeRef.current;
      if (sz.width > 0 && sz.height > 0) ensureProxyField(sz.width, sz.height);
    }

    // Per-frame resample for sources whose pixels change every frame: playing
    // video, and procedural scenes (whose raster is re-rendered each tick).
    const src = activeSourceRef.current;
    const liveSource =
      !!src &&
      (isScene || (isVideo(src) && src.readyState >= 2)); // HAVE_CURRENT_DATA
    if (liveSource && CELL_MODES.has(sNow.mode) && cellsRef.current.length > 0) {
      const withEdges =
        sNow.mode === "ascii" &&
        (sNow.ascii.algorithm === "edge" || sNow.ascii.algorithm === "edge_directional");
      resampleCells(src!, cellsRef.current, dimsRef.current, withEdges);
    }

    const moved = CELL_MODES.has(sNow.mode) ? stepPhysics(dt) : stepProxyPhysics(dt);
    draw(time);

    const s = stateRef.current;
    const m = mouseRef.current;
    // Keep ticking when mode animation or color cycling are enabled.
    const videoActive =
      !!mediaRef.current &&
      isVideo(mediaRef.current!) &&
      !(mediaRef.current as HTMLVideoElement).paused &&
      !(mediaRef.current as HTMLVideoElement).ended;
    const animated =
      s.mode === "ascii" ? (s.ascii.color.animated || !!s.ascii.color.cycleColors) :
      s.mode === "pixels" ? (s.pixels.color.animated || !!s.pixels.color.cycleColors) :
      s.mode === "dots" ? (s.dots.color.animated || !!s.dots.color.cycleColors) :
      s.mode === "mosaic" ? (s.mosaic.color.animated || !!s.mosaic.color.cycleColors) :
      s.mode === "blurred" ? (s.blurred.color.animated || !!s.blurred.color.cycleColors) :
      s.mode === "black" ? (s.black.color.animated || !!s.black.color.cycleColors) :
      s.mode === "transparent" ? (s.transparent.color.animated || !!s.transparent.color.cycleColors) :
      EFFECT_MODES.has(s.mode) ? (s.effect.color.animated || !!s.effect.color.cycleColors) :
      false;
    const mouseActive =
      s.mouse.enabled &&
      (m.inside ||
        m.pulse > 0 ||
        Math.abs(m.vx) > 0.05 ||
        Math.abs(m.vy) > 0.05);
    const stillNeeded =
      needsRebuildRef.current ||
      moved ||
      animated ||
      videoActive ||
      // A procedural scene is animated by definition — it must keep ticking.
      isScene ||
      mouseActive;

    if (stillNeeded) requestFrame();
  }, [draw, rebuild, requestFrame, resolveSource, stepPhysics, stepProxyPhysics, ensureProxyField]);

  // Mouse handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const m = mouseRef.current;
      m.px = m.x;
      m.py = m.y;
      m.x = x;
      m.y = y;
      // velocity in pixels per frame (rough)
      m.vx = m.x - m.px;
      m.vy = m.y - m.py;
      m.inside = true;
      m.pulse = 6;
      requestFrame();
    };
    const onEnter = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const m = mouseRef.current;
      m.x = e.clientX - rect.left;
      m.y = e.clientY - rect.top;
      m.px = m.x;
      m.py = m.y;
      m.vx = 0;
      m.vy = 0;
      m.inside = true;
      requestFrame();
    };
    const onLeave = () => {
      const m = mouseRef.current;
      m.inside = false;
      m.vx = 0;
      m.vy = 0;
      requestFrame();
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerenter", onEnter);
    canvas.addEventListener("pointerleave", onLeave);
    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerenter", onEnter);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [canvasRef, requestFrame]);

  // Resize observation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => resize());
    ro.observe(container);
    resize();
    return () => ro.disconnect();
  }, [containerRef, resize]);

  // Media swap triggers re-fit and rebuild
  useEffect(() => {
    resize();
    needsRebuildRef.current = true;
    requestFrame();
  }, [media, resize, requestFrame]);

  // Render resolution change → resize backing store
  useEffect(() => {
    resize();
  }, [state.renderResolution, resize]);

  // State changes that require a grid rebuild
  useEffect(() => {
    needsRebuildRef.current = true;
    requestFrame();
  }, [
    state.mode,
    state.sourceKind,
    state.scene.id,
    state.ascii.density,
    state.ascii.charAspect,
    state.ascii.algorithm,
    state.pixels.cellSize,
    state.dots.cellSize,
    state.mosaic.cellSize,
    requestFrame,
  ]);

  // State changes that only need a redraw
  useEffect(() => {
    requestFrame();
  }, [state, requestFrame]);

  // Switching source kind re-fits the canvas (scene sources ignore media aspect).
  useEffect(() => {
    resize();
  }, [state.sourceKind, state.frameAspect, resize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      sceneHostRef.current?.dispose();
      sceneHostRef.current = null;
    };
  }, []);

  return {
    exportSnapshot: () => {
      if (cellsRef.current.length === 0) return null;
      return {
        cells: cellsRef.current,
        dims: dimsRef.current,
        width: sizeRef.current.width,
        height: sizeRef.current.height,
      };
    },

    resetForExport: () => {
      // Park the pointer far outside so no warp or spring force applies, and
      // settle every cell back onto its origin.
      const m = mouseRef.current;
      m.x = -99999; m.y = -99999; m.px = m.x; m.py = m.y;
      m.vx = 0; m.vy = 0; m.inside = false; m.pulse = 0;
      for (const c of cellsRef.current) {
        c.x = c.ox; c.y = c.oy; c.vx = 0; c.vy = 0;
      }
      const proxy = proxyFieldRef.current;
      if (proxy) {
        for (const p of proxy.points) {
          p.x = p.ox; p.y = p.oy; p.vx = 0; p.vy = 0;
        }
      }
      needsRebuildRef.current = true;
    },

    renderFrameAt: async (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const s = stateRef.current;

      // Imported video has to be seeked, and seeking is the one part of this
      // that is not frame-exact: browsers land on the nearest decodable frame.
      const media = mediaRef.current;
      if (s.sourceKind === "media" && media && isVideo(media)) {
        const target = Math.min(time, Math.max(0, (media.duration || 0) - 1e-3));
        if (Number.isFinite(target) && Math.abs(media.currentTime - target) > 1e-3) {
          await new Promise<void>((resolve) => {
            let settled = false;
            const done = () => {
              if (settled) return;
              settled = true;
              media.removeEventListener("seeked", done);
              resolve();
            };
            media.addEventListener("seeked", done);
            try { media.currentTime = target; } catch { done(); }
            // Never hang the export on a seek that does not fire.
            setTimeout(done, 400);
          });
        }
      }

      resolveSource(time);

      if (needsRebuildRef.current) {
        if (rebuild()) needsRebuildRef.current = false;
      }

      const src = activeSourceRef.current;
      if (
        src &&
        CELL_MODES.has(s.mode) &&
        cellsRef.current.length > 0
      ) {
        const withEdges =
          s.mode === "ascii" &&
          (s.ascii.algorithm === "edge" || s.ascii.algorithm === "edge_directional");
        resampleCells(src, cellsRef.current, dimsRef.current, withEdges);
      }

      // No physics step: an export must not depend on pointer history.
      draw(time);
      return true;
    },
  };
}
