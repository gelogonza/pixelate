import * as THREE from "three";
import { RenderContext } from "./types";
import { colorRgbFor } from "./color";
import { paintBackground } from "./background";

/**
 * Depth-buffered, surface-lit ASCII.
 *
 * Unlike every other mode here, this does not read a raster. It projects the
 * scene's 3D sample cloud into the character grid, keeps the nearest sample per
 * cell, lights it analytically from its surface normal, and chooses a glyph from
 * depth discontinuities, particle identity or a density ramp.
 *
 * The lighting and edge-classification maths follow Edward Jones's ASCII art
 * renderer (MIT, https://github.com/edwardjones7/ascii-art), specifically the
 * rasterize() and edge_chars() routines in butterfly/butterfly.py. The surface
 * luminance term, the 0.28/1.8 edge thresholds, the 22.5/67.5/112.5 gradient
 * buckets and the depth-of-field falloff are his.
 */

const GLITCH_CHARS = "01<>{}[]#$%&*+=?!ABXZ";

export const GEOMETRY_CHAR_RAMPS: Record<string, string> = {
  classic: ".:;=+*xo%#&@",
  detailed:
    " .`^\",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  minimal: ".:+*#@",
  blocks: " ░▒▓█",
  matrix: " ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ",
};

/** Per-cell buffers. Kept across frames so materialization timing persists. */
interface GridState {
  cols: number;
  rows: number;
  depth: Float32Array;
  lum: Float32Array;
  color: Float32Array;
  edge: Uint8Array;
  edgeChar: string[];
  flying: Uint8Array;
  pid: Int32Array;
  /** Time each cell first became lit, for the materialization glitch. */
  firstOn: Float32Array;
  /** Randomized per-cell settle delay so cells do not resolve in lockstep. */
  settle: Float32Array;
}

let grid: GridState | null = null;
let lastTime = -1;
let glowA: HTMLCanvasElement | null = null;
let glowB: HTMLCanvasElement | null = null;

function ensureGrid(cols: number, rows: number): GridState {
  if (grid && grid.cols === cols && grid.rows === rows) return grid;
  const n = cols * rows;
  const settle = new Float32Array(n);
  for (let i = 0; i < n; i++) settle[i] = 0.12 + Math.random() * 0.45;
  grid = {
    cols,
    rows,
    depth: new Float32Array(n),
    lum: new Float32Array(n),
    color: new Float32Array(n * 3),
    edge: new Uint8Array(n),
    edgeChar: new Array(n),
    flying: new Uint8Array(n),
    pid: new Int32Array(n),
    firstOn: new Float32Array(n).fill(Infinity),
    settle,
  };
  return grid;
}

const wp = new THREE.Vector3();
const vp = new THREE.Vector3();
const wn = new THREE.Vector3();

export function renderGeometryAscii(rc: RenderContext) {
  const { ctx, width, height, state, time } = rc;
  const g = state.geometryAscii;

  paintBackground(ctx, state, width, height);

  const cloud = rc.geometry?.cloud;
  const camera = rc.geometry?.camera;
  if (!cloud || !camera || cloud.positions.length === 0) return;

  // ---- 1. Cell grid ------------------------------------------------------
  const fontSize = Math.max(4, Math.round(g.fontSize));
  const cellW = Math.max(3, Math.round(fontSize * 0.6)); // monospace aspect
  const cellH = fontSize;
  const cols = Math.max(10, Math.floor(width / cellW));
  const rows = Math.max(10, Math.floor(height / cellH));
  const G = ensureGrid(cols, rows);

  // Looping back in time invalidates materialization history.
  if (lastTime > 0 && time < lastTime) G.firstOn.fill(Infinity);
  lastTime = time;

  G.depth.fill(-999);
  G.lum.fill(0);
  G.color.fill(0);
  G.edge.fill(0);
  G.flying.fill(0);
  G.pid.fill(0);

  // ---- 2. Camera and light ----------------------------------------------
  camera.updateMatrixWorld(true);
  const view = camera.matrixWorldInverse;
  const viewProj = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, view);
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(view);

  const lightDir = new THREE.Vector3(-0.45, 0.65, 0.85)
    .normalize()
    .transformDirection(view)
    .normalize();
  const half = new THREE.Vector3().addVectors(lightDir, new THREE.Vector3(0, 0, 1)).normalize();

  const { positions, normals, colors, ambientOcclusion, ids, flying, glow } = cloud;
  const count = positions.length / 3;

  const specPower = g.specularPower;
  const specInt = g.specularIntensity;
  const emit = g.emissionBoost;

  // ---- 3. Project, light and Z-buffer every sample ----------------------
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    wp.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
    vp.copy(wp).applyMatrix4(view);
    const viewZ = -vp.z;
    if (viewZ <= 0.1) continue; // behind the camera

    wp.applyMatrix4(viewProj);
    if (wp.x < -1.1 || wp.x > 1.1 || wp.y < -1.1 || wp.y > 1.1) continue;

    const c = Math.floor(((wp.x + 1) * 0.5 * width) / cellW);
    const r = Math.floor(((1 - wp.y) * 0.5 * height) / cellH);
    if (c < 0 || c >= cols || r < 0 || r >= rows) continue;

    const idx = r * cols + c;
    const depth = -viewZ;
    if (depth <= G.depth[idx]) continue; // a nearer sample already owns this cell

    wn.set(normals[i3], normals[i3 + 1], normals[i3 + 2])
      .applyMatrix3(normalMatrix)
      .normalize();
    let nx = wn.x, ny = wn.y, nz = wn.z;
    if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; } // face the camera
    const absNz = Math.abs(nz);

    const ao = ambientOcclusion ? ambientOcclusion[i] : 1;
    const glowAmt = glow ? glow[i] : 0;

    const diff = Math.max(0, nx * lightDir.x + ny * lightDir.y + nz * lightDir.z);
    const spec = Math.pow(Math.max(0, nx * half.x + ny * half.y + nz * half.z), specPower);

    // Distance falloff, standing in for depth of field.
    const dof = 0.55 + 0.45 * Math.max(0, Math.min(1, 1 - (viewZ - 3) / 7));

    const lum =
      (0.25 + 0.95 * diff + 0.3 * Math.pow(1 - absNz, 2)) * (0.25 + 0.75 * ao) + emit * glowAmt;

    const shift = Math.pow(1 - absNz, 2);
    const sheen = specInt * spec * ao;

    const cr = colors[i3], cg = colors[i3 + 1], cb = colors[i3 + 2];
    G.depth[idx] = depth;
    G.lum[idx] = Math.min(1, (lum * (0.35 + 0.65 * Math.max(cr, cg, cb)) + sheen) * dof);
    G.color[idx * 3] = Math.min(1, ((cr + shift * 0.22) * lum * 1.2 + sheen) * dof);
    G.color[idx * 3 + 1] = Math.min(1, ((cg - shift * 0.02) * lum * 1.2 + sheen) * dof);
    G.color[idx * 3 + 2] = Math.min(1, ((cb + shift * 0.1) * lum * 1.2 + sheen) * dof);
    G.flying[idx] = flying ? flying[i] : 0;
    G.pid[idx] = ids ? ids[i] : i % 10000;
  }

  // ---- 4. Directional edges from depth discontinuities -------------------
  if (g.directionalEdges) {
    const thr = g.edgeThreshold;
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const i = r * cols + c;
        if (G.lum[i] <= 0.03 || G.flying[i]) continue;

        const d = G.depth[i];
        const dR = G.depth[i + 1], dL = G.depth[i - 1];
        const dD = G.depth[i + cols], dU = G.depth[i - cols];
        const jump = Math.max(
          Math.abs(d - dR), Math.abs(d - dL),
          Math.abs(d - dD), Math.abs(d - dU)
        );
        const nearest = Math.max(dR, dL, dD, dU);

        // Only the near side of a silhouette gets a contour glyph.
        if (jump > thr && (jump > 1.8 || d >= nearest)) {
          G.edge[i] = 1;
          const gx = (dR - dL) / cellW;
          const gy = (dD - dU) / cellH;
          let a = ((Math.atan2(-gx, -gy) * 180) / Math.PI) % 180;
          if (a < 0) a += 180;
          G.edgeChar[i] =
            a < 22.5 || a >= 157.5 ? "-" : a < 67.5 ? "/" : a < 112.5 ? "|" : "\\";
        }
      }
    }
  }

  // ---- 5. Draw glyphs ----------------------------------------------------
  ctx.font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const ramp = GEOMETRY_CHAR_RAMPS[g.charRamp] ?? GEOMETRY_CHAR_RAMPS.classic;
  const rampLen = ramp.length;
  const message = (g.embeddedMessage || "become").trim() + " ";
  const letters = message.replace(/\s+/g, "") || "x";

  const offsetX = (width - cols * cellW) / 2 + cellW / 2;
  const offsetY = (height - rows * cellH) / 2 + cellH / 2;
  const useSourceColor = g.color.mode === "source" && !g.color.cycleColors;
  const highlight = Math.max(0, Math.min(1, g.highlight ?? 0));

  // Per-cell background pass, drawn from the same lit colour as the glyph. On a
  // depth render this fills the surface between characters, so the form reads as
  // a solid lit object rather than as scattered text.
  if (highlight > 0) {
    ctx.save();
    ctx.globalAlpha = highlight;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (G.lum[i] <= 0.03) continue;
        const ir = Math.round(Math.min(255, G.color[i * 3] * 255));
        const ig = Math.round(Math.min(255, G.color[i * 3 + 1] * 255));
        const ib = Math.round(Math.min(255, G.color[i * 3 + 2] * 255));
        ctx.fillStyle = `rgb(${ir},${ig},${ib})`;
        ctx.fillRect(
          offsetX + c * cellW - cellW / 2,
          offsetY + r * cellH - cellH / 2,
          cellW + 0.5,
          cellH + 0.5
        );
      }
    }
    ctx.restore();
  }

  for (let r = 0; r < rows; r++) {
    const y = offsetY + r * cellH;
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const lum = G.lum[i];
      if (lum <= 0.03) {
        G.firstOn[i] = Infinity;
        continue;
      }
      if (G.firstOn[i] === Infinity) G.firstOn[i] = time;

      const glitching =
        g.glitchEffect && time - G.firstOn[i] < G.settle[i] * g.glitchDuration;
      const isEdge = G.edge[i] === 1;

      let ch: string;
      if (glitching) {
        const k = Math.floor((Math.sin(i * 93.1 + time * 37.4) * 0.5 + 0.5) * GLITCH_CHARS.length);
        ch = GLITCH_CHARS[k % GLITCH_CHARS.length];
      } else if (G.flying[i] === 1) {
        // Airborne samples keep one letter for their whole life, so particles
        // read as drifting text rather than flickering noise.
        ch = letters[Math.abs(G.pid[i]) % letters.length];
      } else if (isEdge && G.edgeChar[i]) {
        ch = G.edgeChar[i];
      } else if (lum > 0.82) {
        ch = message[i % message.length];
      } else {
        ch = ramp[Math.min(rampLen - 1, Math.floor(lum * rampLen))];
      }
      if (ch === " ") continue;

      let red = G.color[i * 3] * 255;
      let green = G.color[i * 3 + 1] * 255;
      let blue = G.color[i * 3 + 2] * 255;

      // Pixelate's shared colour modes recolour the lit surface, driven by the
      // computed luminance. "source" keeps the scene's own shaded colour.
      if (!useSourceColor) {
        const rgb = colorRgbFor(
          g.color,
          { ox: 0, oy: 0, x: 0, y: 0, vx: 0, vy: 0, r: red, g: green, b: blue, brightness: lum, edge: isEdge ? 1 : 0, edgeAngle: 0 },
          lum,
          time
        );
        red = rgb[0]; green = rgb[1]; blue = rgb[2];
      }

      if (isEdge) {
        const b = g.edgeBoost;
        red = Math.min(255, red * b + 20);
        green = Math.min(255, green * b + 30);
        blue = Math.min(255, blue * b + 56);
      }
      if (glitching) {
        red = red * 0.5 + 115;
        green = green * 0.5 + 115;
        blue = blue * 0.5 + 140;
      }

      // Quantize to 10-step buckets for a banded terminal feel.
      const ir = Math.round(Math.max(0, Math.min(255, red)) / 10) * 10;
      const ig = Math.round(Math.max(0, Math.min(255, green)) / 10) * 10;
      const ib = Math.round(Math.max(0, Math.min(255, blue)) / 10) * 10;
      if (ir === 0 && ig === 0 && ib === 0) continue;

      ctx.fillStyle = `rgb(${ir},${ig},${ib})`;
      ctx.fillText(ch, offsetX + c * cellW, y);
    }
  }

  // ---- 6. Two-scale additive bloom ---------------------------------------
  if (g.multiscaleGlow && g.glowIntensity > 0) {
    const canvas = ctx.canvas;
    const bw = canvas.width;
    const bh = canvas.height;
    if (bw > 20 && bh > 20) {
      if (!glowA) glowA = document.createElement("canvas");
      if (!glowB) glowB = document.createElement("canvas");

      const w1 = Math.max(1, Math.floor(bw / 5));
      const h1 = Math.max(1, Math.floor(bh / 5));
      glowA.width = w1; glowA.height = h1;
      glowA.getContext("2d")!.drawImage(canvas, 0, 0, w1, h1);

      const w2 = Math.max(1, Math.floor(bw / 18));
      const h2 = Math.max(1, Math.floor(bh / 18));
      glowB.width = w2; glowB.height = h2;
      glowB.getContext("2d")!.drawImage(glowA, 0, 0, w2, h2);

      ctx.save();
      // Composite in backing-store space; the caller's transform is scaled.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.55 * g.glowIntensity;
      ctx.drawImage(glowA, 0, 0, bw, bh);
      ctx.globalAlpha = 0.45 * g.glowIntensity;
      ctx.drawImage(glowB, 0, 0, bw, bh);
      ctx.restore();
    }
  }
}

/** Raw shaded 3D — the scene's WebGL render blitted straight through. */
export function renderShaded(rc: RenderContext) {
  const { ctx, width, height, state, source } = rc;
  paintBackground(ctx, state, width, height);
  if (!source) return;
  const sw = (source as HTMLCanvasElement).width || width;
  const sh = (source as HTMLCanvasElement).height || height;
  const scale = Math.min(width / sw, height / sh);
  const dw = Math.max(1, sw * scale);
  const dh = Math.max(1, sh * scale);
  ctx.drawImage(source, (width - dw) * 0.5, (height - dh) * 0.5, dw, dh);
}
