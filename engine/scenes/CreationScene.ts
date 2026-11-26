import * as THREE from 'three';
import type { FrameInfo, IScene, ParameterDefinition, ParameterMap, Preset, SceneContext } from '../types';

/**
 * Creation of Adam -> the forms life takes.
 *
 * Two hands reach in from opposite edges, touch, and the spark scatters and
 * reassembles through eight forms: apple, book, brain, plant, globe, cloud,
 * tower, logo.
 *
 * Every form is a function of the same canonical (u, v) grid, so morphing is a
 * straight interpolation of corresponding samples. Normals are taken from the
 * morphed surface by finite differences, which means shading stays correct in
 * the in-between states and not only on the keyframes.
 */

const GRID_U = 168;
const GRID_V = 212;
const GRID_N = GRID_U * GRID_V;

const TAU = Math.PI * 2;

/** Deterministic hash -> [0,1). */
function h01(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

function sstep(a: number, b: number, x: number): number {
  const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
}

/** A point on a form: position plus linear colour. */
interface Pt {
  x: number; y: number; z: number;
  r: number; g: number; b: number;
}

/* ------------------------------------------------------------------ *
 * Forms. Each maps (u, v) in [0,1]^2 to a point.
 * ------------------------------------------------------------------ */

/**
 * Two hands, index fingers extended toward one another.
 *
 * The digits are fanned in Y rather than in Z. A hand reads by the gaps
 * between its fingers, and the camera sits nearly in the XY plane, so a fan
 * in depth just collapses into one mass.
 *
 * Local space points +X toward the centre of frame; the caller mirrors it.
 * Everything is shifted so the extended index fingertip lands near x = 0.04,
 * which puts the two tips a hair apart at the middle of the frame.
 */

interface Digit {
  sx: number; sy: number; sz: number; // knuckle seat
  a0: number;                          // initial tangent angle, 0 = +X
  curl: number;                        // total bend over the digit
  len: number;
  thick: number;
}

const DIGITS: Digit[] = [
  // index: extended, riding high and reaching for the other hand
  { sx: -0.98, sy: 0.22, sz: 0.0, a0: 0.08, curl: 0.14, len: 1.02, thick: 0.088 },
  // middle, ring, little: curled under, stacked downward with clear gaps
  { sx: -0.95, sy: 0.055, sz: -0.07, a0: -0.2, curl: 2.3, len: 0.66, thick: 0.085 },
  { sx: -0.93, sy: -0.105, sz: -0.13, a0: -0.42, curl: 2.5, len: 0.6, thick: 0.078 },
  { sx: -0.91, sy: -0.25, sz: -0.17, a0: -0.64, curl: 2.6, len: 0.5, thick: 0.07 },
  // thumb: lower and forward in Z
  { sx: -1.34, sy: -0.3, sz: 0.17, a0: -1.0, curl: 0.95, len: 0.56, thick: 0.095 },
];

/** Diagonal entry angle, set from params each frame. */
let HAND_TILT = 0.4;
export function setHandTilt(v: number) { HAND_TILT = v; }

function formHands(u: number, v: number, i: number): Pt {
  const side = v < 0.5 ? -1 : 1;
  const vv = v < 0.5 ? v * 2 : (v - 0.5) * 2; // 0..1 within one hand
  const t = u * TAU;

  let x: number, y: number, z: number;
  let lit: number;

  if (vv < 0.2) {
    // Forearm: deliberately short, it only has to leave the frame
    const a = vv / 0.2;                  // 0 outer, 1 at the wrist
    const rr = 0.2 + 0.055 * a;
    x = -2.45 + a * 0.52;
    y = -0.06 + rr * Math.cos(t);
    z = rr * Math.sin(t) * 0.92;
    lit = 0.4 + 0.45 * Math.cos(t);
  } else if (vv < 0.56) {
    // Palm: taller than it is deep, so the silhouette has some body
    const a = (vv - 0.2) / 0.36;         // 0 wrist -> 1 knuckles
    const hy = 0.255 + 0.085 * Math.sin(a * Math.PI * 0.9);
    const hz = 0.13 + 0.03 * Math.sin(a * Math.PI);
    x = -1.93 + a * 0.95;
    y = -0.05 + 0.08 * a + hy * Math.cos(t);
    z = hz * Math.sin(t);
    lit = 0.45 + 0.45 * Math.cos(t);
  } else {
    // Five digits, each integrated along its own tangent so it bends
    const fRaw = (vv - 0.56) / 0.44;
    const fi = Math.min(4, Math.floor(fRaw * 5));
    const fu = fRaw * 5 - fi;            // 0 knuckle -> 1 tip
    const d = DIGITS[fi];

    const STEPS = 16;
    let ax = 0, ay = 0;
    const ds = (d.len * fu) / STEPS;
    for (let k = 0; k < STEPS; k++) {
      const q = ((k + 0.5) / STEPS) * fu;
      const ang = d.a0 - d.curl * q * q;
      ax += Math.cos(ang) * ds;
      ay += Math.sin(ang) * ds;
    }

    const taper = d.thick * (1 - 0.28 * fu * fu);
    // knuckle and nail swell, so joints read at glyph scale
    const knuckle = 1 + 0.14 * Math.exp(-Math.pow((fu - 0.42) / 0.13, 2));
    const rr = taper * knuckle;

    x = d.sx + ax;
    y = d.sy + ay + rr * Math.cos(t);
    z = d.sz + rr * Math.sin(t) * 0.95;
    lit = 0.52 + 0.42 * Math.cos(t) - 0.05 * fi;
  }

  // Mirror, then tilt. Rotating both hands by the same angle sends one
  // down to the lower-left and the other up to the upper-right, which is the
  // diagonal the fresco uses and which suits a 9:16 frame.
  const xw = side * x;
  const ct = Math.cos(HAND_TILT), st = Math.sin(HAND_TILT);
  // Recentre on the contact point. The index tip sits at roughly (0.03, 0.27)
  // in local space; the x part is symmetric between the two hands and cancels,
  // the y part does not, so rotating without this correction drags the meeting
  // point up and to one side.
  const TIP_Y = 0.27;
  const xr = xw * ct - y * st + TIP_Y * st;
  const yr = xw * st + y * ct - TIP_Y * ct;

  // Warm skin, brighter along the top of each limb
  const k = Math.max(0, Math.min(1, lit));
  return {
    x: xr,
    y: yr,
    z,
    r: 0.62 + 0.34 * k,
    g: 0.43 + 0.33 * k,
    b: 0.34 + 0.3 * k,
  };
}

/** Apple: surface of revolution with dimples top and bottom, plus a stem. */
function formApple(u: number, v: number): Pt {
  const t = v * TAU;
  if (u < 0.055) {
    const s = u / 0.055;
    const bend = 0.1 * s * s;
    return {
      x: bend + 0.022 * Math.cos(t),
      y: 0.82 + s * 0.3,
      z: 0.022 * Math.sin(t),
      r: 0.42, g: 0.29, b: 0.14,
    };
  }
  const phi = ((u - 0.055) / 0.945) * Math.PI;
  const dim = 0.2 * Math.pow(Math.cos(phi), 3);
  const rad = 0.95 * Math.pow(Math.sin(phi), 0.78) * (1 + 0.05 * Math.sin(v * TAU * 5));
  const y = -Math.cos(phi) * 0.92 + dim;
  // deep crimson in the shadowed lower half, bright toward the shoulder
  const up = 0.5 + 0.5 * Math.cos(phi);
  const speck = h01(Math.floor(u * 400) * 31 + Math.floor(v * 400)) > 0.985 ? 0.3 : 0;
  return {
    x: rad * Math.cos(t), y, z: rad * Math.sin(t),
    r: 0.34 + 0.62 * up + speck,
    g: 0.02 + 0.2 * up * up + speck,
    b: 0.07 + 0.16 * up * up + speck,
  };
}

/** Open book: two leaves curving away from a spine. */
function formBook(u: number, v: number): Pt {
  const side = v < 0.5 ? -1 : 1;
  const w = Math.abs(v - 0.5) * 2; // 0 at spine, 1 at outer edge
  const page = u;
  const isCover = w > 0.93;

  const x = side * w * 1.25;
  const y = (page - 0.5) * 1.5 * (1 - 0.1 * w);
  const z = -0.42 * w * w + 0.04 * Math.sin(w * 18 + page * 3) * (1 - w);

  if (isCover) {
    return { x, y, z: z - side * 0.015, r: 0.3, g: 0.11, b: 0.07 };
  }
  // paper, warm near the spine where light falls off
  const lit = 0.55 + 0.45 * w;
  const rule = Math.sin(page * 46) > 0.82 ? -0.22 : 0;
  return { x, y, z, r: 0.96 * lit + rule, g: 0.93 * lit + rule, b: 0.84 * lit + rule };
}

/** Brain: lumpy ellipsoid with a central fissure and bright tracts. */
function formBrain(u: number, v: number): Pt {
  const phi = u * Math.PI;
  const th = v * TAU;
  const gyri =
    1 +
    0.1 * Math.sin(5.5 * th) * Math.sin(4.0 * phi) +
    0.06 * Math.sin(9.0 * phi + 2.0 * th) +
    0.04 * Math.sin(13.0 * th + 1.7);
  const rad = gyri;
  let x = 1.08 * rad * Math.sin(phi) * Math.cos(th);
  const y = 0.86 * rad * Math.cos(phi);
  const z = 0.94 * rad * Math.sin(phi) * Math.sin(th);
  // longitudinal fissure
  const fis = Math.exp(-Math.pow(x / 0.14, 2));
  x *= 1 - 0.45 * fis;

  // cyan shell, yellow tracts deeper in
  const tract = Math.pow(Math.max(0, Math.sin(7.0 * phi + 3.0 * th)), 8);
  return {
    x, y, z,
    r: 0.1 + 0.85 * tract,
    g: 0.72 + 0.25 * tract,
    b: 0.55 - 0.4 * tract,
  };
}

/** Plant: a stem with leaves built by integrating along their own arc. */
function formPlant(u: number, v: number): Pt {
  const LEAVES = 7;
  if (v > 0.88) {
    // stem
    const t = ((v - 0.88) / 0.12) * TAU;
    const sway = 0.1 * Math.sin(u * 2.2);
    return {
      x: sway + 0.035 * Math.cos(t),
      y: -1.0 + u * 1.9,
      z: 0.035 * Math.sin(t),
      r: 0.16, g: 0.4, b: 0.14,
    };
  }
  const lRaw = (v / 0.88) * LEAVES;
  const li = Math.min(LEAVES - 1, Math.floor(lRaw));
  const lv = (lRaw - li) * 2 - 1; // -1..1 across the leaf
  const up = li / (LEAVES - 1);
  const az = li * 2.399963 + 0.4;

  const L = 0.5 + 0.55 * (1 - up) + 0.2 * h01(li * 7 + 3);
  const open = (26 + 46 * (1 - up)) * (Math.PI / 180);
  const du = 1 / (GRID_U - 1);
  // integrate the leaf's tangent so it arcs instead of running straight out
  let rho = 0, zz = 0;
  const steps = Math.max(1, Math.floor(u / du));
  for (let k = 0; k <= steps; k++) {
    const uu = k * du;
    const phi = open * (0.3 + 0.7 * uu) + 0.5 * uu * uu;
    rho += Math.sin(phi) * du * L;
    zz += Math.cos(phi) * du * L;
  }
  const wq = 0.2 * L * Math.pow(Math.sin(Math.PI * Math.pow(u, 1.4)), 0.7);
  const offT = lv * wq;
  const R = 0.05 + rho;
  const y = -1.0 + up * 1.5 + zz;
  const vein = Math.abs(lv) < 0.07 ? -0.1 : 0;
  return {
    x: R * Math.cos(az) - offT * Math.sin(az),
    y,
    z: R * Math.sin(az) + offT * Math.cos(az),
    r: 0.12 + 0.2 * u + vein,
    g: 0.34 + 0.54 * u + vein,
    b: 0.14 + 0.12 * u + vein,
  };
}

/** Globe: sphere with procedural landmasses. */
function formGlobe(u: number, v: number): Pt {
  const phi = u * Math.PI;
  const th = v * TAU;
  const x = Math.sin(phi) * Math.cos(th);
  const y = Math.cos(phi);
  const z = Math.sin(phi) * Math.sin(th);
  const n =
    Math.sin(2.4 * th + 1.1) * Math.cos(2.9 * phi) +
    0.7 * Math.sin(5.1 * th + 2.6) * Math.cos(4.3 * phi + 0.8) +
    0.45 * Math.sin(8.3 * th) * Math.cos(7.1 * phi + 2.2);
  const land = n > 0.42;
  return {
    x, y, z,
    r: land ? 0.34 : 0.04,
    g: land ? 0.86 : 0.3,
    b: land ? 0.18 : 0.52,
  };
}

/** Cloud: a union of soft blobs. */
function formCloud(u: number, v: number, i: number): Pt {
  const K = 7;
  const bi = Math.floor(v * K) % K;
  const cx = [-1.25, -0.6, 0.0, 0.62, 1.2, -0.3, 0.45][bi];
  const cy = [-0.05, 0.22, 0.34, 0.2, -0.08, -0.26, -0.3][bi];
  const cz = [0.1, -0.22, 0.14, 0.26, -0.12, 0.3, -0.3][bi];
  const rr = [0.46, 0.56, 0.64, 0.55, 0.44, 0.4, 0.42][bi];

  const phi = u * Math.PI;
  const th = (v * K - bi) * TAU;
  const puff = 1 + 0.17 * Math.sin(5 * th + bi) * Math.sin(4 * phi) + 0.1 * h01(i * 3 + 11);
  const r = rr * puff;
  const lit = 0.62 + 0.38 * Math.cos(phi);
  return {
    x: cx + r * Math.sin(phi) * Math.cos(th),
    y: cy + r * Math.cos(phi) * 0.82,
    z: cz + r * Math.sin(phi) * Math.sin(th),
    r: 0.72 * lit + 0.25,
    g: 0.75 * lit + 0.25,
    b: 0.8 * lit + 0.22,
  };
}

/** Tower: tapered, slightly twisted, with lit window bands. */
function formBuilding(u: number, v: number): Pt {
  const th = v * TAU;
  const taper = 1 - 0.42 * Math.pow(u, 1.3);
  const twist = 0.5 * u;
  const a = th + twist;
  // squircle cross-section
  const cx = Math.cos(a), cz = Math.sin(a);
  const k = Math.pow(Math.abs(cx), 2.6) + Math.pow(Math.abs(cz), 2.6);
  const shape = 1 / Math.pow(Math.max(k, 1e-4), 1 / 2.6);
  const r = 0.42 * taper * shape;
  const y = -1.25 + u * 2.6;

  const floorBand = Math.sin(u * 150) > 0.1;
  const mullion = Math.sin(a * 26) > 0.4;
  const lit = floorBand && !mullion && h01(Math.floor(u * 150) * 53 + Math.floor(a * 26)) > 0.45;
  const glass = 0.16 + 0.22 * (0.5 + 0.5 * Math.cos(a - 2.2));
  return {
    x: r * cx, y, z: r * cz,
    r: lit ? 1.0 : glass * 0.8,
    g: lit ? 0.78 : glass * 0.95,
    b: lit ? 0.44 : glass * 1.1,
  };
}

/** The Claude mark: tapered radial spokes. */
function formLogo(u: number, v: number): Pt {
  const SPOKES = 11;
  const sRaw = v * SPOKES;
  const si = Math.min(SPOKES - 1, Math.floor(sRaw));
  const sv = (sRaw - si) * 2 - 1; // across the spoke
  const ang = (si / SPOKES) * TAU + 0.18 * h01(si * 13 + 5);
  const len = 0.78 + 0.46 * h01(si * 29 + 7);
  const rr = 0.1 + u * len;
  // spokes are fat at the hub and taper to a point
  const halfW = 0.17 * (1 - Math.pow(u, 0.85)) * (0.75 + 0.5 * h01(si * 17 + 3));
  const offT = sv * halfW;
  const wob = 0.03 * Math.sin(u * 9 + si);
  return {
    x: rr * Math.cos(ang) - offT * Math.sin(ang) + wob,
    y: rr * Math.sin(ang) + offT * Math.cos(ang),
    z: 0.07 * Math.sin(u * 3.1 + si) * (1 - u),
    r: 0.85, g: 0.47, b: 0.34,
  };
}

/* ------------------------------------------------------------------ *
 * Parameters and presets
 * ------------------------------------------------------------------ */

export const CREATION_PARAM_DEFS: ParameterDefinition[] = [
  {
    key: 'touchTime',
    name: 'Contact Time',
    type: 'number',
    default: 3.2,
    min: 1.0,
    max: 6.0,
    step: 0.1,
    unit: 's',
    category: 'Choreography',
    description: 'When the two fingertips meet',
  },
  {
    key: 'formHold',
    name: 'Form Hold',
    type: 'number',
    default: 1.25,
    min: 0.3,
    max: 3.0,
    step: 0.05,
    unit: 's',
    category: 'Choreography',
  },
  {
    key: 'formBlend',
    name: 'Morph Duration',
    type: 'number',
    default: 0.75,
    min: 0.2,
    max: 2.0,
    step: 0.05,
    unit: 's',
    category: 'Choreography',
  },
  {
    key: 'handTilt',
    name: 'Hand Entry Angle',
    type: 'number',
    default: 0.4,
    min: -1.0,
    max: 1.0,
    step: 0.02,
    unit: 'rad',
    category: 'Choreography',
    description: 'Tilts both arms onto a diagonal; 0 brings them straight in from the sides',
  },
  {
    key: 'approachDistance',
    name: 'Hand Entry Distance',
    type: 'number',
    default: 3.4,
    min: 1.0,
    max: 6.0,
    step: 0.1,
    category: 'Choreography',
  },
  {
    key: 'scatterAmount',
    name: 'Morph Scatter',
    type: 'number',
    default: 0.55,
    min: 0.0,
    max: 2.0,
    step: 0.05,
    category: 'Choreography',
    description: 'How far samples wander mid-morph before reassembling',
  },
  {
    key: 'letterMorph',
    name: 'Letters While Morphing',
    type: 'boolean',
    default: true,
    category: 'Choreography',
    description: 'Mid-morph samples become single letters of the embedded message',
  },
  {
    key: 'sparkStrength',
    name: 'Contact Spark',
    type: 'number',
    default: 1.0,
    min: 0.0,
    max: 2.0,
    step: 0.05,
    category: 'Lighting',
  },
  {
    key: 'spin',
    name: 'Form Spin',
    type: 'number',
    default: 0.35,
    min: 0.0,
    max: 2.0,
    step: 0.05,
    category: 'Motion',
  },
  {
    key: 'formScale',
    name: 'Form Scale',
    type: 'number',
    default: 0.62,
    min: 0.4,
    max: 2.0,
    step: 0.05,
    category: 'Geometry',
  },
  {
    key: 'skinColor',
    name: 'Hand Tone',
    type: 'color',
    default: '#e8b48c',
    category: 'Materials',
  },
  {
    key: 'sparkColor',
    name: 'Spark Color',
    type: 'color',
    default: '#fff4d6',
    category: 'Materials',
  },
];

export const CREATION_PRESETS: Preset[] = [
  {
    id: 'genesis_warm',
    name: 'Genesis (Warm ASCII)',
    sceneId: 'creation',
    rendererId: 'ascii',
    sceneParams: {
      touchTime: 3.2, formHold: 1.25, formBlend: 0.75,
      approachDistance: 3.4, scatterAmount: 0.55, letterMorph: true,
      sparkStrength: 1.0, spin: 0.35, formScale: 0.62,
      skinColor: '#e8b48c', sparkColor: '#fff4d6',
    },
    rendererParams: {
      charRamp: 'detailed', fontSize: 10, fontFamily: 'JetBrains Mono',
      embeddedMessage: 'create ', directionalEdges: true, edgeThreshold: 0.28,
      edgeBoost: 1.25, glitchEffect: true, glitchDuration: 0.4,
      specularPower: 20, specularIntensity: 0.26, emissionBoost: 0.6,
      multiscaleGlow: true, glowIntensity: 0.6, backgroundColor: '#05070e',
    },
    cameraParams: {
      distance: 5.4, fov: 44, elevation: 6, azimuth: 0,
      autoRotate: false, autoRotateSpeed: 0, targetY: 0.0,
    },
    overlayParams: {
      enabled: true,
      title: 'CREATION',
      subtitle: 'AND THEN THERE WAS EVERYTHING',
      watermark: '@ascii.studio',
      fontFamily: "'JetBrains Mono', monospace",
      titleSize: 42, subtitleSize: 18, watermarkSize: 16,
      color: '#ffd9a8', opacity: 0.9, position: 'bottom',
      fadeInDuration: 0.8, fadeOutDuration: 0.8, subtleGlow: true,
    },
    duration: 20.0,
    fps: 30,
    aspectRatio: '9:16',
  },
  {
    id: 'genesis_halftone',
    name: 'Genesis (Halftone Fresco)',
    sceneId: 'creation',
    rendererId: 'halftone',
    sceneParams: {
      touchTime: 3.0, formHold: 1.1, formBlend: 0.9,
      approachDistance: 3.8, scatterAmount: 0.8, letterMorph: false,
      sparkStrength: 1.4, spin: 0.5, formScale: 0.66,
      skinColor: '#f0c49c', sparkColor: '#ffffff',
    },
    rendererParams: { dotScale: 6, angle: 15, backgroundColor: '#0a0a12' },
    cameraParams: {
      distance: 5.2, fov: 44, elevation: 10, azimuth: 0,
      autoRotate: false, autoRotateSpeed: 0, targetY: 0.0,
    },
    duration: 18.0,
    fps: 30,
    aspectRatio: '9:16',
  },
  {
    id: 'genesis_dither',
    name: 'Genesis (Cold Dither)',
    sceneId: 'creation',
    rendererId: 'dither',
    sceneParams: {
      touchTime: 3.4, formHold: 1.4, formBlend: 0.6,
      approachDistance: 3.0, scatterAmount: 0.35, letterMorph: false,
      sparkStrength: 0.8, spin: 0.2, formScale: 0.58,
      skinColor: '#cdd6f4', sparkColor: '#bae6fd',
    },
    rendererParams: { paletteId: 'gameboy', pixelScale: 5, backgroundColor: '#05070e' },
    cameraParams: {
      distance: 5.6, fov: 42, elevation: 4, azimuth: 0,
      autoRotate: false, autoRotateSpeed: 0, targetY: 0.0,
    },
    duration: 20.0,
    fps: 30,
    aspectRatio: '9:16',
  },
];

/* ------------------------------------------------------------------ */

type FormFn = (u: number, v: number, i: number) => Pt;

const SEQUENCE: FormFn[] = [
  formHands,
  (u, v) => formApple(u, v),
  (u, v) => formBook(u, v),
  (u, v) => formBrain(u, v),
  (u, v) => formPlant(u, v),
  (u, v) => formGlobe(u, v),
  formCloud,
  (u, v) => formBuilding(u, v),
  (u, v) => formLogo(u, v),
];

export class CreationScene implements IScene {
  public id = 'creation';
  public name = 'Creation of Adam';
  public description =
    'Two hands reach in and touch; the spark scatters and reassembles through apple, book, brain, plant, globe, cloud, tower and mark';
  public category = 'Cinematic';
  public paramDefs = CREATION_PARAM_DEFS;
  public defaultParams: ParameterMap = CREATION_PARAM_DEFS.reduce((acc, p) => {
    acc[p.key] = p.default;
    return acc;
  }, {} as ParameterMap);
  public presets = CREATION_PRESETS;

  public stages = [
    { id: 'reach', name: 'The Reach', startTime: 0.0, endTime: 3.2, description: 'Two hands enter from opposite edges' },
    { id: 'touch', name: 'Contact', startTime: 3.2, endTime: 3.8, description: 'Fingertips meet and the spark fires' },
    { id: 'forms', name: 'The Forms of Life', startTime: 3.8, endTime: 20.0, description: 'Apple, book, brain, plant, globe, cloud, tower, mark' },
  ];

  private sceneGroup = new THREE.Group();
  private mesh!: THREE.Points;
  private material!: THREE.PointsMaterial;
  private scratch = new Float32Array(GRID_N * 3);

  public init(ctx: SceneContext, params: ParameterMap): void {
    ctx.scene.add(this.sceneGroup);
    // A light proxy mesh so the shaded / halftone / dither renderers have
    // something to work with; the ASCII path uses getSampleCloud instead.
    const geom = new THREE.BufferGeometry();
    const step = 11;
    const pts: number[] = [];
    for (let i = 0; i < GRID_N; i += step) pts.push(0, 0, 0);
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.material = new THREE.PointsMaterial({
      size: 0.03,
      color: new THREE.Color(params.skinColor || '#e8b48c'),
    });
    this.mesh = new THREE.Points(geom, this.material);
    this.sceneGroup.add(this.mesh);
  }

  /** Which pair of forms is active, and how far between them. */
  private phase(time: number, params: ParameterMap) {
    const touchT = params.touchTime ?? 3.2;
    const seqStart = touchT + 0.6;
    const hold = params.formHold ?? 1.25;
    const blend = params.formBlend ?? 0.75;
    const span = hold + blend;

    if (time < seqStart) return { a: 0, b: 0, mix: 0, seqStart, touchT };

    const k = (time - seqStart) / span;
    const ki = Math.floor(k);
    const local = time - seqStart - ki * span;
    const a = Math.min(SEQUENCE.length - 1, ki);
    if (local < hold || a >= SEQUENCE.length - 1) {
      return { a, b: a, mix: 0, seqStart, touchT };
    }
    const mix = sstep(0, 1, (local - hold) / blend);
    return { a, b: Math.min(SEQUENCE.length - 1, a + 1), mix, seqStart, touchT };
  }

  public update(frameInfo: FrameInfo, params: ParameterMap): void {
    const spin = params.spin ?? 0.35;
    this.sceneGroup.rotation.y = frameInfo.time * spin * 0.25;
    if (this.material && params.skinColor) this.material.color.set(params.skinColor as string);
  }

  public getSampleCloud(frameInfo: FrameInfo, params: ParameterMap): any {
    const { time } = frameInfo;
    const { a, b, mix, seqStart, touchT } = this.phase(time, params);

    const scale = params.formScale ?? 1.0;
    const scatterK = (params.scatterAmount ?? 0.55) * Math.sin(Math.PI * mix);
    const approach = params.approachDistance ?? 3.4;
    const handsIn = 1 - sstep(0, touchT, time);
    const spark =
      (params.sparkStrength ?? 1.0) *
      Math.exp(-Math.pow((time - touchT) / 0.26, 2));
    const sparkCol = new THREE.Color((params.sparkColor as string) || '#fff4d6');
    const skinCol = new THREE.Color((params.skinColor as string) || '#e8b48c');
    const useLetters = params.letterMorph !== false;
    const tilt = params.handTilt ?? 0.4;
    setHandTilt(tilt);

    const spin = (params.spin ?? 0.35) * time * 0.25;
    const cosS = Math.cos(spin), sinS = Math.sin(spin);

    const P = this.scratch;
    const cols = new Float32Array(GRID_N * 3);
    const glows = new Float32Array(GRID_N);

    const fa = SEQUENCE[a];
    const fb = SEQUENCE[b];

    for (let ui = 0; ui < GRID_U; ui++) {
      const u = ui / (GRID_U - 1);
      for (let vi = 0; vi < GRID_V; vi++) {
        const v = vi / (GRID_V - 1);
        const i = ui * GRID_V + vi;

        const pa = fa(u, v, i);
        let x = pa.x, y = pa.y, z = pa.z;
        let cr = pa.r, cg = pa.g, cb = pa.b;

        if (mix > 0) {
          const pb = fb(u, v, i);
          x += (pb.x - x) * mix;
          y += (pb.y - y) * mix;
          z += (pb.z - z) * mix;
          cr += (pb.r - cr) * mix;
          cg += (pb.g - cg) * mix;
          cb += (pb.b - cb) * mix;
        }

        // Hands still travelling in from the edges
        if (a === 0 && mix === 0 && time < seqStart) {
          const dir = v < 0.5 ? -1 : 1;
          const ct = Math.cos(tilt), st = Math.sin(tilt);
          x += dir * approach * handsIn * ct;
          y += dir * approach * handsIn * st;
          cr = skinCol.r * (0.72 + 0.4 * pa.r);
          cg = skinCol.g * (0.72 + 0.4 * pa.g);
          cb = skinCol.b * (0.72 + 0.4 * pa.b);
        }

        // Samples wander outward at the midpoint of a morph
        if (scatterK > 0) {
          x += (h01(i * 3) * 2 - 1) * scatterK;
          y += (h01(i * 3 + 1) * 2 - 1) * scatterK;
          z += (h01(i * 3 + 2) * 2 - 1) * scatterK * 0.6;
        }

        x *= scale; y *= scale; z *= scale;

        // Spin the assembled form
        const rx = x * cosS + z * sinS;
        const rz = -x * sinS + z * cosS;

        P[i * 3] = rx;
        P[i * 3 + 1] = y;
        P[i * 3 + 2] = rz;

        let glow = 0;
        if (spark > 0.002) {
          // the flash is brightest at the contact point, between the fingertips
          const d = Math.hypot(rx, y, rz);
          const near = Math.exp(-Math.pow(d / 0.5, 2));
          const amt = Math.min(1, spark * near);
          cr += (sparkCol.r - cr) * amt;
          cg += (sparkCol.g - cg) * amt;
          cb += (sparkCol.b - cb) * amt;
          glow = amt * 0.9;
        }
        cols[i * 3] = cr;
        cols[i * 3 + 1] = cg;
        cols[i * 3 + 2] = cb;
        glows[i] = glow;
      }
    }

    // Normals from the morphed surface, so shading holds mid-transition too
    const positions = new Float32Array(GRID_N * 3);
    const normals = new Float32Array(GRID_N * 3);
    const ao = new Float32Array(GRID_N);
    const ids = new Int32Array(GRID_N);
    const flying = new Uint8Array(GRID_N);

    const letterFrac = useLetters ? Math.sin(Math.PI * mix) : 0;

    for (let ui = 0; ui < GRID_U; ui++) {
      for (let vi = 0; vi < GRID_V; vi++) {
        const i = ui * GRID_V + vi;
        const uA = ((ui > 0 ? ui - 1 : ui) * GRID_V + vi) * 3;
        const uB = ((ui < GRID_U - 1 ? ui + 1 : ui) * GRID_V + vi) * 3;
        const vA = (ui * GRID_V + (vi > 0 ? vi - 1 : vi)) * 3;
        const vB = (ui * GRID_V + (vi < GRID_V - 1 ? vi + 1 : vi)) * 3;

        const dux = P[uB] - P[uA], duy = P[uB + 1] - P[uA + 1], duz = P[uB + 2] - P[uA + 2];
        const dvx = P[vB] - P[vA], dvy = P[vB + 1] - P[vA + 1], dvz = P[vB + 2] - P[vA + 2];
        let nx = duy * dvz - duz * dvy;
        let ny = duz * dvx - dux * dvz;
        let nz = dux * dvy - duy * dvx;
        const nl = Math.hypot(nx, ny, nz) || 1;

        positions[i * 3] = P[i * 3];
        positions[i * 3 + 1] = P[i * 3 + 1];
        positions[i * 3 + 2] = P[i * 3 + 2];
        normals[i * 3] = nx / nl;
        normals[i * 3 + 1] = ny / nl;
        normals[i * 3 + 2] = nz / nl;
        ao[i] = 0.45 + 0.55 * Math.pow(ui / (GRID_U - 1), 0.6);
        ids[i] = i;
        flying[i] = letterFrac > 0 && (i % 1000) / 1000 < letterFrac ? 1 : 0;
      }
    }

    return {
      positions,
      normals,
      colors: cols,
      ambientOcclusion: ao,
      ids,
      flying,
      glow: glows,
    };
  }

  public onResize(_width: number, _height: number): void {}

  public dispose(): void {
    if (this.mesh) this.mesh.geometry.dispose();
    if (this.material) this.material.dispose();
    if (this.sceneGroup.parent) this.sceneGroup.parent.remove(this.sceneGroup);
  }
}
