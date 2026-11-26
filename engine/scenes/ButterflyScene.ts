import * as THREE from 'three';
import type { FrameInfo, IScene, ParameterDefinition, ParameterMap, Preset, SceneContext } from '../types';

export const BUTTERFLY_PARAM_DEFS: ParameterDefinition[] = [
  {
    key: 'flapSpeed',
    name: 'Flap Frequency',
    type: 'number',
    default: 2.2,
    min: 0.5,
    max: 5.0,
    step: 0.1,
    category: 'Flight',
  },
  {
    key: 'flapAmplitude',
    name: 'Flap Wing Angle',
    type: 'number',
    default: 1.1,
    min: 0.2,
    max: 1.6,
    step: 0.05,
    category: 'Flight',
  },
  {
    key: 'wingSpan',
    name: 'Wing Span Scale',
    type: 'number',
    default: 1.8,
    min: 1.0,
    max: 3.0,
    step: 0.1,
    category: 'Anatomy',
  },
  {
    key: 'bodyColor',
    name: 'Body Color',
    type: 'color',
    default: '#bf7a29',
    category: 'Materials',
  },
  {
    key: 'antennaColor',
    name: 'Antenna Color',
    type: 'color',
    default: '#ffc759',
    category: 'Materials',
    description: 'Antennae and club tips; the reference runs these noticeably brighter than the body',
  },
  {
    key: 'wingBaseColor',
    name: 'Wing Base Color',
    type: 'color',
    default: '#2563eb', // Morpho blue
    category: 'Materials',
  },
  {
    key: 'wingAccentColor',
    name: 'Wing Accent Color',
    type: 'color',
    default: '#38bdf8', // Cyan
    category: 'Materials',
  },
  {
    key: 'flyDistance',
    name: 'Flight Toward Camera',
    type: 'number',
    default: 2.6,
    min: 0.0,
    max: 5.0,
    step: 0.1,
    category: 'Choreography',
    description: 'How far the butterfly rushes the camera before breaking up. Past ~4 it magnifies off the edges of frame',
  },
  {
    key: 'disperseSpread',
    name: 'Disintegration Spread',
    type: 'number',
    default: 1.0,
    min: 0.0,
    max: 3.0,
    step: 0.05,
    category: 'Choreography',
    description: 'How far samples scatter once the butterfly breaks apart into letters',
  },
  {
    key: 'disperseThinning',
    name: 'Disintegration Thinning',
    type: 'number',
    default: 25,
    min: 0,
    max: 90,
    step: 5,
    unit: '%',
    category: 'Choreography',
    description: 'How much of the cloud is dropped as it breaks up. The reference drops 72%, but it starts from ~4x our sample density',
  },
  {
    key: 'trailParticles',
    name: 'Trail Particles',
    type: 'number',
    default: 0,
    min: 0,
    max: 600,
    step: 25,
    category: 'Effects',
  },
  {
    key: 'wingDeepColor',
    name: 'Wing Root Color',
    type: 'color',
    default: '#0a1744',
    category: 'Materials',
    description: 'Deepest tone at the wing root; the chord gradient runs root -> base -> accent',
  },
  {
    key: 'veinDensity',
    name: 'Vein Density',
    type: 'number',
    default: 1.0,
    min: 0.0,
    max: 2.5,
    step: 0.05,
    category: 'Wing Detail',
  },
  {
    key: 'veinDarkness',
    name: 'Vein Darkness',
    type: 'number',
    default: 0.72,
    min: 0.0,
    max: 1.0,
    step: 0.02,
    category: 'Wing Detail',
  },
  {
    key: 'edgeDarkening',
    name: 'Margin Darkening',
    type: 'number',
    default: 0.85,
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Wing Detail',
    description: 'Darkened band along the outer wing margin',
  },
  {
    key: 'spotRow',
    name: 'Marginal Spot Row',
    type: 'number',
    default: 0.91,
    min: 0.5,
    max: 1.0,
    step: 0.01,
    category: 'Wing Detail',
  },
  {
    key: 'spotIntensity',
    name: 'Marginal Spot Brightness',
    type: 'number',
    default: 0.85,
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Wing Detail',
  },
  {
    key: 'wingShine',
    name: 'Wing Tip Emission',
    type: 'number',
    default: 0.12,
    min: 0.0,
    max: 1.0,
    step: 0.02,
    category: 'Lighting',
    description: 'Self-emission at the wing tips; lower this if the wings look waxy',
  },
  {
    key: 'chrysalisBaseColor',
    name: 'Chrysalis Base Color',
    type: 'color',
    default: '#0f3399',
    category: 'Chrysalis',
  },
  {
    key: 'chrysalisTipColor',
    name: 'Chrysalis Tip Color',
    type: 'color',
    default: '#4dc7ff',
    category: 'Chrysalis',
  },
  {
    key: 'crackGlowColor',
    name: 'Crack Glow Color',
    type: 'color',
    default: '#d9f7ff',
    category: 'Chrysalis',
  },
  {
    key: 'chrysalisGlow',
    name: 'Crack Glow Strength',
    type: 'number',
    default: 0.55,
    min: 0.0,
    max: 1.5,
    step: 0.05,
    category: 'Chrysalis',
  },
  {
    key: 'cinematicStages',
    name: 'Cinematic Metamorphosis Sequence',
    type: 'boolean',
    default: true,
    category: 'Choreography',
    description: 'Chrysalis shaking -> cracking open -> wing growth -> takeoff into camera',
  },
];

export const BUTTERFLY_PRESETS: Preset[] = [
  {
    id: 'morpho_blue',
    name: 'Morpho Peleides (Electric Blue)',
    sceneId: 'butterfly',
    rendererId: 'ascii',
    sceneParams: {
      flapSpeed: 2.4,
      flapAmplitude: 1.15,
      wingSpan: 1.9,
      bodyColor: '#bf7a29',
      wingBaseColor: '#1d4ed8',
      wingAccentColor: '#38bdf8',
      trailParticles: 0,
    },
    rendererParams: {
      charRamp: 'detailed',
      fontSize: 10,
      fontFamily: 'JetBrains Mono',
      embeddedMessage: 'morpho ',
      directionalEdges: true,
      edgeThreshold: 0.28,
      edgeBoost: 1.25,
      glitchEffect: true,
      glitchDuration: 0.45,
      specularPower: 22,
      multiscaleGlow: true,
      glowIntensity: 0.62,
      specularIntensity: 0.30,
      emissionBoost: 0.55,
      backgroundColor: '#05070e',
    },
    cameraParams: {
      distance: 5.0,
      fov: 42,
      elevation: 25,
      azimuth: 20,
      autoRotate: true,
      autoRotateSpeed: 4,
      targetY: 0.0,
    },
    overlayParams: {
      enabled: true,
      title: 'MORPHO PELEIDES',
      subtitle: 'LEPIDOPTERA // CHRYSALIS WING',
      watermark: '@ascii.studio',
      fontFamily: "'JetBrains Mono', monospace",
      titleSize: 42,
      subtitleSize: 18,
      watermarkSize: 16,
      color: '#38bdf8',
      opacity: 0.9,
      position: 'bottom',
      fadeInDuration: 0.8,
      fadeOutDuration: 0.8,
      subtleGlow: true,
    },
    duration: 10.0,
    fps: 30,
    aspectRatio: '9:16',
  },
  {
    id: 'monarch_amber',
    name: 'Monarch Migration (Halftone)',
    sceneId: 'butterfly',
    rendererId: 'halftone',
    sceneParams: {
      flapSpeed: 2.0,
      flapAmplitude: 1.05,
      wingSpan: 1.8,
      bodyColor: '#bf7a29',
      wingBaseColor: '#ea580c',
      wingAccentColor: '#facc15',
      trailParticles: 0,
    },
    rendererParams: {
      dotSize: 11,
      dotShape: 'circle',
      style: 'monochrome',
      paperColor: '#faf8f2',
      inkColor: '#18181b',
      contrast: 1.45,
      invert: true,
    },
    cameraParams: {
      distance: 5.2,
      fov: 40,
      elevation: 30,
      azimuth: 45,
      autoRotate: true,
      autoRotateSpeed: 3,
      targetY: 0.0,
    },
    duration: 10.0,
    fps: 30,
    aspectRatio: '9:16',
  },
  {
    id: 'cyber_moth',
    name: 'Cybernetic Lunar Moth (Dither)',
    sceneId: 'butterfly',
    rendererId: 'dither',
    sceneParams: {
      flapSpeed: 2.6,
      flapAmplitude: 1.25,
      wingSpan: 2.1,
      bodyColor: '#bf7a29',
      wingBaseColor: '#7c3aed',
      wingAccentColor: '#22d3ee',
      trailParticles: 0,
    },
    rendererParams: {
      pixelSize: 6,
      palette: 'cyberpunk',
      ditherMatrix: 'bayer4',
      ditherAmount: 1.1,
      contrast: 1.35,
    },
    cameraParams: {
      distance: 4.8,
      fov: 44,
      elevation: 20,
      azimuth: 0,
      autoRotate: true,
      autoRotateSpeed: 5,
      targetY: 0.0,
    },
    duration: 10.0,
    fps: 30,
    aspectRatio: '9:16',
  },
];

// --- Parametric wing geometry (ported from the Edward Jones reference) ---
// Each wing is a polar surface whose radius follows a Hermite spline through
// anatomical (angle, radius) keys, rather than a plain circular sector.

type WingKey = [number, number];

const FORE_KEYS: WingKey[] = [
  [-14, 0.82], [-4, 0.90], [10, 0.95], [24, 1.12], [36, 1.33],
  [43, 1.36], [50, 1.16], [58, 0.72], [66, 0.10],
];
const HIND_KEYS: WingKey[] = [
  [-88, 0.12], [-78, 0.62], [-66, 0.88], [-54, 0.97], [-42, 0.96],
  [-28, 0.90], [-12, 0.78], [4, 0.55], [14, 0.30],
];

const WING_U = 84;   // root -> tip
const WING_V = 130;  // leading -> trailing edge

/** Cubic Hermite through keys, with gradient-estimated tangents (np.gradient equivalent). */
function smoothCurve(keys: WingKey[], x: number): number {
  const n = keys.length;
  const xs = keys.map(k => k[0]);
  const ys = keys.map(k => k[1]);
  const m: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    if (i === 0) m[i] = (ys[1] - ys[0]) / (xs[1] - xs[0]);
    else if (i === n - 1) m[i] = (ys[n - 1] - ys[n - 2]) / (xs[n - 1] - xs[n - 2]);
    else m[i] = (ys[i + 1] - ys[i - 1]) / (xs[i + 1] - xs[i - 1]);
  }
  let i = 0;
  while (i < n - 2 && xs[i + 1] < x) i++;
  const h = xs[i + 1] - xs[i];
  const t = (x - xs[i]) / h;
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * ys[i]
       + (t3 - 2 * t2 + t) * h * m[i]
       + (3 * t2 - 2 * t3) * ys[i + 1]
       + (t3 - t2) * h * m[i + 1];
}

interface WingTemplate {
  lat: Float32Array;  // lateral extent, root-relative
  fwd: Float32Array;  // forward extent, root-relative
  rad: Float32Array;  // radial distance from root
  cu: Float32Array;   // 0 at root, 1 at tip
  vv: Float32Array;   // 0 at leading edge, 1 at trailing edge
  veins: number;      // vein count used to build this surface
}

function buildWingTemplate(keys: WingKey[], veins: number): WingTemplate {
  const N = WING_U * WING_V;
  const lat = new Float32Array(N), fwd = new Float32Array(N), rad = new Float32Array(N);
  const cu = new Float32Array(N), vv = new Float32Array(N);
  const a0 = keys[0][0], a1 = keys[keys.length - 1][0];
  for (let v = 0; v < WING_V; v++) {
    const vR = v / (WING_V - 1);
    const angDeg = a0 + (a1 - a0) * vR;
    // scalloped trailing edge, same modulation as the reference
    const r = Math.max(smoothCurve(keys, angDeg), 0.05)
            * (1 + 0.022 * Math.cos(vR * Math.PI * 2 * veins));
    const a = (angDeg * Math.PI) / 180;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (let u = 0; u < WING_U; u++) {
      const uR = u / (WING_U - 1);
      const rr = uR * r;
      const idx = u * WING_V + v;
      lat[idx] = rr * ca;
      fwd[idx] = rr * sa;
      rad[idx] = rr;
      cu[idx] = uR;
      vv[idx] = vR;
    }
  }
  return { lat, fwd, rad, cu, vv, veins };
}

/** Deterministic hash -> [0,1). Stands in for the reference's fixed-seed B_JIT / B_PID arrays. */
function h01(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** State of the end-of-sequence dispersal, shared by wings, body and antennae. */
interface Disperse {
  jitK: number;    // scatter magnitude, 0 before it starts
  flyFrac: number; // fraction of samples that have turned into airborne letters
  keepPct: number; // keep samples whose pid %% 100 is below this
}

/** Smoothstep, module scope (the scene has a local copy inside getSampleCloud). */
function sstep(a: number, b: number, x: number): number {
  const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
}

/** Everything that controls how a wing surface is shaded. */
interface WingStyle {
  deep: THREE.Color;
  base: THREE.Color;
  accent: THREE.Color;
  veinDensity: number;
  veinDark: number;
  edgeDark: number;
  spotRow: number;
  spotInt: number;
  shine: number;
}

/** Rz * Rx * Ry, row-major, matching the reference's rot(yaw, pitch, roll). */
function wingRotation(yaw: number, pitch: number, roll: number): number[] {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cx = Math.cos(pitch), sx = Math.sin(pitch);
  const cz = Math.cos(roll), sz = Math.sin(roll);
  // Ry
  const ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  // Rx
  const rx = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
  // Rz
  const rz = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
  const mul = (a: number[], b: number[]) => {
    const o = new Array(9).fill(0);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        for (let k = 0; k < 3; k++) o[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
    return o;
  };
  return mul(rz, mul(rx, ry));
}

const WING_TEMPLATES: WingTemplate[] = [
  buildWingTemplate(FORE_KEYS, 8),
  buildWingTemplate(HIND_KEYS, 7),
];

export class ButterflyScene implements IScene {
  public id = 'butterfly';
  public name = 'Butterfly Metamorphosis';
  public description = 'Anatomical lepidoptera simulation with harmonic flapping aerodynamics and shimmering particle dust';
  public category = 'Organic Life';
  public paramDefs = BUTTERFLY_PARAM_DEFS;
  public defaultParams: ParameterMap = BUTTERFLY_PARAM_DEFS.reduce((acc, p) => {
    acc[p.key] = p.default;
    return acc;
  }, {} as ParameterMap);
  public presets = BUTTERFLY_PRESETS;

  private sceneGroup = new THREE.Group();
  private leftWingGroup = new THREE.Group();
  private rightWingGroup = new THREE.Group();
  private bodyMesh!: THREE.Mesh;
  private headMesh!: THREE.Mesh;
  private antennaLeft!: THREE.Line;
  private antennaRight!: THREE.Line;
  private particles!: THREE.Points;
  private particlePositions!: Float32Array;
  private particleSeeds!: Float32Array;

  private wingMaterial!: THREE.MeshStandardMaterial;
  private bodyMaterial!: THREE.MeshStandardMaterial;
  private particleMaterial!: THREE.PointsMaterial;

  public init(ctx: SceneContext, params: ParameterMap): void {
    ctx.scene.add(this.sceneGroup);

    this.wingMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(params.wingBaseColor || '#2563eb'),
      roughness: 0.25,
      metalness: 0.3,
      side: THREE.DoubleSide,
    });

    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(params.bodyColor || '#1e1b4b'),
      roughness: 0.7,
      metalness: 0.1,
    });

    this.particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(params.wingAccentColor || '#38bdf8'),
      size: 0.05,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });

    // Body
    const bodyGeom = new THREE.CapsuleGeometry(0.08, 1.2, 8, 16);
    this.bodyMesh = new THREE.Mesh(bodyGeom, this.bodyMaterial);
    this.bodyMesh.rotation.x = Math.PI / 2;
    this.sceneGroup.add(this.bodyMesh);

    // Head
    const headGeom = new THREE.SphereGeometry(0.12, 12, 12);
    this.headMesh = new THREE.Mesh(headGeom, this.bodyMaterial);
    this.headMesh.position.set(0, 0, 0.7);
    this.sceneGroup.add(this.headMesh);

    // Antennae
    const curveL = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0.04, 0.05, 0.75),
      new THREE.Vector3(0.2, 0.35, 1.1),
      new THREE.Vector3(0.35, 0.5, 1.3)
    );
    const antennaGeomL = new THREE.BufferGeometry().setFromPoints(curveL.getPoints(16));
    this.antennaLeft = new THREE.Line(antennaGeomL, new THREE.LineBasicMaterial({ color: 0x38bdf8 }));
    this.sceneGroup.add(this.antennaLeft);

    const curveR = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.04, 0.05, 0.75),
      new THREE.Vector3(-0.2, 0.35, 1.1),
      new THREE.Vector3(-0.35, 0.5, 1.3)
    );
    const antennaGeomR = new THREE.BufferGeometry().setFromPoints(curveR.getPoints(16));
    this.antennaRight = new THREE.Line(antennaGeomR, new THREE.LineBasicMaterial({ color: 0x38bdf8 }));
    this.sceneGroup.add(this.antennaRight);

    // Build Wings
    this.sceneGroup.add(this.leftWingGroup);
    this.sceneGroup.add(this.rightWingGroup);
    this.buildWings(params);

    // Dust particles
    this.createParticles(params);
  }

  private createWingShape(isForewing: boolean): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    if (isForewing) {
      // Forewing curved apex
      shape.moveTo(0, 0);
      shape.bezierCurveTo(0.4, 0.2, 1.2, 0.8, 1.6, 1.4);
      shape.bezierCurveTo(1.7, 1.3, 1.5, 0.7, 1.2, 0.2);
      shape.bezierCurveTo(0.9, -0.1, 0.4, -0.1, 0, 0);
    } else {
      // Hindwing rounded scalloped
      shape.moveTo(0, 0);
      shape.bezierCurveTo(0.3, -0.2, 0.9, -0.4, 1.2, -0.7);
      shape.bezierCurveTo(1.1, -1.1, 0.6, -1.2, 0.2, -0.9);
      shape.bezierCurveTo(0.1, -0.6, 0.05, -0.2, 0, 0);
    }

    const geom = new THREE.ShapeGeometry(shape, 16);
    geom.computeVertexNormals();
    return geom;
  }

  private buildWings(params: ParameterMap): void {
    this.leftWingGroup.clear();
    this.rightWingGroup.clear();

    const forewingGeom = this.createWingShape(true);
    const hindwingGeom = this.createWingShape(false);

    // Left wings
    const leftFore = new THREE.Mesh(forewingGeom, this.wingMaterial);
    const leftHind = new THREE.Mesh(hindwingGeom, this.wingMaterial);
    this.leftWingGroup.add(leftFore);
    this.leftWingGroup.add(leftHind);
    this.leftWingGroup.position.set(0.08, 0, 0.1);

    // Right wings (mirrored on X)
    const rightFore = new THREE.Mesh(forewingGeom, this.wingMaterial);
    const rightHind = new THREE.Mesh(hindwingGeom, this.wingMaterial);
    rightFore.scale.x = -1;
    rightHind.scale.x = -1;
    this.rightWingGroup.add(rightFore);
    this.rightWingGroup.add(rightHind);
    this.rightWingGroup.position.set(-0.08, 0, 0.1);

    const span = params.wingSpan ?? 1.8;
    this.leftWingGroup.scale.set(span, span, span);
    this.rightWingGroup.scale.set(span, span, span);
  }

  private createParticles(params: ParameterMap): void {
    const count = params.trailParticles ?? 250;
    this.particlePositions = new Float32Array(count * 3);
    this.particleSeeds = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.particleSeeds[i * 3] = (Math.random() - 0.5) * 4;
      this.particleSeeds[i * 3 + 1] = (Math.random() - 0.5) * 4;
      this.particleSeeds[i * 3 + 2] = Math.random();
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particles = new THREE.Points(geom, this.particleMaterial);
    this.sceneGroup.add(this.particles);
  }

  public update(frameInfo: FrameInfo, params: ParameterMap): void {
    const { time, progress } = frameInfo;

    if (params.wingBaseColor) this.wingMaterial.color.set(params.wingBaseColor);
    if (params.bodyColor) this.bodyMaterial.color.set(params.bodyColor);
    if (params.wingAccentColor) this.particleMaterial.color.set(params.wingAccentColor);

    // Seamless loop flight cycle: integer number of wing flaps per loop!
    const loopDuration = frameInfo.duration;
    const baseFreq = params.flapSpeed ?? 2.2;
    // Round to exact integer flaps per loop so loop is 100% seamless
    const flapsPerLoop = Math.max(2, Math.round(baseFreq * loopDuration));
    const flapAngle = Math.sin(progress * Math.PI * 2 * flapsPerLoop) * (params.flapAmplitude ?? 1.1);

    // Flap wings symmetrically around Z
    this.leftWingGroup.rotation.z = flapAngle;
    this.rightWingGroup.rotation.z = -flapAngle;

    // Body gentle vertical bobbing in sync with flaps
    const bob = Math.sin(progress * Math.PI * 2 * flapsPerLoop + Math.PI / 2) * 0.15;
    this.sceneGroup.position.y = bob;

    // Body pitch roll
    this.sceneGroup.rotation.x = Math.sin(progress * Math.PI * 2) * 0.15;

    // Update trail particles
    if (this.particles && this.particlePositions) {
      const count = params.trailParticles ?? 250;
      for (let i = 0; i < count; i++) {
        const seedZ = this.particleSeeds[i * 3 + 2];
        const pTime = (progress + seedZ) % 1.0;
        const angle = pTime * Math.PI * 4 + i;
        const rad = 0.5 + pTime * 1.5;

        this.particlePositions[i * 3] = Math.cos(angle) * rad;
        this.particlePositions[i * 3 + 1] = bob - pTime * 2.5 + 0.5;
        this.particlePositions[i * 3 + 2] = Math.sin(angle) * rad - pTime * 1.5;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  public stages = [
    { id: 'chrysalis', name: 'Chrysalis Incubation', startTime: 0.0, endTime: 3.0, description: 'Chrysalis shaking and golden fissure glow' },
    { id: 'hatch', name: 'Emergence & Wing Growth', startTime: 3.0, endTime: 5.5, description: 'Shell fractures and wings unfurl' },
    { id: 'perch', name: 'Perch & Respiration', startTime: 5.5, endTime: 7.5, description: 'Gentle wing respiration on pedestal' },
    { id: 'takeoff', name: 'Flight & Dust Trail', startTime: 7.5, endTime: 10.0, description: 'Aerodynamic flight accelerating into camera' },
  ];

  /** Scratch buffer for analytic wing normals (one surface at a time). */
  private wingScratch = new Float32Array(WING_U * WING_V * 3);

  /**
   * Emit one wing surface (fore/hind x left/right) into the sample lists.
   * Normals come from the surface's own gradients, so the renderer's
   * diffuse / specular / rim terms actually vary across the wing.
   */
  private emitWingSurface(
    out: { pos: number[]; nrm: number[]; col: number[]; ao: number[]; ids: number[]; fly: number[]; glow: number[] },
    wi: number, side: number,
    flap: number, flapTip: number,
    size: number, grow: number, crumple: number,
    R: number[], // row-major 3x3: Rz * Rx * Ry
    offY: number, offZ: number,
    style: WingStyle,
    disp: Disperse,
    startId: number
  ): number {
    const tpl = WING_TEMPLATES[wi];
    const P = this.wingScratch;
    const N = WING_U * WING_V;
    const lift = wi === 0 ? 0.018 : -0.018;

    // 1. Local surface positions, with camber so the sheet is not planar.
    for (let i = 0; i < N; i++) {
      const cu = tpl.cu[i], vv = tpl.vv[i];
      const ang = flap + (flapTip - flap) * Math.pow(cu, 1.5); // tip lags the root
      const x = tpl.lat[i] * size;
      const wob = crumple * 0.1 * Math.sin(vv * 21 + cu * 9) * cu;
      const bow = 0.1 * Math.sin(cu * Math.PI) * grow + 0.012 * Math.cos(vv * 40) * cu + wob;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      P[i * 3] = side * (0.045 + x * ca - bow * sa);
      P[i * 3 + 1] = 0.08 - 0.06 * wi + tpl.fwd[i] * size;
      P[i * 3 + 2] = 0.02 + lift + x * sa + bow * ca;
    }

    // 2. Normals from finite differences, then yaw, then emit.
    let id = startId;
    for (let u = 0; u < WING_U; u++) {
      for (let v = 0; v < WING_V; v++) {
        const i = u * WING_V + v;
        const uA = (u > 0 ? u - 1 : u) * WING_V + v;
        const uB = (u < WING_U - 1 ? u + 1 : u) * WING_V + v;
        const vA = u * WING_V + (v > 0 ? v - 1 : v);
        const vB = u * WING_V + (v < WING_V - 1 ? v + 1 : v);

        const dux = P[uB * 3] - P[uA * 3];
        const duy = P[uB * 3 + 1] - P[uA * 3 + 1];
        const duz = P[uB * 3 + 2] - P[uA * 3 + 2];
        const dvx = P[vB * 3] - P[vA * 3];
        const dvy = P[vB * 3 + 1] - P[vA * 3 + 1];
        const dvz = P[vB * 3 + 2] - P[vA * 3 + 2];

        let nx = duy * dvz - duz * dvy;
        let ny = duz * dvx - dux * dvz;
        let nz = dux * dvy - duy * dvx;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;

        const px = P[i * 3], py = P[i * 3 + 1], pz = P[i * 3 + 2];
        const cu = tpl.cu[i];

        // End-of-sequence dispersal: thin the cloud out, then scatter what is left.
        if (disp.keepPct < 100 && id % 100 >= disp.keepPct) { id++; continue; }
        let wx = R[0] * px + R[1] * py + R[2] * pz;
        let wy = R[3] * px + R[4] * py + R[5] * pz + offY;
        let wz = R[6] * px + R[7] * py + R[8] * pz + offZ;
        if (disp.jitK > 0) {
          wx += (h01(id * 3) * 2 - 1) * 0.22 * disp.jitK;
          wy += (h01(id * 3 + 1) * 2 - 1) * 0.22 * disp.jitK;
          wz += (h01(id * 3 + 2) * 2 - 1) * 0.35 * disp.jitK;
        }
        out.pos.push(wx, wy, wz);
        out.nrm.push(
          R[0] * nx + R[1] * ny + R[2] * nz,
          R[3] * nx + R[4] * ny + R[5] * nz,
          R[6] * nx + R[7] * ny + R[8] * nz
        );
        const vvN = tpl.vv[i];
        const radial = tpl.rad[i];
        const veins = tpl.veins * style.veinDensity;

        // Three-stop chord gradient: root -> base -> accent
        const g = Math.min(1, cu * 1.15);
        let cr: number, cg: number, cb: number;
        if (g < 0.5) {
          const f = g * 2;
          cr = style.deep.r * (1 - f) + style.base.r * f;
          cg = style.deep.g * (1 - f) + style.base.g * f;
          cb = style.deep.b * (1 - f) + style.base.b * f;
        } else {
          const f = (g - 0.5) * 2;
          cr = style.base.r * (1 - f) + style.accent.r * f;
          cg = style.base.g * (1 - f) + style.accent.g * f;
          cb = style.base.b * (1 - f) + style.accent.b * f;
        }
        let ao = 0.45 + 0.55 * Math.pow(cu, 0.6);

        // Darkened outer margin, and the radial vein lattice
        const edge = style.edgeDark * sstep(
          0.8, 0.88,
          cu + 0.1 * sstep(0.72, 1.0, vvN) + 0.015 * Math.cos(vvN * Math.PI * 2 * veins)
        );
        const cell = veins > 0 ? (vvN * veins) % 1 : 0.5;
        const gap = Math.min(cell, 1 - cell);
        const isVein = veins > 0 && gap * radial < 0.0035 * veins && cu > 0.22 ? 1 : 0;
        const dark = Math.max(edge, isVein * style.veinDark);
        cr = cr * (1 - dark) + 0.05 * dark;
        cg = cg * (1 - dark) + 0.1 * dark;
        cb = cb * (1 - dark) + 0.36 * dark;
        ao *= 1 - 0.5 * dark;

        // Pale marginal spot row
        const phase = Math.abs(cell - 0.5);
        if (style.spotInt > 0 && Math.abs(cu - style.spotRow) < 0.026 && phase < 0.2) {
          const sI = style.spotInt;
          cr = cr * (1 - sI) + 1.0 * sI;
          cg = cg * (1 - sI) + 0.97 * sI;
          cb = cb * (1 - sI) + 0.88 * sI;
          ao = 0.9 + 0.35 * sI;
        }

        out.col.push(cr, cg, cb);
        out.ao.push(ao);
        out.ids.push(id);
        out.fly.push(disp.flyFrac > 0 && (id % 1000) / 1000 < disp.flyFrac ? 1 : 0);
        out.glow.push(cu > 0.8 ? style.shine : 0.0);
        id++;
      }
    }
    return id;
  }

  public getSampleCloud(frameInfo: FrameInfo, params: ParameterMap): any {
    const { time, progress, duration } = frameInfo;
    const isCinematic = Boolean(params.cinematicStages);

    const posList: number[] = [];
    const nrmList: number[] = [];
    const colList: number[] = [];
    const aoList: number[] = [];
    const idList: number[] = [];
    const flyingList: number[] = [];
    const glowList: number[] = [];
    let sampleId = 0;

    const wingBaseCol = new THREE.Color(params.wingBaseColor || '#1d4ed8');
    const wingAccentCol = new THREE.Color(params.wingAccentColor || '#38bdf8');
    const bodyCol = new THREE.Color(params.bodyColor || '#bf7a29');
    const antCol = new THREE.Color(params.antennaColor || '#ffc759');
    const wingDeepCol = new THREE.Color(params.wingDeepColor || '#0a1744');
    const chrysBase = new THREE.Color(params.chrysalisBaseColor || '#0f3399');
    const chrysTip = new THREE.Color(params.chrysalisTipColor || '#4dc7ff');
    const crackCol = new THREE.Color(params.crackGlowColor || '#d9f7ff');
    const chrysGlowK = params.chrysalisGlow ?? 0.55;

    const wingStyle: WingStyle = {
      deep: wingDeepCol,
      base: wingBaseCol,
      accent: wingAccentCol,
      veinDensity: params.veinDensity ?? 1.0,
      veinDark: params.veinDarkness ?? 0.72,
      edgeDark: params.edgeDarkening ?? 1.0,
      spotRow: params.spotRow ?? 0.91,
      spotInt: params.spotIntensity ?? 0.85,
      shine: params.wingShine ?? 0.12,
    };

    // Smoothstep helper
    const ss = (a: number, b: number, x: number) => {
      const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return k * k * (3 - 2 * k);
    };

    const HATCH = 3.3;
    const OPEN_END = 5.6;
    const FLY = 7.7;

    if (isCinematic) {
      // 1. Chrysalis Shell Phase (t < 5.5)
      if (time > 0.8 && time < HATCH + 2.5) {
        const s = ss(1.0, 2.5, time);
        const shiver = 0.05 * Math.sin(time * 46) * ss(2.5, HATCH, time) * (1 - ss(HATCH, HATCH + 0.4, time));
        const rotYaw = -0.9 + 0.95 * ss(1.0, HATCH + 0.2, time);

        const crackGlow = ss(2.5, HATCH + 0.1, time);

        // Sample Chrysalis Shell
        const SU = 140, SV = 160;
        for (let u = 0; u < SU; u++) {
          const vRatio = u / (SU - 1);
          const shy = -0.62 + vRatio * 1.24;
          const shr = Math.sin(vRatio * Math.PI) * 0.3 + 0.02;

          for (let v = 0; v < SV; v++) {
            const sha = (v / SV) * Math.PI * 2 - Math.PI;
            const seamDist = Math.abs(sha) / Math.PI;
            const shellDelay = HATCH + 0.85 * seamDist + 0.25 * (1 - vRatio);

            const tau = Math.max(0, time - shellDelay);
            const brk = Math.max(0, tau - 0.12);

            let px = shr * Math.sin(sha) * s;
            let py = shy * s;
            let pz = shr * Math.cos(sha) * s;

            // Yaw and shiver rotation
            const cosY = Math.cos(rotYaw), sinY = Math.sin(rotYaw);
            const rx = px * cosY + pz * sinY;
            const rz = -px * sinY + pz * cosY;
            px = rx;
            pz = rz;
            py += shiver;

            // Blow shards away if broken
            let isFlying = 0;
            if (brk > 0) {
              isFlying = 1;
              px += 1.2 * tau * tau + Math.sin(sampleId) * brk;
              py += 0.5 * tau * tau + Math.cos(sampleId) * brk;
              pz += 0.4 * tau * tau;
            }

            const glow = Math.exp(-Math.pow(seamDist / (0.02 + 0.13 * crackGlow), 2)) * crackGlow;

            posList.push(px, py, pz);
            nrmList.push(Math.sin(sha), 0, Math.cos(sha));
            colList.push(
              (chrysBase.r * (1 - vRatio) + chrysTip.r * vRatio) * (1 - glow) + crackCol.r * glow,
              (chrysBase.g * (1 - vRatio) + chrysTip.g * vRatio) * (1 - glow) + crackCol.g * glow,
              (chrysBase.b * (1 - vRatio) + chrysTip.b * vRatio) * (1 - glow) + crackCol.b * glow
            );
            aoList.push(0.9);
            idList.push(sampleId++);
            flyingList.push(isFlying);
            glowList.push(glow * chrysGlowK);
          }
        }
      }

      // 2. Butterfly Emergence & Flight Phase (t > HATCH)
      if (time >= HATCH) {
        const grow = ss(HATCH + 0.1, OPEN_END - 0.2, time);
        const wingScale = 0.15 + 0.85 * grow;
        const flyProgress = Math.max(0, Math.min(1.6, (time - FLY) / 1.25));

        // Flap angle as a function of time, so the tip can lag the root
        const flapAt = (tt: number): number => {
          let deg = 87 - 69 * ss(HATCH + 0.45, OPEN_END, tt);
          deg += 7 * Math.sin((2 * Math.PI * (tt - OPEN_END)) / 1.8) * ss(5.5, 6.2, tt) * (1 - ss(FLY - 0.5, FLY - 0.2, tt));
          const bt = ss(FLY - 0.45, FLY, tt);
          deg += bt * (14 - 48 * Math.cos((2 * Math.PI * (tt - FLY + 0.45)) / 0.62));
          return (deg * Math.PI) / 180;
        };
        const flapRad = flapAt(time);
        const flapTipRad = flapAt(time - 0.09);
        const crumple = Math.pow(1 - grow, 1.4);

        // End-of-sequence dispersal (reference: scatter from FLY+0.95, letters from FLY+0.65)
        const spread = params.disperseSpread ?? 1.0;
        const flyDist = params.flyDistance ?? 2.6;
        const tauD = Math.max(0, time - (FLY + 0.95));
        const disp: Disperse = {
          jitK: tauD > 0 ? Math.pow(tauD, 1.2) * 1.5 * spread : 0,
          flyFrac: ss(FLY + 0.65, FLY + 1.05, time),
          keepPct: 100 - (params.disperseThinning ?? 25) * ss(8.6, 9.1, time),
        };

        // Position offsets
        const yaw = 0.75 - 1.25 * ss(HATCH, 7.4, time) + 0.45 * ss(7.3, 8.6, time);
        const pitch = -0.08 - 0.42 * ss(HATCH, OPEN_END, time) + 0.62 * ss(FLY - 0.2, FLY + 1.0, time);
        const hover = 0.035 * Math.sin(time * 2.4) * ss(HATCH, OPEN_END, time);
        const roll = 0.1 * Math.sin(time * 1.3) * ss(HATCH, OPEN_END, time) - 0.18 * ss(FLY, FLY + 0.8, time);
        const wingR = wingRotation(yaw, pitch, roll);

        // Forewings and hindwings, both sides: 4 parametric surfaces
        const wingSize = (params.wingSpan ?? 1.8) * wingScale * 0.40;
        const flyZ = flyProgress > 0 ? flyDist * Math.pow(flyProgress, 2.2) : 0;
        const flyY = flyProgress > 0 ? -0.15 * Math.sin(Math.min(flyProgress, 1) * Math.PI) : 0;
        const wingOut = { pos: posList, nrm: nrmList, col: colList, ao: aoList, ids: idList, fly: flyingList, glow: glowList };
        for (let wi = 0; wi < 2; wi++) {
          for (const side of [-1, 1]) {
            sampleId = this.emitWingSurface(
              wingOut, wi, side, flapRad, flapTipRad, wingSize, grow, crumple,
              wingR, hover + flyY, flyZ, wingStyle, disp, sampleId
            );
          }
        }

        // Butterfly Body & Head
        for (let b = 0; b < 40; b++) {
          const by = -0.3 + (b / 39) * 0.6;
          const br = 0.04 * Math.sin((b / 39) * Math.PI);
          for (let ba = 0; ba < 8; ba++) {
            const theta = (ba / 8) * Math.PI * 2;
            let px = br * Math.cos(theta);
            let py = by + hover;
            let pz = br * Math.sin(theta);
            if (flyProgress > 0) pz += flyDist * Math.pow(flyProgress, 2.2);

            if (disp.keepPct < 100 && sampleId % 100 >= disp.keepPct) { sampleId++; continue; }
            if (disp.jitK > 0) {
              px += (h01(sampleId * 3) * 2 - 1) * 0.22 * disp.jitK;
              py += (h01(sampleId * 3 + 1) * 2 - 1) * 0.22 * disp.jitK;
              pz += (h01(sampleId * 3 + 2) * 2 - 1) * 0.35 * disp.jitK;
            }

            posList.push(px, py, pz);
            nrmList.push(Math.cos(theta), 0, Math.sin(theta));
            colList.push(bodyCol.r, bodyCol.g, bodyCol.b);
            aoList.push(0.8);
            idList.push(sampleId);
            flyingList.push(disp.flyFrac > 0 && (sampleId % 1000) / 1000 < disp.flyFrac ? 1 : 0);
            glowList.push(0.0);
            sampleId++;
          }
        }

        // Antennae: two swept clubs, brighter than the body (reference emits 2 x 260)
        const AN = 180;
        const antScale = 0.5 + 0.5 * grow;
        for (const sd of [-1, 1]) {
          for (let a = 0; a < AN; a++) {
            const aq = a / (AN - 1);
            const ax = sd * (0.015 + 0.175 * Math.pow(aq, 1.3)) * antScale;
            const ay = (0.24 + 0.31 * aq) * antScale + 0.135 * (1 - grow) + hover;
            let az = (0.03 + 0.07 * aq - 0.05 * Math.pow(aq, 3)) * antScale;
            if (flyProgress > 0) az += flyDist * Math.pow(flyProgress, 2.2);
            if (disp.keepPct < 100 && sampleId % 100 >= disp.keepPct) { sampleId++; continue; }
            let jx = ax, jy = ay, jz = az;
            if (disp.jitK > 0) {
              jx += (h01(sampleId * 3) * 2 - 1) * 0.22 * disp.jitK;
              jy += (h01(sampleId * 3 + 1) * 2 - 1) * 0.22 * disp.jitK;
              jz += (h01(sampleId * 3 + 2) * 2 - 1) * 0.35 * disp.jitK;
            }
            const club = aq > 0.93 ? 1.5 : 1.0; // thickened, brighter club at the tip
            posList.push(jx, jy, jz);
            nrmList.push(0, 0, 1);
            colList.push(
              Math.min(1, antCol.r * club),
              Math.min(1, antCol.g * club),
              Math.min(1, antCol.b * club)
            );
            aoList.push(1.0);
            idList.push(sampleId);
            flyingList.push(disp.flyFrac > 0 && (sampleId % 1000) / 1000 < disp.flyFrac ? 1 : 0);
            glowList.push(aq > 0.93 ? 0.25 : 0.0);
            sampleId++;
          }
        }
      }
    } else {
      // Continuous Flight Loop
      const flapAngle = Math.sin(progress * Math.PI * 2 * (params.flapSpeed ?? 2.2)) * (params.flapAmplitude ?? 1.1);
      const bob = Math.sin(progress * Math.PI * 4) * 0.15;

      const loopOut = { pos: posList, nrm: nrmList, col: colList, ao: aoList, ids: idList, fly: flyingList, glow: glowList };
      const loopSize = (params.wingSpan ?? 1.8) * 0.40;
      const loopR = wingRotation(0, -0.35, 0);
      const loopTip = Math.sin((progress - 0.009) * Math.PI * 2 * (params.flapSpeed ?? 2.2)) * (params.flapAmplitude ?? 1.1);
      for (let wi = 0; wi < 2; wi++) {
        for (const side of [-1, 1]) {
          sampleId = this.emitWingSurface(
            loopOut, wi, side, flapAngle, loopTip, loopSize, 1, 0,
            loopR, bob, 0, wingStyle, { jitK: 0, flyFrac: 0, keepPct: 100 }, sampleId
          );
        }
      }
    }

    // Trailing Dust Particles
    const dustCount = params.trailParticles ?? 0;
    for (let d = 0; d < dustCount; d++) {
      const dProg = (progress + d / dustCount) % 1.0;
      const angle = dProg * Math.PI * 4 + d;
      const rad = 0.3 + dProg * 1.2;

      const px = Math.cos(angle) * rad;
      const py = -dProg * 2.5 + 0.5;
      const pz = Math.sin(angle) * rad - dProg * 1.5;

      posList.push(px, py, pz);
      nrmList.push(0, 0, 1);
      colList.push(wingAccentCol.r, wingAccentCol.g, wingAccentCol.b);
      aoList.push(1.0);
      idList.push(sampleId++);
      flyingList.push(1);
      glowList.push(0.8);
    }

    return {
      positions: new Float32Array(posList),
      normals: new Float32Array(nrmList),
      colors: new Float32Array(colList),
      ambientOcclusion: new Float32Array(aoList),
      ids: new Int32Array(idList),
      flying: new Uint8Array(flyingList),
      glow: new Float32Array(glowList),
    };
  }

  public onResize(_width: number, _height: number): void {}

  public dispose(): void {
    if (this.bodyMesh) this.bodyMesh.geometry.dispose();
    if (this.headMesh) this.headMesh.geometry.dispose();
    if (this.particles) this.particles.geometry.dispose();
    this.wingMaterial.dispose();
    this.bodyMaterial.dispose();
    this.particleMaterial.dispose();
    if (this.sceneGroup.parent) this.sceneGroup.parent.remove(this.sceneGroup);
  }
}
