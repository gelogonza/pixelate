import * as THREE from 'three';
import type { FrameInfo, GeometrySampleCloud, IScene, ParameterDefinition, ParameterMap, Preset, SceneContext } from '../types';

export const GALAXY_PARAM_DEFS: ParameterDefinition[] = [
  {
    key: 'armCount',
    name: 'Spiral Arm Count',
    type: 'number',
    default: 4,
    min: 2,
    max: 8,
    step: 1,
    category: 'Astrophysics',
  },
  {
    key: 'spiralTightness',
    name: 'Arm Curvature & Wind',
    type: 'number',
    default: 2.8,
    min: 1.0,
    max: 5.0,
    step: 0.2,
    category: 'Astrophysics',
  },
  {
    key: 'spinSpeed',
    name: 'Galactic Rotation Rate',
    type: 'number',
    default: 1.2,
    min: 0.2,
    max: 4.0,
    step: 0.1,
    category: 'Kinematics',
  },
  {
    key: 'supernovaPulse',
    name: 'Core Shockwave Expansion',
    type: 'number',
    default: 1.4,
    min: 0.2,
    max: 3.0,
    step: 0.1,
    category: 'Kinematics',
  },
  {
    key: 'starCount',
    name: 'Stellar Particle Count',
    type: 'number',
    default: 800,
    min: 200,
    max: 1800,
    step: 100,
    category: 'Stars',
  },
  {
    key: 'coreColor',
    name: 'Supernova Core Color',
    type: 'color',
    default: '#fde047', // Brilliant stellar yellow
    category: 'Colors',
  },
  {
    key: 'armColor',
    name: 'Spiral Arm Nebulae',
    type: 'color',
    default: '#38bdf8', // Cyan-blue interstellar gas
    category: 'Colors',
  },
  {
    key: 'dustColor',
    name: 'Outer Cosmic Dust',
    type: 'color',
    default: '#c084fc', // Violet dust
    category: 'Colors',
  },
];

export const GALAXY_PRESETS: Preset[] = [
  {
    id: 'andromeda_singularity',
    name: 'Andromeda Supernova (ASCII)',
    sceneId: 'galaxy_supernova',
    rendererId: 'ascii',
    sceneParams: {
      armCount: 4,
      spiralTightness: 3.0,
      spinSpeed: 1.2,
      supernovaPulse: 1.5,
      starCount: 900,
      coreColor: '#fef08a',
      armColor: '#38bdf8',
      dustColor: '#a855f7',
    },
    rendererParams: {
      charRamp: 'classic',
      fontSize: 9,
      fontFamily: 'JetBrains Mono',
      embeddedMessage: 'cosmos ',
      directionalEdges: true,
      edgeThreshold: 0.25,
      edgeBoost: 1.35,
      glitchEffect: true,
      glitchDuration: 0.4,
      multiscaleGlow: true,
      glowIntensity: 0.95,
      specularPower: 26,
      backgroundColor: '#020307',
    },
    cameraParams: {
      distance: 5.5,
      fov: 46,
      elevation: 35,
      azimuth: 25,
      autoRotate: true,
      autoRotateSpeed: 12,
      targetY: 0.0,
    },
    overlayParams: {
      enabled: true,
      title: 'SUPERNOVA 1987A',
      subtitle: 'COLLAPSING STELLAR CORE // TYPE II',
      watermark: '@ascii.studio',
      fontFamily: "'JetBrains Mono', monospace",
      titleSize: 42,
      subtitleSize: 18,
      watermarkSize: 16,
      color: '#fef08a',
      opacity: 0.95,
      position: 'bottom',
      fadeInDuration: 0.8,
      fadeOutDuration: 0.8,
      subtleGlow: true,
    },
    duration: 6.0,
    fps: 30,
    aspectRatio: '9:16',
  },
  {
    id: 'cassiopeia_halftone',
    name: 'Cassiopeia Remnant (Halftone)',
    sceneId: 'galaxy_supernova',
    rendererId: 'halftone',
    sceneParams: {
      armCount: 3,
      spiralTightness: 2.6,
      spinSpeed: 1.0,
      supernovaPulse: 1.3,
      starCount: 750,
      coreColor: '#ea580c',
      armColor: '#fbbf24',
      dustColor: '#ef4444',
    },
    rendererParams: {
      dotSize: 10,
      dotShape: 'circle',
      style: 'monochrome',
      paperColor: '#faf8f2',
      inkColor: '#1c1917',
      contrast: 1.45,
      invert: true,
    },
    cameraParams: {
      distance: 5.6,
      fov: 44,
      elevation: 40,
      azimuth: 45,
      autoRotate: true,
      autoRotateSpeed: 10,
      targetY: 0.0,
    },
    duration: 6.0,
    fps: 30,
    aspectRatio: '9:16',
  },
  {
    id: 'cyber_nebula',
    name: 'Cybernetic Nebula (Dither)',
    sceneId: 'galaxy_supernova',
    rendererId: 'dither',
    sceneParams: {
      armCount: 5,
      spiralTightness: 3.4,
      spinSpeed: 1.5,
      supernovaPulse: 1.6,
      starCount: 1100,
      coreColor: '#f43f5e',
      armColor: '#06b6d4',
      dustColor: '#8b5cf6',
    },
    rendererParams: {
      pixelSize: 5,
      palette: 'cyberpunk',
      ditherMatrix: 'bayer4',
      ditherAmount: 1.25,
      contrast: 1.4,
    },
    cameraParams: {
      distance: 5.2,
      fov: 45,
      elevation: 30,
      azimuth: 10,
      autoRotate: true,
      autoRotateSpeed: 15,
      targetY: 0.0,
    },
    duration: 6.0,
    fps: 30,
    aspectRatio: '9:16',
  },
];

export class GalaxySupernovaScene implements IScene {
  public id = 'galaxy_supernova';
  public name = 'Celestial Supernova Galaxy';
  public description = 'Logarithmic multi-arm spiral galaxy with central collapsing supernova star core, expanding relativistic shockwave ring, and cosmic dust';
  public category = 'Cosmic';
  public paramDefs = GALAXY_PARAM_DEFS;
  public defaultParams: ParameterMap = GALAXY_PARAM_DEFS.reduce((acc, p) => {
    acc[p.key] = p.default;
    return acc;
  }, {} as ParameterMap);
  public presets = GALAXY_PRESETS;

  public stages = [
    { id: 'quiescent', name: 'Quiescent Spiral', startTime: 0.0, endTime: 2.5, description: 'Logarithmic galaxy rotating gracefully' },
    { id: 'collapse', name: 'Core Collapse', startTime: 2.5, endTime: 4.5, description: 'Stellar core implosion and sudden flash' },
    { id: 'explosion', name: 'Supernova Shockwave', startTime: 4.5, endTime: 7.5, description: 'Relativistic blastwave tearing through spiral arms' },
    { id: 'remnant', name: 'Nebular Remnant', startTime: 7.5, endTime: 10.0, description: 'Glowing expanding nebula with newborn pulsar' },
  ];

  private sceneGroup = new THREE.Group();
  private coreMesh!: THREE.Mesh;
  private shockwaveMesh!: THREE.Mesh;
  private starPoints!: THREE.Points;
  private starPositions!: Float32Array;
  private starSeeds!: Float32Array;

  private coreMaterial!: THREE.MeshStandardMaterial;
  private shockMaterial!: THREE.MeshBasicMaterial;
  private starMaterial!: THREE.PointsMaterial;

  public init(ctx: SceneContext, params: ParameterMap): void {
    ctx.scene.add(this.sceneGroup);

    this.coreMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(params.coreColor || '#fde047'),
      emissive: new THREE.Color(params.coreColor || '#fde047'),
      emissiveIntensity: 1.0,
      roughness: 0.1,
    });

    this.shockMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(params.coreColor || '#fde047'),
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });

    this.starMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(params.armColor || '#38bdf8'),
      size: 0.06,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    // 1. Supernova Core Star
    const coreGeom = new THREE.SphereGeometry(0.35, 24, 24);
    this.coreMesh = new THREE.Mesh(coreGeom, this.coreMaterial);
    this.sceneGroup.add(this.coreMesh);

    // 2. Expanding Shockwave Ring
    const shockGeom = new THREE.RingGeometry(0.3, 0.45, 48);
    this.shockwaveMesh = new THREE.Mesh(shockGeom, this.shockMaterial);
    this.shockwaveMesh.rotation.x = Math.PI / 2;
    this.sceneGroup.add(this.shockwaveMesh);

    // 3. Galactic Stars
    this.createStars(params);
  }

  private createStars(params: ParameterMap): void {
    const count = params.starCount ?? 800;
    this.starPositions = new Float32Array(count * 3);
    this.starSeeds = new Float32Array(count * 4); // armIdx, rSeed, thickness, speed

    const arms = params.armCount ?? 4;
    for (let i = 0; i < count; i++) {
      this.starSeeds[i * 4] = Math.floor(Math.random() * arms); // arm index
      this.starSeeds[i * 4 + 1] = Math.pow(Math.random(), 1.5); // radius along arm
      this.starSeeds[i * 4 + 2] = (Math.random() - 0.5) * 0.2;  // vertical thickness
      this.starSeeds[i * 4 + 3] = 0.8 + Math.random() * 0.4;   // speed
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.starPositions, 3));
    this.starPoints = new THREE.Points(geom, this.starMaterial);
    this.sceneGroup.add(this.starPoints);
  }

  public update(frameInfo: FrameInfo, params: ParameterMap): void {
    const { progress, time } = frameInfo;

    const spin = progress * Math.PI * 2 * (params.spinSpeed ?? 1.2);
    this.sceneGroup.rotation.y = spin;

    // Supernova Core Pulse
    const shockPhase = (progress * 2) % 1.0;
    const shockScale = 0.5 + shockPhase * 4.5 * (params.supernovaPulse ?? 1.4);
    this.shockwaveMesh.scale.set(shockScale, shockScale, shockScale);
    this.shockMaterial.opacity = Math.max(0, 1.0 - shockPhase);

    const coreBreath = 0.35 + 0.12 * Math.sin(time * 6.0);
    this.coreMesh.scale.set(coreBreath, coreBreath, coreBreath);

    // Update Stars in spiral arms
    if (this.starPoints && this.starPositions) {
      const count = params.starCount ?? 800;
      const arms = params.armCount ?? 4;
      const tightness = params.spiralTightness ?? 2.8;

      for (let i = 0; i < count; i++) {
        const arm = this.starSeeds[i * 4];
        const rRatio = this.starSeeds[i * 4 + 1];
        const zOff = this.starSeeds[i * 4 + 2];

        const radius = 0.4 + rRatio * 2.8;
        const theta = (arm / arms) * Math.PI * 2 + Math.log(radius) * tightness;

        this.starPositions[i * 3] = Math.cos(theta) * radius;
        this.starPositions[i * 3 + 1] = zOff * (1 - rRatio * 0.5);
        this.starPositions[i * 3 + 2] = Math.sin(theta) * radius;
      }
      this.starPoints.geometry.attributes.position.needsUpdate = true;
    }
  }

  public getSampleCloud(frameInfo: FrameInfo, params: ParameterMap): GeometrySampleCloud {
    const { progress, time } = frameInfo;

    const posList: number[] = [];
    const nrmList: number[] = [];
    const colList: number[] = [];
    const aoList: number[] = [];
    const idList: number[] = [];
    const flyingList: number[] = [];
    const glowList: number[] = [];
    let sampleId = 0;

    const coreCol = new THREE.Color(params.coreColor || '#fde047');
    const armCol = new THREE.Color(params.armColor || '#38bdf8');
    const dustCol = new THREE.Color(params.dustColor || '#c084fc');

    const spin = progress * Math.PI * 2 * (params.spinSpeed ?? 1.2);
    const cosSpin = Math.cos(spin), sinSpin = Math.sin(spin);

    // 1. Supernova Core Star Samples
    const CORE_POINTS = 80;
    const corePulse = 0.35 + 0.15 * Math.sin(time * 6.0);
    for (let i = 0; i < CORE_POINTS; i++) {
      const u = (i / CORE_POINTS) * Math.PI * 2;
      const v = Math.asin((i % 9) / 4.5 - 1);
      const px = corePulse * Math.cos(v) * Math.cos(u);
      const py = corePulse * Math.sin(v);
      const pz = corePulse * Math.cos(v) * Math.sin(u);

      posList.push(px * cosSpin + pz * sinSpin, py, -px * sinSpin + pz * cosSpin);
      nrmList.push(px, py, pz);
      colList.push(coreCol.r, coreCol.g, coreCol.b);
      aoList.push(1.0);
      idList.push(sampleId++);
      flyingList.push(0);
      glowList.push(1.0); // Maximum emission core
    }

    // 2. Shockwave Ring Samples
    const shockPhase = (progress * 2) % 1.0;
    const shockRadius = 0.5 + shockPhase * 4.0;
    const RING_POINTS = 64;
    for (let r = 0; r < RING_POINTS; r++) {
      const theta = (r / RING_POINTS) * Math.PI * 2;
      const px = Math.cos(theta) * shockRadius;
      const pz = Math.sin(theta) * shockRadius;

      posList.push(px * cosSpin + pz * sinSpin, 0, -px * sinSpin + pz * cosSpin);
      nrmList.push(0, 1, 0);
      colList.push(coreCol.r, coreCol.g, coreCol.b);
      aoList.push(1.0);
      idList.push(sampleId++);
      flyingList.push(1);
      glowList.push(0.85);
    }

    // 3. Logarithmic Spiral Galactic Arms
    const starCount = params.starCount ?? 800;
    const arms = params.armCount ?? 4;
    const tightness = params.spiralTightness ?? 2.8;

    for (let i = 0; i < starCount; i++) {
      const armIdx = i % arms;
      const rRatio = Math.sqrt((i + 1) / starCount);
      const radius = 0.35 + rRatio * 2.8;
      const theta = (armIdx / arms) * Math.PI * 2 + Math.log(radius) * tightness;
      const zOff = ((i % 17) / 17 - 0.5) * 0.25 * (1 - rRatio * 0.5);

      const px = Math.cos(theta) * radius;
      const py = zOff;
      const pz = Math.sin(theta) * radius;

      // Color gradient from bright arm center to outer dust
      const curCol = new THREE.Color().lerpColors(armCol, dustCol, rRatio);

      // Rotate with galaxy
      const rx = px * cosSpin + pz * sinSpin;
      const rz = -px * sinSpin + pz * cosSpin;

      posList.push(rx, py, rz);
      nrmList.push(0, 1, 0);
      colList.push(curCol.r, curCol.g, curCol.b);
      aoList.push(0.7 + 0.3 * (1 - rRatio));
      idList.push(sampleId++);
      flyingList.push(rRatio > 0.8 ? 1 : 0);
      glowList.push(rRatio < 0.3 ? 0.6 : 0.2);
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
    if (this.coreMesh) this.coreMesh.geometry.dispose();
    if (this.shockwaveMesh) this.shockwaveMesh.geometry.dispose();
    if (this.starPoints) this.starPoints.geometry.dispose();
    this.coreMaterial.dispose();
    this.shockMaterial.dispose();
    this.starMaterial.dispose();
    if (this.sceneGroup.parent) this.sceneGroup.parent.remove(this.sceneGroup);
  }
}
