import { AppState, TimelineKeyframe, VisualState } from "./types";

const EPSILON = 1e-6;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isHexColor(v: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
}

function hexToRgb(hex: string): [number, number, number] {
  const s = hex.trim();
  if (s.length === 4) {
    return [
      parseInt(s[1] + s[1], 16),
      parseInt(s[2] + s[2], 16),
      parseInt(s[3] + s[3], 16),
    ];
  }
  return [
    parseInt(s.slice(1, 3), 16),
    parseInt(s.slice(3, 5), 16),
    parseInt(s.slice(5, 7), 16),
  ];
}

function rgbToHex([r, g, b]: [number, number, number]) {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function interpolateAny(a: unknown, b: unknown, t: number): unknown {
  if (typeof a === "number" && typeof b === "number") return lerp(a, b, t);
  if (typeof a === "boolean" && typeof b === "boolean") return t < 0.5 ? a : b;
  if (typeof a === "string" && typeof b === "string") {
    if (isHexColor(a) && isHexColor(b)) {
      const ar = hexToRgb(a);
      const br = hexToRgb(b);
      return rgbToHex([
        lerp(ar[0], br[0], t),
        lerp(ar[1], br[1], t),
        lerp(ar[2], br[2], t),
      ]);
    }
    return t < 0.5 ? a : b;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const len = t < 0.5 ? a.length : b.length;
    const out: unknown[] = new Array(len);
    for (let i = 0; i < len; i++) {
      const av = a[Math.min(i, a.length - 1)];
      const bv = b[Math.min(i, b.length - 1)];
      out[i] = interpolateAny(av, bv, t);
    }
    return out;
  }
  if (isObject(a) && isObject(b)) {
    const out: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      out[key] = interpolateAny(a[key], b[key], t);
    }
    return out;
  }
  return t < 0.5 ? a : b;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function captureVisualState(state: AppState): VisualState {
  const { timeline: _timeline, ...visual } = state;
  return deepClone(visual);
}

export function withVisualState(state: AppState, visual: VisualState): AppState {
  return { ...state, ...deepClone(visual) };
}

export function makeKeyframe(time: number, state: AppState): TimelineKeyframe {
  return {
    id: `kf_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`,
    time: Math.max(0, time),
    state: captureVisualState(state),
  };
}

export function upsertKeyframe(
  keyframes: TimelineKeyframe[],
  keyframe: TimelineKeyframe,
  tolerance = 1 / 60
): TimelineKeyframe[] {
  const out = keyframes.slice();
  const existing = out.findIndex((k) => Math.abs(k.time - keyframe.time) <= tolerance || k.id === keyframe.id);
  if (existing >= 0) out[existing] = keyframe;
  else out.push(keyframe);
  out.sort((a, b) => a.time - b.time);
  return out;
}

/** Interpolate all VisualState fields between the two keyframes that bracket `time`. */
export function evaluateKeyframedVisualState(
  keyframes: TimelineKeyframe[],
  time: number,
  fallback: VisualState
): VisualState {
  if (keyframes.length === 0) return deepClone(fallback);
  if (keyframes.length === 1) return deepClone(keyframes[0].state);

  const frames = keyframes.slice().sort((a, b) => a.time - b.time);
  const t = Math.max(0, time);

  if (t <= frames[0].time + EPSILON) return deepClone(frames[0].state);
  const last = frames[frames.length - 1];
  if (t >= last.time - EPSILON) return deepClone(last.state);

  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    if (t >= a.time && t <= b.time) {
      const span = Math.max(EPSILON, b.time - a.time);
      const u = clamp01((t - a.time) / span);
      return interpolateAny(a.state, b.state, u) as VisualState;
    }
  }

  return deepClone(fallback);
}

