import { RenderMode } from "@/lib/types";
import { RenderContext } from "./types";
import { colorRgbFor, rgbToCss } from "./color";
import { hexToRgb } from "@/lib/color";
import { paintBackground } from "./background";
import { drawSourceContain } from "./sourceColor";

type RGB = [number, number, number];

const clamp = (v: number, min = 0, max = 255) => Math.max(min, Math.min(max, v));
const lum = (r: number, g: number, b: number) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

function hash(n: number) {
  return Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    clamp(a[0] + (b[0] - a[0]) * t) | 0,
    clamp(a[1] + (b[1] - a[1]) * t) | 0,
    clamp(a[2] + (b[2] - a[2]) * t) | 0,
  ];
}

function readSource(rc: RenderContext): ImageData | null {
  const { source, width, height, state } = rc;
  if (!source) return null;
  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.floor(width));
  off.height = Math.max(1, Math.floor(height));
  const octx = off.getContext("2d", { willReadFrequently: true })!;
  octx.clearRect(0, 0, off.width, off.height);
  drawSourceContain(octx, source, width, height);
  return octx.getImageData(0, 0, off.width, off.height);
}

function colorFor(rc: RenderContext, r: number, g: number, b: number, v: number): RGB {
  return colorRgbFor(
    rc.state.effect.color,
    { ox: 0, oy: 0, x: 0, y: 0, vx: 0, vy: 0, r, g, b, brightness: v, edge: 0, edgeAngle: 0 },
    v,
    rc.time
  );
}

function applyEffectColorMode(rc: RenderContext, styled: RGB): RGB {
  const opts = rc.state.effect.color;
  // Keep the filter's native styled color for match-image, unless explicit color cycling is requested.
  if (opts.mode === "source" && !opts.cycleColors) return styled;
  const v = lum(styled[0], styled[1], styled[2]);
  return colorRgbFor(
    opts,
    {
      ox: 0, oy: 0, x: 0, y: 0, vx: 0, vy: 0,
      r: styled[0], g: styled[1], b: styled[2], brightness: v, edge: 0, edgeAngle: 0,
    },
    v,
    rc.time
  );
}

// Reusable offscreen canvas for blitting ImageData via drawImage so the
// canvas transform (DPR scale) is respected. putImageData ignores transforms,
// which causes content to appear only in the top-left on high-DPR displays.
let _blitCanvas: HTMLCanvasElement | null = null;
let _blitCtx: CanvasRenderingContext2D | null = null;

function blitImageData(rc: RenderContext, img: ImageData) {
  if (!_blitCanvas) {
    _blitCanvas = document.createElement("canvas");
    _blitCtx = _blitCanvas.getContext("2d")!;
  }
  if (_blitCanvas.width !== img.width || _blitCanvas.height !== img.height) {
    _blitCanvas.width = img.width;
    _blitCanvas.height = img.height;
  }
  _blitCtx!.putImageData(img, 0, 0);
  rc.ctx.drawImage(_blitCanvas, 0, 0, rc.width, rc.height);
}

function paintImageData(rc: RenderContext, img: ImageData, fn: (r: number, g: number, b: number, a: number, x: number, y: number) => RGB) {
  const data = img.data;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      const a = data[i + 3];
      if (a === 0) continue;
      const c = fn(data[i], data[i + 1], data[i + 2], a, x, y);
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = a;
    }
  }
  blitImageData(rc, img);
}

function drawBlocky(rc: RenderContext, img: ImageData, painter: (x: number, y: number, r: number, g: number, b: number, v: number, seed: number, size: number) => void) {
  const { ctx, width, height, state } = rc;
  const step = Math.max(3, state.effect.scale);
  paintBackground(ctx, state, width, height);
  for (let y = 0; y < img.height; y += step) {
    for (let x = 0; x < img.width; x += step) {
      const i = (Math.min(img.height - 1, y) * img.width + Math.min(img.width - 1, x)) * 4;
      const a = img.data[i + 3];
      if (a === 0) continue;
      const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
      painter(x + step / 2, y + step / 2, r, g, b, lum(r, g, b), hash(x * 31 + y * 131 + state.effect.seed), step);
    }
  }
}

function drawSourceWithFilter(rc: RenderContext, filter: string, alpha = 1) {
  const { ctx, width, height, state } = rc;
  const source = makeEffectSourceCanvas(rc) ?? rc.source;
  paintBackground(ctx, state, width, height);
  if (!source) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.filter = filter;
  ctx.drawImage(source, 0, 0, width, height);
  ctx.restore();
}

function thermal(v: number): RGB {
  if (v < 0.25) return mix([20, 20, 90], [0, 170, 255], v / 0.25);
  if (v < 0.5) return mix([0, 170, 255], [80, 255, 80], (v - 0.25) / 0.25);
  if (v < 0.75) return mix([80, 255, 80], [255, 210, 0], (v - 0.5) / 0.25);
  return mix([255, 210, 0], [255, 30, 20], (v - 0.75) / 0.25);
}

function renderThermalHeatwave(rc: RenderContext, img: ImageData, animateMode: boolean) {
  const { ctx, width, height, state, time } = rc;
  const e = state.effect;
  const w = img.width;
  const h = img.height;

  // Build a dedicated thermal false-color source first.
  const thermalCanvas = document.createElement("canvas");
  thermalCanvas.width = w;
  thermalCanvas.height = h;
  const tctx = thermalCanvas.getContext("2d", { willReadFrequently: true })!;
  const out = tctx.createImageData(w, h);
  const src = img.data;
  const dst = out.data;
  const contrast = 1 + e.intensity * 1.25;
  const noiseAmount = 0.1 + e.intensity * 0.2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = src[i + 3];
      if (a === 0) continue;
      const v0 = lum(src[i], src[i + 1], src[i + 2]);
      const grain = (hash(x * 17 + y * 31 + e.seed * 11 + time * 18) - 0.5) * noiseAmount;
      const v = Math.max(0, Math.min(1, (v0 - 0.5) * contrast + 0.5 + grain));
      const c = thermal(v);
      dst[i] = c[0];
      dst[i + 1] = c[1];
      dst[i + 2] = c[2];
      dst[i + 3] = a;
    }
  }
  tctx.putImageData(out, 0, 0);

  paintBackground(ctx, state, width, height);

  if (!animateMode) {
    // Static thermal mode: palette only, no shimmer distortion.
    ctx.drawImage(thermalCanvas, 0, 0, width, height);
    return;
  }

  // Heatwave pass: line-wise displacement for shimmer/refraction.
  const band = Math.max(2, Math.floor(Math.max(4, e.scale * 0.4)));
  const amp = Math.max(0.8, 1.8 + e.intensity * 6.5);
  const t = time * (1.4 + e.intensity * 2.1) + e.seed * 0.37;
  for (let y = 0; y < h; y += band) {
    const wave =
      Math.sin(y * 0.035 + t * 4.2) * amp +
      (hash(Math.floor(y / band) * 13 + Math.floor(t * 10) + e.seed * 7) - 0.5) * amp * 0.8;
    const sh = Math.min(band, h - y);
    ctx.drawImage(thermalCanvas, 0, y, w, sh, wave, y, w, sh);
  }

  // Add subtle emissive bloom when animated.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.12 + e.intensity * 0.18;
  ctx.filter = `blur(${Math.max(0.6, e.scale * 0.08)}px)`;
  ctx.drawImage(thermalCanvas, 0, 0, width, height);
  ctx.restore();
}

function renderHalftone(rc: RenderContext, img: ImageData, animateMode: boolean) {
  const { ctx, width, height, state } = rc;
  const step = Math.max(7, state.effect.scale);
  const channels: [number, number][] = [[0, 15], [1, -15], [2, 45], [3, 0]];
  const rotDrift = animateMode ? Math.sin(rc.time * 1.6) * 6 : 0;
  const pulse = animateMode ? 0.86 + 0.18 * (0.5 + 0.5 * Math.sin(rc.time * 2.4)) : 1;
  paintBackground(ctx, state, width, height);
  for (const [channel, rot] of channels) {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(((rot + rotDrift) * Math.PI) / 180);
    ctx.translate(-width / 2, -height / 2);
    for (let y = 0; y < img.height; y += step) {
      for (let x = 0; x < img.width; x += step) {
        const i = (Math.min(img.height - 1, y) * img.width + Math.min(img.width - 1, x)) * 4;
        if (img.data[i + 3] === 0) continue;
        const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
        const v = lum(r, g, b);
        const c = colorFor(rc, r, g, b, v);
        ctx.fillStyle = rgbToCss(c);
        const k = 1 - Math.max(r, g, b) / 255;
        const value = channel === 0 ? 1 - r / 255 : channel === 1 ? 1 - g / 255 : channel === 2 ? 1 - b / 255 : k;
        const rad = step * 0.45 * Math.max(0, value - state.effect.threshold * 0.5) * state.effect.intensity * pulse;
        if (rad > 0.4) {
          ctx.beginPath();
          ctx.arc(x, y, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }
}

function renderDither(rc: RenderContext, img: ImageData) {
  const data = img.data;
  const w = img.width;
  const h = img.height;
  const style = rc.state.effect.ditherStyle;
  const colorMode = rc.state.effect.color.mode;
  const thresholdBias = (rc.state.effect.threshold - 0.5) * 120;
  const intensity = Math.max(0.05, rc.state.effect.intensity);
  const levels = Math.max(2, Math.min(7, Math.round(2 + intensity * 4)));

  const tr = new Float32Array(w * h);
  const tg = new Float32Array(w * h);
  const tb = new Float32Array(w * h);
  const alpha = new Uint8ClampedArray(w * h);
  const singleBase =
    colorMode === "single"
      ? hexToRgb(rc.state.effect.color.color)
      : null;
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    alpha[i] = data[i * 4 + 3];
    const v = lum(r, g, b);
    const c =
      singleBase
        ? ([
            singleBase[0] * v,
            singleBase[1] * v,
            singleBase[2] * v,
          ] as RGB)
        : colorFor(rc, r, g, b, v);
    tr[i] = c[0];
    tg[i] = c[1];
    tb[i] = c[2];
  }

  const setPix = (i: number, r: number, g: number, b: number) => {
    data[i * 4] = clamp(r);
    data[i * 4 + 1] = clamp(g);
    data[i * 4 + 2] = clamp(b);
    data[i * 4 + 3] = alpha[i];
  };

  if (style === "bayer" || style === "ordered") {
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const quantOrdered = (v: number, t: number) => {
      const jitter = (t - 0.5) * 255 * intensity * 0.95;
      const biased = clamp(v + thresholdBias + jitter);
      return Math.round((biased / 255) * levels) * (255 / levels);
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (alpha[i] === 0) continue;
        const t = (bayer[(y % 4) * 4 + (x % 4)] + 0.5) / 16;
        setPix(
          i,
          quantOrdered(tr[i], t),
          quantOrdered(tg[i], t),
          quantOrdered(tb[i], t)
        );
      }
    }
    blitImageData(rc, img);
    return;
  }

  const diffuse = style === "atkinson"
    ? [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]]
    : style === "sierra"
    ? [[1, 0, 5 / 32], [2, 0, 3 / 32], [-2, 1, 2 / 32], [-1, 1, 4 / 32], [0, 1, 5 / 32], [1, 1, 4 / 32], [2, 1, 2 / 32], [-1, 2, 2 / 32], [0, 2, 3 / 32], [1, 2, 2 / 32]]
    : [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]];

  const quant = (v: number) => {
    const t = clamp(v + thresholdBias);
    return Math.round((t / 255) * levels) * (255 / levels);
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (alpha[i] === 0) continue;
      const or = tr[i], og = tg[i], ob = tb[i];
      const nr = quant(or), ng = quant(og), nb = quant(ob);
      setPix(i, nr, ng, nb);
      const er = (or - nr) * intensity;
      const eg = (og - ng) * intensity;
      const eb = (ob - nb) * intensity;
      for (const [dx, dy, f] of diffuse) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const ni = ny * w + nx;
          if (alpha[ni] === 0) continue;
          tr[ni] += er * f;
          tg[ni] += eg * f;
          tb[ni] += eb * f;
        }
      }
    }
  }
  blitImageData(rc, img);
}

function renderGlyphs(rc: RenderContext, img: ImageData, mode: RenderMode) {
  const { ctx, width, height, state, time } = rc;
  const step = Math.max(8, state.effect.scale);
  const text = mode === "emoji" ? state.effect.emojiSet || "🌑🌒🌓🌔🌕" : mode === "binary" ? "01" : state.effect.text || "PIXELATE";
  paintBackground(ctx, state, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${step * (mode === "emoji" ? 0.9 : 0.75)}px ui-monospace, monospace`;
  let n = 0;
  const glyphs = Array.from(text.length > 0 ? text : "PIXELATE");
  const inset = step * 0.62;
  for (let y = inset; y < img.height - inset * 0.35; y += step) {
    for (let x = inset; x < img.width - inset * 0.35; x += step) {
      const i = ((y | 0) * img.width + (x | 0)) * 4;
      if (img.data[i + 3] === 0) continue;
      const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
      const v = lum(r, g, b);
      if ((mode === "text_fill" || mode === "word_cloud" || mode === "matrix_rain") && v < state.effect.threshold) continue;
      let idx = 0;
      if (mode === "binary") {
        if (state.effect.color.animated) {
          const speed = Math.max(0.3, state.effect.color.animationSpeed * 0.35);
          const waveA = Math.sin(time * speed * 2.6 + x * 0.05 + y * 0.031);
          const waveB = Math.cos(time * speed * 1.9 + x * 0.017 - y * 0.043);
          const wave = waveA * 0.6 + waveB * 0.4;
          const drift = wave * (0.2 + state.effect.intensity * 0.2);
          const threshold = Math.max(0, Math.min(1, state.effect.threshold + drift));
          idx = v > threshold ? 1 : 0;
        } else {
          idx = v > state.effect.threshold ? 1 : 0;
        }
      } else if (mode === "matrix_rain") {
        idx = Math.floor(hash(x + y * 17 + time * 20) * glyphs.length) % glyphs.length;
      } else if (mode === "word_cloud" || mode === "text_fill") {
        idx = n % glyphs.length;
        n += 1;
      } else {
        idx = Math.floor(v * glyphs.length) % glyphs.length;
      }
      const c = colorFor(rc, r, g, b, v);
      ctx.fillStyle = rgbToCss(c);
      const yy = mode === "matrix_rain" ? (y + time * step * (1 + hash(x) * 5)) % height : y;
      ctx.fillText(glyphs[idx] ?? glyphs[n++ % glyphs.length], x, yy);
    }
  }
}

function renderLines(rc: RenderContext, img: ImageData, mode: RenderMode) {
  const { ctx, width, height, state, time } = rc;
  const step = Math.max(8, state.effect.scale);
  paintBackground(ctx, state, width, height);
  ctx.lineCap = "round";
  for (let y = step; y < img.height - step; y += step) {
    for (let x = step; x < img.width - step; x += step) {
      const i = (y * img.width + x) * 4;
      if (img.data[i + 3] === 0) continue;
      const v = lum(img.data[i], img.data[i + 1], img.data[i + 2]);
      const right = ((y * img.width + Math.min(img.width - 1, x + step)) * 4);
      const down = ((Math.min(img.height - 1, y + step) * img.width + x) * 4);
      const gx = lum(img.data[right], img.data[right + 1], img.data[right + 2]) - v;
      const gy = lum(img.data[down], img.data[down + 1], img.data[down + 2]) - v;
      const c = colorFor(rc, img.data[i], img.data[i + 1], img.data[i + 2], v);
      ctx.strokeStyle = rgbToCss(c);
      ctx.lineWidth = mode === "magnetic_field" ? 1.1 : Math.max(0.6, (1 - v) * 2.5);
      ctx.beginPath();
      if (mode === "cross_hatching") {
        const pulse = 0.5 + 0.5 * Math.sin(time * 2.2 + x * 0.01 + y * 0.009);
        const vv = Math.max(0, Math.min(1, v + (pulse - 0.5) * 0.12));
        const count = vv < 0.25 ? 4 : vv < 0.45 ? 3 : vv < 0.65 ? 2 : vv < 0.82 ? 1 : 0;
        for (let k = 0; k < count; k++) {
          const a = (k * Math.PI) / 4 + Math.sin(time * 1.9 + (x + y) * 0.004 + k) * 0.12;
          const dx = Math.cos(a) * step * 0.5;
          const dy = Math.sin(a) * step * 0.5;
          ctx.moveTo(x - dx, y - dy);
          ctx.lineTo(x + dx, y + dy);
        }
      } else {
        const a =
          mode === "flow_field" ? Math.atan2(gy, gx) + Math.PI / 2 + Math.sin(time + x * 0.01) * 0.5 :
          mode === "magnetic_field" ? Math.atan2(gy, gx) + Math.sin((x + y) * 0.02 + time) :
          Math.round(v * 8) * 0.6;
        const len = step * (0.6 + state.effect.intensity);
        ctx.moveTo(x - Math.cos(a) * len, y - Math.sin(a) * len);
        ctx.quadraticCurveTo(x, y, x + Math.cos(a + gx) * len, y + Math.sin(a + gy) * len);
      }
      ctx.stroke();
    }
  }
}

function makeEffectSourceCanvas(rc: RenderContext): HTMLCanvasElement | null {
  const { source, width, height, state, time } = rc;
  if (!source) return null;
  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.floor(width));
  off.height = Math.max(1, Math.floor(height));
  const octx = off.getContext("2d", { willReadFrequently: true })!;
  octx.clearRect(0, 0, off.width, off.height);
  drawSourceContain(octx, source, width, height);

  if (state.effect.color.mode !== "source" || state.effect.color.cycleColors) {
    const img = octx.getImageData(0, 0, off.width, off.height);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const v = lum(r, g, b);
      const c = colorFor(rc, r, g, b, v);
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
  }

  return off;
}

interface LiquidState {
  cols: number;
  rows: number;
  u: Float32Array;
  v: Float32Array;
  uPrev: Float32Array;
  vPrev: Float32Array;
  p: Float32Array;
  div: Float32Array;
  lastTime: number;
  seed: number;
}

let liquidState: LiquidState | null = null;

function fIdx(x: number, y: number, cols: number) {
  return y * cols + x;
}

function sampleField(f: Float32Array, x: number, y: number, cols: number, rows: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(cols - 1, Math.max(0, x0 + 1));
  const y1 = Math.min(rows - 1, Math.max(0, y0 + 1));
  const xx0 = Math.min(cols - 1, Math.max(0, x0));
  const yy0 = Math.min(rows - 1, Math.max(0, y0));
  const tx = x - x0;
  const ty = y - y0;
  const a = f[fIdx(xx0, yy0, cols)];
  const b = f[fIdx(x1, yy0, cols)];
  const c = f[fIdx(xx0, y1, cols)];
  const d = f[fIdx(x1, y1, cols)];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

function swap(a: Float32Array, b: Float32Array) {
  const len = a.length;
  for (let i = 0; i < len; i++) {
    const t = a[i];
    a[i] = b[i];
    b[i] = t;
  }
}

function diffuseField(dst: Float32Array, src: Float32Array, cols: number, rows: number, alpha: number, iters = 8) {
  dst.set(src);
  const inv = 1 / (1 + 4 * alpha);
  for (let k = 0; k < iters; k++) {
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const i = fIdx(x, y, cols);
        dst[i] =
          (src[i] +
            alpha * (dst[fIdx(x - 1, y, cols)] + dst[fIdx(x + 1, y, cols)] + dst[fIdx(x, y - 1, cols)] + dst[fIdx(x, y + 1, cols)])) *
          inv;
      }
    }
  }
}

function projectVelocity(state: LiquidState, cols: number, rows: number, iters = 12) {
  const { u, v, p, div } = state;
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const i = fIdx(x, y, cols);
      div[i] = -0.5 * (
        u[fIdx(x + 1, y, cols)] - u[fIdx(x - 1, y, cols)] +
        v[fIdx(x, y + 1, cols)] - v[fIdx(x, y - 1, cols)]
      );
      p[i] = 0;
    }
  }
  for (let k = 0; k < iters; k++) {
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const i = fIdx(x, y, cols);
        p[i] = (div[i] + p[fIdx(x - 1, y, cols)] + p[fIdx(x + 1, y, cols)] + p[fIdx(x, y - 1, cols)] + p[fIdx(x, y + 1, cols)]) * 0.25;
      }
    }
  }
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const i = fIdx(x, y, cols);
      u[i] -= 0.5 * (p[fIdx(x + 1, y, cols)] - p[fIdx(x - 1, y, cols)]);
      v[i] -= 0.5 * (p[fIdx(x, y + 1, cols)] - p[fIdx(x, y - 1, cols)]);
    }
  }
}

function advectField(dst: Float32Array, src: Float32Array, u: Float32Array, v: Float32Array, cols: number, rows: number, dt: number) {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = fIdx(x, y, cols);
      const bx = x - u[i] * dt;
      const by = y - v[i] * dt;
      dst[i] = sampleField(src, bx, by, cols, rows);
    }
  }
}

function ensureLiquidState(width: number, height: number, scale: number, seed: number): LiquidState {
  const cell = Math.max(8, Math.floor(scale * 0.75));
  const cols = Math.max(18, Math.floor(width / cell));
  const rows = Math.max(12, Math.floor(height / cell));
  if (liquidState && liquidState.cols === cols && liquidState.rows === rows && liquidState.seed === seed) return liquidState;
  const size = cols * rows;
  liquidState = {
    cols,
    rows,
    u: new Float32Array(size),
    v: new Float32Array(size),
    uPrev: new Float32Array(size),
    vPrev: new Float32Array(size),
    p: new Float32Array(size),
    div: new Float32Array(size),
    lastTime: 0,
    seed,
  };
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = fIdx(x, y, cols);
      const n = hash(x * 19 + y * 41 + seed * 13);
      const a = n * Math.PI * 2;
      liquidState.u[i] = Math.cos(a) * 0.25;
      liquidState.v[i] = Math.sin(a) * 0.25;
    }
  }
  return liquidState;
}

function renderLiquid(rc: RenderContext, animateMode: boolean) {
  const { ctx, width, height, state, time } = rc;
  const e = state.effect;
  const src = makeEffectSourceCanvas(rc);
  if (!src) return;

  paintBackground(ctx, state, width, height);
  const intensity = Math.max(0, Math.min(1, e.intensity));
  const flow = ensureLiquidState(width, height, e.scale, e.seed);
  const { cols, rows, u, v, uPrev, vPrev } = flow;

  if (animateMode) {
    const dtSeconds = flow.lastTime === 0 ? 1 / 60 : Math.max(1 / 180, Math.min(1 / 18, time - flow.lastTime));
    flow.lastTime = time;
    const dt = dtSeconds * 60;

    const swirl = 0.16 + intensity * 0.56;
    const turbulence = 0.04 + intensity * 0.18;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = fIdx(x, y, cols);
        const a = (x * 0.13 + y * 0.09 + time * (0.55 + intensity) + e.seed * 0.2);
        const b = (x * 0.07 - y * 0.11 - time * 0.42 + e.seed * 0.17);
        const targetU = Math.sin(a) * swirl + Math.cos(b) * turbulence;
        const targetV = Math.cos(a * 0.9) * swirl - Math.sin(b * 1.2) * turbulence;
        u[i] += (targetU - u[i]) * 0.08;
        v[i] += (targetV - v[i]) * 0.08;
      }
    }

    // Stable fluids style step: diffuse -> project -> advect -> project.
    diffuseField(uPrev, u, cols, rows, 0.08 + intensity * 0.12);
    diffuseField(vPrev, v, cols, rows, 0.08 + intensity * 0.12);
    swap(u, uPrev);
    swap(v, vPrev);
    projectVelocity(flow, cols, rows);
    advectField(uPrev, u, u, v, cols, rows, dt * (0.75 + intensity * 0.65));
    advectField(vPrev, v, u, v, cols, rows, dt * (0.75 + intensity * 0.65));
    swap(u, uPrev);
    swap(v, vPrev);
    projectVelocity(flow, cols, rows);
  } else {
    flow.lastTime = 0;
  }

  const cellW = width / cols;
  const cellH = height / rows;
  const disp = (0.7 + intensity * 3.6) * Math.min(cellW, cellH);

  // Per-pixel displacement: sample the velocity field with bilinear interpolation
  // so there are no visible tile boundaries.
  const srcCtx = src.getContext("2d", { willReadFrequently: true })!;
  const srcData = srcCtx.getImageData(0, 0, src.width, src.height);
  const iw = src.width;
  const ih = src.height;
  const outData = new ImageData(iw, ih);

  for (let py = 0; py < ih; py++) {
    for (let px = 0; px < iw; px++) {
      const gx = (px / iw) * cols;
      const gy = (py / ih) * rows;
      const ux = sampleField(u, gx, gy, cols, rows);
      const vy = sampleField(v, gx, gy, cols, rows);
      const sx = clamp(Math.round(px - ux * disp), 0, iw - 1);
      const sy = clamp(Math.round(py - vy * disp), 0, ih - 1);
      const si = (sy * iw + sx) * 4;
      const oi = (py * iw + px) * 4;
      outData.data[oi]     = srcData.data[si];
      outData.data[oi + 1] = srcData.data[si + 1];
      outData.data[oi + 2] = srcData.data[si + 2];
      outData.data[oi + 3] = srcData.data[si + 3];
    }
  }

  const outCanvas = document.createElement("canvas");
  outCanvas.width = iw;
  outCanvas.height = ih;
  outCanvas.getContext("2d")!.putImageData(outData, 0, 0);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.filter = `blur(${intensity * 0.45}px) saturate(${1.08 + intensity * 0.42}) contrast(${1.03 + intensity * 0.14})`;
  ctx.drawImage(outCanvas, 0, 0, width, height);
  ctx.restore();

  // Caustic highlights from local velocity divergence.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = `rgba(185,240,255,${0.06 + intensity * 0.22})`;
  ctx.lineWidth = Math.max(0.7, Math.min(cellW, cellH) * 0.14);
  for (let y = 1; y < rows - 1; y++) {
    ctx.beginPath();
    for (let x = 1; x < cols - 1; x++) {
      const i = fIdx(x, y, cols);
      const div =
        (u[fIdx(x + 1, y, cols)] - u[fIdx(x - 1, y, cols)] +
          v[fIdx(x, y + 1, cols)] - v[fIdx(x, y - 1, cols)]) * 0.5;
      const xx = x * cellW;
      const yy = y * cellH + div * cellH * 0.9;
      if (x === 1) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function renderEffect(rc: RenderContext) {
  const img = readSource(rc);
  if (!img) return;
  const { ctx, width, height, state, mode } = { ...rc, mode: rc.state.mode };
  const e = state.effect;
  const modeName = mode as RenderMode;
  const modeAnimated = state.effect.color.animated;
  const speedScale = 0.35 + state.effect.color.animationSpeed * 0.18;
  const modeTime = modeAnimated ? rc.time * speedScale : 0;
  const trc: RenderContext = modeTime === rc.time ? rc : { ...rc, time: modeTime };

  if (modeName === "watercolor") {
    const w1 = modeAnimated ? 0.82 + 0.28 * (0.5 + 0.5 * Math.sin(trc.time * 1.8)) : 1;
    const w2 = modeAnimated ? 0.8 + 0.34 * (0.5 + 0.5 * Math.cos(trc.time * 1.2)) : 1;
    drawSourceWithFilter(trc, `blur(${e.scale * 0.18 * w1}px) saturate(${1 + e.intensity * 0.45})`, 0.88);
    drawSourceWithFilter(trc, `blur(${e.scale * 0.55 * w2}px) contrast(${0.8 + e.intensity * 0.2})`, 0.38);
    return;
  }
  if (modeName === "liquid") {
    renderLiquid(trc, modeAnimated);
    return;
  }
  if (modeName === "noise_displacement") {
    paintImageData(trc, img, (r, g, b, a, x, y) => {
      const n = hash(Math.floor(x / e.scale) * 17 + Math.floor(y / e.scale) * 37 + e.seed + trc.time);
      const t = clamp((n - 0.5) * e.intensity * 100, -60, 60);
      return colorFor(trc, clamp(r + t), clamp(g + t * 0.5), clamp(b - t), lum(r, g, b));
    });
    return;
  }
  if (modeName === "thermal") {
    renderThermalHeatwave(trc, img, modeAnimated);
    return;
  }
  if (modeName === "night_camera") {
    const scanStep = Math.max(2, Math.floor(e.scale * 0.3));
    const iw = img.width;
    const ih = img.height;
    const cx = iw * 0.5;
    const cy = ih * 0.5;
    const maxD = Math.hypot(cx, cy);
    paintImageData(trc, img, (r, g, b, _a, x, y) => {
      const v = lum(r, g, b);
      const amp = Math.min(1, v * (0.5 + e.intensity * 1.5));
      const out: RGB =
        amp < 0.45
          ? mix([0, 0, 0], [8, 140, 18], amp / 0.45)
          : mix([8, 140, 18], [90, 255, 60], (amp - 0.45) / 0.55);
      const scan = scanStep > 0 && y % scanStep === 0 ? 0.72 : 1.0;
      const vignette = 1 - (Math.hypot(x - cx, y - cy) / maxD) ** 2 * 0.55;
      const noise = (hash(x * 19 + y * 37 + e.seed + Math.floor(trc.time * 8)) - 0.5) * 22;
      return [
        clamp(out[0] * scan * vignette + noise * 0.15),
        clamp(out[1] * scan * vignette + noise),
        clamp(out[2] * scan * vignette + noise * 0.25),
      ];
    });
    return;
  }
  if (modeName === "infrared" || modeName === "solarize" || modeName === "duotone" || modeName === "risograph") {
    const shadow = hexToRgb(e.shadowColor);
    const high = hexToRgb(e.highlightColor);
    const step = Math.max(1, Math.floor(e.scale * 0.33));
    const driftX = modeAnimated ? Math.sin(trc.time * 1.7) * step * 0.9 : 0;
    const driftY = modeAnimated ? Math.cos(trc.time * 1.3) * step * 0.9 : 0;
    const ox = ((e.seed * 7) % step) + driftX;
    const oy = ((e.seed * 11) % step) + driftY;
    paintImageData(trc, img, (r, g, b, _a, x, y) => {
      const sx = Math.min(img.width - 1, Math.floor((x + ox) / step) * step);
      const sy = Math.min(img.height - 1, Math.floor((y + oy) / step) * step);
      const si = (sy * img.width + sx) * 4;
      const rr = img.data[si];
      const gg = img.data[si + 1];
      const bb = img.data[si + 2];
      const v = lum(rr, gg, bb);
      const styled =
        modeName === "infrared" ? ([clamp(255 - gg), clamp(255 - bb * 0.4), clamp(255 - rr * 0.7)] as RGB) :
        modeName === "solarize" ? (v > e.threshold ? ([255 - rr, 255 - gg, 255 - bb] as RGB) : ([rr, gg, bb] as RGB)) :
        modeName === "risograph" ? (() => {
          const jitter = modeAnimated ? Math.sin(trc.time * 2 + x * 0.01 + y * 0.008) * 0.08 : 0;
          const vv = Math.max(0, Math.min(1, v + jitter));
          return mix(vv < 0.5 ? shadow : [230, 40, 90], high, Math.round(vv * 2) / 2);
        })() :
        mix(shadow, high, v);
      return applyEffectColorMode(trc, styled);
    });
    return;
  }
  if (modeName === "pixel_sort") {
    const data = img.data;
    const segBase = Math.max(8, Math.floor(e.scale) * 2);
    for (let y = 0; y < img.height; y++) {
      const pulse = modeAnimated ? 0.7 + 0.6 * (0.5 + 0.5 * Math.sin(trc.time * 1.6 + y * 0.02)) : 1;
      const seg = Math.max(6, Math.floor(segBase * pulse));
      const shift = modeAnimated ? Math.floor((0.5 + 0.5 * Math.sin(trc.time * 2.1 + y * 0.03)) * seg) : 0;
      for (let sx = -shift; sx < img.width; sx += seg) {
        const sx0 = Math.max(0, sx);
        const ex = Math.min(img.width, sx + seg);
        if (ex - sx0 < 2) continue;
        const row: number[][] = [];
        let avg = 0;
        for (let x = sx0; x < ex; x++) {
          const i = (y * img.width + x) * 4;
          row.push([data[i], data[i + 1], data[i + 2], data[i + 3]]);
          avg += lum(data[i], data[i + 1], data[i + 2]);
        }
        avg /= Math.max(1, ex - sx0);
        if (avg < e.threshold) continue;
        row.sort((a, b) => lum(a[0], a[1], a[2]) - lum(b[0], b[1], b[2]));
        const revSeed = hash(y * 17 + sx0 * 5 + e.seed + (modeAnimated ? Math.floor(trc.time * 12) : 0));
        const reverse = modeAnimated ? revSeed > 0.45 : revSeed > e.intensity;
        if (reverse) row.reverse();
        for (let x = sx0; x < ex; x++) {
          const i = (y * img.width + x) * 4;
          const p = row[x - sx0];
          data[i] = p[0]; data[i + 1] = p[1]; data[i + 2] = p[2]; data[i + 3] = p[3];
        }
      }
    }
    if (state.effect.color.mode !== "source" || state.effect.color.cycleColors) {
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a === 0) continue;
        const styled: RGB = [data[i], data[i + 1], data[i + 2]];
        const remapped = applyEffectColorMode(trc, styled);
        data[i] = remapped[0];
        data[i + 1] = remapped[1];
        data[i + 2] = remapped[2];
      }
    }
    blitImageData(trc, img);
    return;
  }
  if (modeName === "glitch") {
    paintImageData(trc, img, (r, g, b, a, x, y) => {
      const offset = Math.floor((hash(Math.floor(y / e.scale) + e.seed + trc.time * 3) - 0.5) * e.scale * e.intensity * 6);
      const sx = clamp(x + offset, 0, img.width - 1) | 0;
      const si = (y * img.width + sx) * 4;
      return [img.data[si], g, img.data[si + 2]];
    });
    return;
  }
  if (modeName === "dithering" || modeName === "linocut") {
    if (modeName === "linocut") {
      const shadow = hexToRgb(e.shadowColor);
      const high = hexToRgb(e.highlightColor);
      paintImageData(trc, img, (r, g, b, a, x, y) => {
        const pulse = modeAnimated ? Math.sin(trc.time * 1.9 + x * 0.003 + y * 0.002) * 0.08 : 0;
        const cut = lum(r, g, b) + (hash(Math.floor(x / e.scale) + Math.floor(y / e.scale) * 19) - 0.5) * e.intensity + pulse;
        const threshold = e.threshold + (modeAnimated ? Math.sin(trc.time * 1.4) * 0.05 : 0);
        const styled: RGB = cut > threshold ? high : shadow;
        return applyEffectColorMode(trc, styled);
      });
      return;
    }
    renderDither(trc, img);
    return;
  }
  if (modeName === "halftone_cmyk") {
    renderHalftone(trc, img, modeAnimated);
    return;
  }
  if (modeName === "text_fill" || modeName === "emoji" || modeName === "word_cloud" || modeName === "binary" || modeName === "matrix_rain") {
    renderGlyphs(trc, img, modeName);
    return;
  }
  if (modeName === "flow_field" || modeName === "cross_hatching" || modeName === "magnetic_field") {
    renderLines(trc, img, modeName);
    return;
  }
  if (modeName === "topographic" || modeName === "stained_glass" || modeName === "reaction_diffusion") {
    paintBackground(ctx, state, width, height);
    ctx.lineWidth = modeName === "stained_glass" ? 2 : 1;
    const levels = modeName === "reaction_diffusion" ? 18 : 10;
    for (let y = e.scale; y < img.height - e.scale; y += e.scale) {
      for (let x = e.scale; x < img.width - e.scale; x += e.scale) {
        const i = (y * img.width + x) * 4;
        if (img.data[i + 3] === 0) continue;
        const v = lum(img.data[i], img.data[i + 1], img.data[i + 2]);
        const q = Math.round(v * levels) / levels;
        if (Math.abs(v - q) < 0.03 + e.intensity * 0.02) {
          ctx.strokeStyle = modeName === "stained_glass" ? "rgba(0,0,0,.75)" : rgbToCss(colorFor(trc, img.data[i], img.data[i + 1], img.data[i + 2], v));
          ctx.beginPath();
          ctx.arc(x, y, e.scale * (modeName === "reaction_diffusion" ? 0.45 + hash(x * y + trc.time) * 0.5 : 0.35), 0, Math.PI * 2);
          ctx.stroke();
        } else if (modeName === "stained_glass") {
          ctx.fillStyle = rgbToCss(colorFor(trc, img.data[i], img.data[i + 1], img.data[i + 2], v));
          ctx.fillRect(x - e.scale / 2, y - e.scale / 2, e.scale, e.scale);
        }
      }
    }
    return;
  }
  if (modeName === "string_art") {
    paintBackground(ctx, state, width, height);
    const pins = Math.max(36, Math.floor(36 + e.scale * 4));
    const cx = width / 2, cy = height / 2, rad = Math.min(width, height) * 0.47;
    ctx.globalAlpha = 0.18 + e.intensity * 0.45;
    for (let i = 0; i < pins * e.intensity; i++) {
      const a = (i / pins) * Math.PI * 2;
      const b = ((i * 37 + e.seed) / pins) * Math.PI * 2;
      const c = colorFor(trc, 255, 255, 255, (i % pins) / pins);
      ctx.strokeStyle = rgbToCss(c);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      ctx.lineTo(cx + Math.cos(b) * rad, cy + Math.sin(b) * rad);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }
  if (modeName === "sand") {
    drawBlocky(trc, img, (x, y, r, g, b, v, seed, size) => {
      const drop = (1 - v) * e.intensity * size * 2 + (trc.time * 20 * seed) % (size * 2);
      ctx.fillStyle = rgbToCss(colorFor(trc, r, g, b, v));
      ctx.fillRect(x, Math.min(height, y + drop), Math.max(1, size * 0.35), Math.max(1, size * 0.35));
    });
    return;
  }
  drawBlocky(trc, img, (x, y, r, g, b, v, seed, size) => {
    const c = colorFor(trc, r, g, b, v);
    ctx.fillStyle = rgbToCss(c);
    if (modeName === "pointillism" || modeName === "stippling" || modeName === "voronoi_stipple") {
      const pulse = modeAnimated ? 0.7 + 0.55 * (0.5 + 0.5 * Math.sin(trc.time * 3.1 + seed * 13)) : 1;
      const rad = size * (modeName === "stippling" ? (1 - v) : v) * (0.25 + e.intensity * 0.45) * pulse;
      if (rad > 0.4) {
        const drift = modeAnimated ? Math.sin(trc.time * 2.4 + seed * 33) * size * 0.2 : 0;
        ctx.beginPath();
        ctx.arc(x + (seed - 0.5) * size + drift, y + (hash(seed * 99) - 0.5) * size - drift * 0.7, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (modeName === "oil_painting") {
      const spin = modeAnimated ? Math.sin(trc.time * 1.7 + seed * 19) * 0.45 : 0;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(seed * Math.PI + spin);
      const len = size * (0.7 + seed * 0.7);
      const thick = size * (0.24 + (modeAnimated ? 0.06 * (0.5 + 0.5 * Math.sin(trc.time * 2.3 + seed * 11)) : 0));
      const hi: RGB = [clamp(c[0] + 24), clamp(c[1] + 24), clamp(c[2] + 24)];
      const lo: RGB = [clamp(c[0] - 22), clamp(c[1] - 22), clamp(c[2] - 22)];
      ctx.fillStyle = rgbToCss(lo);
      ctx.fillRect(-len * 0.55, -thick * 0.55, len, thick * 1.1);
      ctx.fillStyle = rgbToCss(c);
      ctx.fillRect(-len * 0.52, -thick * 0.45, len * 0.96, thick * 0.9);
      ctx.fillStyle = rgbToCss(hi);
      ctx.fillRect(-len * 0.48, -thick * 0.22, len * 0.92, thick * 0.36);
      ctx.restore();
      return;
    }
    const sides = modeName === "voronoi" ? 6 : 4;
    const spin = modeAnimated ? trc.time * (0.35 + e.intensity * 0.7) : 0;
    ctx.beginPath();
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2 + seed + spin + (modeAnimated ? Math.sin(trc.time * 2 + seed * 23 + k) * 0.24 : 0);
      const rr = size * (0.48 + hash(seed * 20 + k) * 0.35);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    if (modeName === "voronoi") {
      ctx.strokeStyle = "rgba(0,0,0,.35)";
      ctx.stroke();
    }
  });
}
