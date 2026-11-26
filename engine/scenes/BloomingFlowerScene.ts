import * as THREE from 'three';
import type { FrameInfo, IScene, ParameterDefinition, ParameterMap, Preset, SceneContext } from '../types';

export const FLOWER_PARAM_DEFS: ParameterDefinition[] = [
  {
    key: 'petalCount',
    name: 'Petals Per Whorl',
    type: 'number',
    default: 8,
    min: 4,
    max: 16,
    step: 1,
    category: 'Geometry',
  },
  {
    key: 'whorlCount',
    name: 'Petal Layers (Whorls)',
    type: 'number',
    default: 4,
    min: 2,
    max: 6,
    step: 1,
    category: 'Geometry',
  },
  {
    key: 'petalLength',
    name: 'Petal Scale',
    type: 'number',
    default: 1.8,
    min: 0.8,
    max: 3.0,
    step: 0.1,
    category: 'Geometry',
  },
  {
    key: 'petalCurl',
    name: 'Petal Curl & Arch',
    type: 'number',
    default: 0.85,
    min: 0.0,
    max: 2.0,
    step: 0.05,
    category: 'Bloom Dynamics',
  },
  {
    key: 'bloomOpenness',
    name: 'Max Bloom Aperture',
    type: 'number',
    default: 1.15,
    min: 0.2,
    max: 2.0,
    step: 0.05,
    category: 'Bloom Dynamics',
  },
  {
    key: 'bloomSpeed',
    name: 'Cycle Multiplier',
    type: 'number',
    default: 1.0,
    min: 0.5,
    max: 3.0,
    step: 0.5,
    category: 'Bloom Dynamics',
  },
  {
    key: 'windSway',
    name: 'Organic Wind Sway',
    type: 'number',
    default: 0.25,
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Motion',
  },
  {
    key: 'stamenCount',
    name: 'Stamen Density',
    type: 'number',
    default: 48,
    min: 12,
    max: 120,
    step: 6,
    category: 'Flower Core',
  },
  {
    key: 'pollenCount',
    name: 'Pollen Particles',
    type: 'number',
    default: 0,
    min: 0,
    max: 800,
    step: 50,
    category: 'Particles',
  },
  {
    key: 'pollenSpeed',
    name: 'Pollen Swirl Speed',
    type: 'number',
    default: 1.2,
    min: 0.2,
    max: 3.0,
    step: 0.1,
    category: 'Particles',
  },
  {
    key: 'cinematicStages',
    name: 'Cinematic Choreography',
    type: 'boolean',
    default: false,
    category: 'Choreography',
    description: 'Enables 5-stage cinematic sequence: Cursor -> Bud -> Bloom -> Dispersal -> Outro',
  },
  {
    key: 'petalBaseColor',
    name: 'Petal Base Color',
    type: 'color',
    default: '#9333ea', // Royal Purple
    category: 'Colors & Materials',
  },
  {
    key: 'petalMidColor',
    name: 'Petal Mid Color',
    type: 'color',
    default: '#a21caf',
    category: 'Materials',
    description: 'Second of four chord stops (root -> mid -> blush -> tip)',
  },
  {
    key: 'petalBlushColor',
    name: 'Petal Blush Color',
    type: 'color',
    default: '#f43f5e',
    category: 'Materials',
    description: 'Third of four chord stops; the ramp needs real luminance range or the layers merge',
  },
  {
    key: 'petalTipColor',
    name: 'Petal Tip Color',
    type: 'color',
    default: '#fb7185', // Radiant Rose
    category: 'Colors & Materials',
  },
  {
    key: 'coreColor',
    name: 'Core & Stamen Color',
    type: 'color',
    default: '#fbbf24', // Golden Amber
    category: 'Colors & Materials',
  },
  {
    key: 'stemColor',
    name: 'Stem & Calyx Color',
    type: 'color',
    default: '#15803d', // Botanical Green
    category: 'Colors & Materials',
  },
  {
    key: 'roughness',
    name: 'Material Velvet Roughness',
    type: 'number',
    default: 0.35,
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Colors & Materials',
  },
];

export const FLOWER_PRESETS: Preset[] = [
  {
    id: 'lotus_noir',
    name: 'Midnight Lotus (ASCII Classic)',
    sceneId: 'blooming_flower',
    rendererId: 'ascii',
    sceneParams: {
      petalCount: 9,
      whorlCount: 4,
      petalLength: 1.9,
      petalCurl: 0.95,
      bloomOpenness: 1.25,
      bloomSpeed: 1.0,
      windSway: 0.25,
      stamenCount: 54,
      pollenCount: 0,
      pollenSpeed: 1.2,
      petalBaseColor: '#3b0764',
      petalMidColor: '#a21caf',
      petalBlushColor: '#f43f5e',
      petalTipColor: '#fecdd3',
      coreColor: '#facc15',
      stemColor: '#166534',
      roughness: 0.35,
    },
    rendererParams: {
      charRamp: 'classic',
      fontSize: 10,
      fontFamily: 'JetBrains Mono',
      embeddedMessage: 'become ',
      directionalEdges: true,
      edgeThreshold: 0.28,
      edgeBoost: 1.25,
      glitchEffect: true,
      glitchDuration: 0.45,
      specularPower: 22,
      multiscaleGlow: true,
      glowIntensity: 0.85,
      backgroundColor: '#05070e',
    },
    cameraParams: {
      distance: 5.2,
      fov: 42,
      elevation: 48,
      azimuth: 40,
      autoRotate: true,
      autoRotateSpeed: 16,
      targetY: 0.3,
    },
    overlayParams: {
      enabled: true,
      title: 'FLORA MORTIS',
      subtitle: 'SPECIMEN 01 — MIDNIGHT LOTUS',
      watermark: '@ascii.studio',
      fontFamily: "'JetBrains Mono', monospace",
      titleSize: 42,
      subtitleSize: 18,
      watermarkSize: 16,
      color: '#ffffff',
      opacity: 0.9,
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
    id: 'cyber_chrysanthemum',
    name: 'Cyberpunk Dahlia (Neon)',
    sceneId: 'blooming_flower',
    rendererId: 'ascii',
    sceneParams: {
      petalCount: 12,
      whorlCount: 5,
      petalLength: 2.1,
      petalCurl: 1.1,
      bloomOpenness: 1.35,
      bloomSpeed: 1.0,
      windSway: 0.35,
      stamenCount: 72,
      pollenCount: 0,
      pollenSpeed: 1.8,
      petalBaseColor: '#4c1d95',
      petalTipColor: '#06b6d4',
      coreColor: '#f43f5e',
      stemColor: '#0e7490',
      roughness: 0.2,
    },
    rendererParams: {
      charRamp: 'matrix',
      fontSize: 9,
      fontFamily: 'JetBrains Mono',
      embeddedMessage: 'matrix ',
      directionalEdges: true,
      edgeThreshold: 0.25,
      edgeBoost: 1.35,
      glitchEffect: true,
      glitchDuration: 0.5,
      specularPower: 26,
      multiscaleGlow: true,
      glowIntensity: 1.1,
      backgroundColor: '#03050a',
    },
    cameraParams: {
      distance: 5.6,
      fov: 40,
      elevation: 28,
      azimuth: 15,
      autoRotate: true,
      autoRotateSpeed: 20,
      targetY: 0.25,
    },
    overlayParams: {
      enabled: true,
      title: 'NEO-FLORA // 2099',
      subtitle: 'CYBERPUNK CHRYSANTHEMUM',
      watermark: 'RENDER: ASCII-STUDIO',
      fontFamily: "'JetBrains Mono', monospace",
      titleSize: 40,
      subtitleSize: 18,
      watermarkSize: 15,
      color: '#38bdf8',
      opacity: 0.95,
      position: 'top',
      fadeInDuration: 0.6,
      fadeOutDuration: 0.6,
      subtleGlow: true,
    },
    duration: 6.0,
    fps: 30,
    aspectRatio: '9:16',
  },
  {
    id: 'golden_solar_rose',
    name: 'Golden Solar Rose (Halftone)',
    sceneId: 'blooming_flower',
    rendererId: 'halftone',
    sceneParams: {
      petalCount: 10,
      whorlCount: 4,
      petalLength: 1.7,
      petalCurl: 0.8,
      bloomOpenness: 1.1,
      bloomSpeed: 1.0,
      windSway: 0.2,
      stamenCount: 60,
      pollenCount: 0,
      pollenSpeed: 1.0,
      petalBaseColor: '#b45309',
      petalTipColor: '#fef08a',
      coreColor: '#f59e0b',
      stemColor: '#14532d',
      roughness: 0.3,
    },
    rendererParams: {
      dotSize: 10,
      dotShape: 'circle',
      style: 'monochrome',
      paperColor: '#faf8f2',
      inkColor: '#1c1917',
      contrast: 1.5,
      invert: true,
    },
    cameraParams: {
      distance: 5.0,
      fov: 44,
      elevation: 25,
      azimuth: 60,
      autoRotate: true,
      autoRotateSpeed: 14,
      targetY: 0.2,
    },
    overlayParams: {
      enabled: true,
      title: 'SOLARIS FLORA',
      subtitle: 'RISOGRAPH EDITION',
      watermark: '@ascii.studio',
      fontFamily: "'Space Grotesk', sans-serif",
      titleSize: 44,
      subtitleSize: 18,
      watermarkSize: 16,
      color: '#ffffff',
      opacity: 0.85,
      position: 'bottom',
      fadeInDuration: 0.8,
      fadeOutDuration: 0.8,
      subtleGlow: false,
    },
    duration: 6.0,
    fps: 30,
    aspectRatio: '9:16',
  },
];

// Petal sampling resolution. Was 16 x 12 (192 per petal), which left the
// ASCII grid mostly empty and gave the renderer nothing to shade.
const PETAL_U = 44;
const PETAL_V = 28;

/** Deterministic hash -> [0,1), for per-petal variation. */
function ph01(n: number): number {
  let x = Math.imul(n ^ 0x6d2b79f5, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export class BloomingFlowerScene implements IScene {
  /** Scratch for one petal's base surface, used to derive analytic normals. */
  private petalScratch = new Float32Array(PETAL_U * PETAL_V * 3);

  public id = 'blooming_flower';
  public name = 'Blooming Flower';
  public description = 'Organic procedural floral bloom with parametric curved petals, Fermat stamen spiral and vortex pollen';
  public category = 'Organic Life';
  public paramDefs = FLOWER_PARAM_DEFS;
  public defaultParams: ParameterMap = FLOWER_PARAM_DEFS.reduce((acc, p) => {
    acc[p.key] = p.default;
    return acc;
  }, {} as ParameterMap);
  public presets = FLOWER_PRESETS;

  private sceneGroup = new THREE.Group();
  private stemMesh!: THREE.Mesh;
  private calyxGroup = new THREE.Group();
  private flowerHeadGroup = new THREE.Group();
  private petalMeshes: Array<{
    mesh: THREE.Mesh;
    whorlIdx: number;
    petalIdx: number;
    initialRotZ: number;
    initialRotY: number;
    baseScale: number;
  }> = [];
  private stamenInstancedMesh!: THREE.InstancedMesh;
  private pistilMesh!: THREE.Mesh;
  private pollenParticles!: THREE.Points;
  private pollenPositions!: Float32Array;
  private pollenSeeds!: Float32Array;

  private petalMaterial!: THREE.MeshStandardMaterial;
  private stemMaterial!: THREE.MeshStandardMaterial;
  private coreMaterial!: THREE.MeshStandardMaterial;
  private pollenMaterial!: THREE.PointsMaterial;

  public init(ctx: SceneContext, params: ParameterMap): void {
    ctx.scene.add(this.sceneGroup);

    // 1. Materials
    this.petalMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(params.petalBaseColor || '#9333ea'),
      roughness: params.roughness ?? 0.35,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    this.stemMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(params.stemColor || '#15803d'),
      roughness: 0.6,
      metalness: 0.05,
    });

    this.coreMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(params.coreColor || '#fbbf24'),
      roughness: 0.3,
      metalness: 0.2,
      emissive: new THREE.Color(params.coreColor || '#fbbf24'),
      emissiveIntensity: 0.4,
    });

    this.pollenMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(params.coreColor || '#fbbf24'),
      size: 0.06,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    // 2. Stem (Curved Tube)
    this.createStem();

    // 3. Flower Head Group
    this.sceneGroup.add(this.flowerHeadGroup);
    this.flowerHeadGroup.position.set(0, 0, 0);

    // 4. Build Petals
    this.rebuildPetals(params);

    // 5. Flower Core (Stamens & Pistil)
    this.createCore(params);

    // 6. Pollen Particles
    this.createPollen(params);
  }

  private createStem(): void {
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -3.5, 0),
      new THREE.Vector3(0.08, -2.5, 0.05),
      new THREE.Vector3(-0.06, -1.2, -0.04),
      new THREE.Vector3(0.04, -0.4, 0.02),
      new THREE.Vector3(0, 0, 0),
    ]);
    const stemGeom = new THREE.TubeGeometry(stemCurve, 32, 0.07, 12, false);
    this.stemMesh = new THREE.Mesh(stemGeom, this.stemMaterial);
    this.sceneGroup.add(this.stemMesh);

    // Calyx sepals (leaves under flower)
    this.calyxGroup.clear();
    const sepalGeom = this.createPetalGeometry(0.6, 0.22, 0.4);
    for (let i = 0; i < 5; i++) {
      const sepal = new THREE.Mesh(sepalGeom, this.stemMaterial);
      const angle = (i / 5) * Math.PI * 2;
      sepal.rotation.y = angle;
      sepal.rotation.z = Math.PI * 0.45;
      sepal.position.set(0, -0.05, 0);
      this.calyxGroup.add(sepal);
    }
    this.sceneGroup.add(this.calyxGroup);
  }

  /**
   * Generates a curved 3D petal mesh with central ridge, organic curvature, and scalloped edges
   */
  private createPetalGeometry(length: number, width: number, curl: number): THREE.BufferGeometry {
    const geom = new THREE.PlaneGeometry(width, length, 12, 24);
    const pos = geom.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Normalize v along length from base (0) to tip (1)
      const v = (y + length / 2) / length;
      const u = x / (width / 2); // -1 to 1

      // Petal outline taper: tear-drop shape (wide in middle, tapered at base and tip)
      const widthFactor = Math.sin(Math.pow(v, 0.7) * Math.PI);
      x *= widthFactor;

      // Centerline cup / arch: cupping across transverse direction
      z -= (1 - u * u) * 0.15 * widthFactor;

      // Longitudinal arch & curl backwards at tip
      z += Math.sin(v * Math.PI * 0.8) * 0.2 * curl;
      if (v > 0.6) {
        // Tip curl outwards
        const tipT = (v - 0.6) / 0.4;
        z -= tipT * tipT * 0.4 * curl;
      }

      // Shift base to origin (0, 0, 0)
      y += length / 2;

      pos.setXYZ(i, x, y, z);
    }

    geom.computeVertexNormals();
    return geom;
  }

  private rebuildPetals(params: ParameterMap): void {
    // Clear existing
    this.petalMeshes.forEach(p => {
      this.flowerHeadGroup.remove(p.mesh);
      p.mesh.geometry.dispose();
    });
    this.petalMeshes = [];

    const whorlCount = Math.min(6, Math.max(2, Math.round(params.whorlCount ?? 4)));
    const petalsPerWhorl = Math.min(16, Math.max(4, Math.round(params.petalCount ?? 8)));
    const petalLength = params.petalLength ?? 1.8;
    const petalCurl = params.petalCurl ?? 0.85;

    for (let w = 0; w < whorlCount; w++) {
      // Whorl 0 is innermost (smallest, most upright), Whorl outer is largest
      const whorlRatio = (w + 1) / whorlCount;
      const curLength = petalLength * (0.45 + 0.55 * whorlRatio);
      const curWidth = curLength * (0.35 + 0.15 * whorlRatio);

      const petalGeom = this.createPetalGeometry(curLength, curWidth, petalCurl);
      const count = Math.round(petalsPerWhorl + w * 2);
      const whorlOffsetAngle = (w * 137.5 * Math.PI) / 180; // Golden angle stagger

      for (let p = 0; p < count; p++) {
        const mesh = new THREE.Mesh(petalGeom, this.petalMaterial);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const angle = (p / count) * Math.PI * 2 + whorlOffsetAngle;
        const initialRotZ = (0.2 + 0.6 * whorlRatio); // Unfurl tilt from vertical
        const baseScale = 0.8 + 0.4 * whorlRatio;

        mesh.rotation.y = angle;
        mesh.position.set(0, 0.05 * w, 0);

        this.flowerHeadGroup.add(mesh);
        this.petalMeshes.push({
          mesh,
          whorlIdx: w,
          petalIdx: p,
          initialRotZ,
          initialRotY: angle,
          baseScale,
        });
      }
    }
  }

  private createCore(params: ParameterMap): void {
    // Central Pistil
    const pistilGeom = new THREE.CylinderGeometry(0.08, 0.16, 0.45, 16);
    this.pistilMesh = new THREE.Mesh(pistilGeom, this.coreMaterial);
    this.pistilMesh.position.set(0, 0.2, 0);
    this.flowerHeadGroup.add(this.pistilMesh);

    // Stamens in Fermat Golden Spiral
    const stamenCount = params.stamenCount ?? 48;
    const filamentGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6);
    this.stamenInstancedMesh = new THREE.InstancedMesh(filamentGeom, this.coreMaterial, stamenCount);

    const dummy = new THREE.Object3D();
    const goldenAngle = 137.507764 * (Math.PI / 180);

    for (let i = 0; i < stamenCount; i++) {
      const r = Math.sqrt(i / stamenCount) * 0.35;
      const theta = i * goldenAngle;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      const y = 0.12 + (1 - r) * 0.1;

      dummy.position.set(x, y, z);
      dummy.rotation.x = Math.sin(theta) * 0.2;
      dummy.rotation.z = -Math.cos(theta) * 0.2;
      dummy.scale.set(1, 0.8 + Math.random() * 0.4, 1);
      dummy.updateMatrix();

      this.stamenInstancedMesh.setMatrixAt(i, dummy.matrix);
    }
    this.stamenInstancedMesh.instanceMatrix.needsUpdate = true;
    this.flowerHeadGroup.add(this.stamenInstancedMesh);
  }

  private createPollen(params: ParameterMap): void {
    const count = params.pollenCount ?? 300;
    this.pollenPositions = new Float32Array(count * 3);
    this.pollenSeeds = new Float32Array(count * 4); // xSeed, ySeed, zSeed, speedSeed

    for (let i = 0; i < count; i++) {
      this.pollenSeeds[i * 4] = (Math.random() - 0.5) * 3;
      this.pollenSeeds[i * 4 + 1] = Math.random() * 4;
      this.pollenSeeds[i * 4 + 2] = (Math.random() - 0.5) * 3;
      this.pollenSeeds[i * 4 + 3] = 0.5 + Math.random() * 1.0;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.pollenPositions, 3));
    this.pollenParticles = new THREE.Points(geom, this.pollenMaterial);
    this.sceneGroup.add(this.pollenParticles);
  }

  public update(frameInfo: FrameInfo, params: ParameterMap): void {
    const { time, duration, progress } = frameInfo;

    // 1. Update colors dynamically from params
    if (params.petalBaseColor) this.petalMaterial.color.set(params.petalBaseColor);
    if (params.roughness !== undefined) this.petalMaterial.roughness = params.roughness;
    if (params.stemColor) this.stemMaterial.color.set(params.stemColor);
    if (params.coreColor) {
      this.coreMaterial.color.set(params.coreColor);
      this.coreMaterial.emissive.set(params.coreColor);
      this.pollenMaterial.color.set(params.coreColor);
    }

    // 2. Deterministic Seamless Looping Bloom Motion
    // Using smooth sinusoidal easing: 0 -> 1 -> 0 perfectly continuous across loop boundary
    const cycleMultiplier = params.bloomSpeed ?? 1.0;
    const loopPhase = (progress * cycleMultiplier) % 1.0;
    // Smooth cosine wave: 0 at start, 1.0 at midpoint (peak bloom), 0 at end
    const rawBloom = 0.5 - 0.5 * Math.cos(loopPhase * Math.PI * 2);
    // Add organic breathing harmonic
    const breath = 0.05 * Math.sin(time * 3.0);
    const maxAperture = params.bloomOpenness ?? 1.15;
    const bloom = Math.max(0.05, (rawBloom + breath) * maxAperture);

    // 3. Gentle Wind Sway
    const windSway = params.windSway ?? 0.25;
    const swayX = Math.sin(time * 1.5) * 0.08 * windSway;
    const swayZ = Math.cos(time * 1.2) * 0.06 * windSway;
    this.flowerHeadGroup.rotation.x = swayX;
    this.flowerHeadGroup.rotation.z = swayZ;

    // 4. Update Petals Unfurling & Flutter
    const petalCurl = params.petalCurl ?? 0.85;
    for (let i = 0; i < this.petalMeshes.length; i++) {
      const p = this.petalMeshes[i];
      const whorlRatio = (p.whorlIdx + 1) / (params.whorlCount ?? 4);

      // Staggered bloom: inner petals open slightly earlier than outer petals
      const staggeredBloom = Math.min(1.0, Math.max(0.0, bloom * 1.2 - (1 - whorlRatio) * 0.2));

      // Organic petal flutter
      const flutter = Math.sin(time * 4.0 + p.petalIdx * 0.8) * 0.03 * windSway;

      // Rotation around local radial axis (opening outward)
      const targetAngleZ = (p.initialRotZ * staggeredBloom * 1.2 + flutter);
      p.mesh.rotation.z = targetAngleZ;

      // Scale expansion during bloom
      const scaleS = p.baseScale * (0.6 + 0.4 * staggeredBloom);
      p.mesh.scale.set(scaleS, scaleS * (0.7 + 0.3 * staggeredBloom), scaleS);
    }

    // 5. Update Pistil & Stamens
    if (this.pistilMesh) {
      const coreScale = 0.8 + 0.3 * bloom;
      this.pistilMesh.scale.set(coreScale, coreScale, coreScale);
    }

    // 6. Update Pollen Particles Vortex (Deterministic Seamless Loop)
    const pollenCount = params.pollenCount ?? 300;
    if (this.pollenParticles && this.pollenPositions) {
      const swirlSpeed = params.pollenSpeed ?? 1.2;
      for (let i = 0; i < pollenCount; i++) {
        const seedX = this.pollenSeeds[i * 4];
        const seedY = this.pollenSeeds[i * 4 + 1];
        const seedZ = this.pollenSeeds[i * 4 + 2];
        const speed = this.pollenSeeds[i * 4 + 3] * swirlSpeed;

        // Loop progress for this particle
        const particleTime = (progress * speed + seedY) % 1.0;
        const currentY = particleTime * 4.0 - 0.5;

        // Vortex spiral
        const angle = particleTime * Math.PI * 4 + seedX * 2.0;
        const radius = 0.3 + particleTime * 1.2;
        const currentX = Math.cos(angle) * radius + seedX * 0.2;
        const currentZ = Math.sin(angle) * radius + seedZ * 0.2;

        this.pollenPositions[i * 3] = currentX;
        this.pollenPositions[i * 3 + 1] = currentY;
        this.pollenPositions[i * 3 + 2] = currentZ;
      }
      this.pollenParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  public stages = [
    { id: 'intro', name: 'Terminal Initiation', startTime: 0.0, endTime: 1.5, description: 'Cursor blinking and command bloom()' },
    { id: 'bud', name: 'Bud Formation', startTime: 1.5, endTime: 3.5, description: 'Tender bud shaking with golden fissure emissions' },
    { id: 'bloom', name: 'Peak Floral Unfurling', startTime: 3.5, endTime: 7.0, description: 'Fibonacci whorls expanding with organic curl' },
    { id: 'dispersal', name: 'Wind Dispersal Burst', startTime: 7.0, endTime: 9.5, description: 'Petals dissolving into swirling glowing typographic letters' },
    { id: 'outro', name: 'Terminal Settle', startTime: 9.5, endTime: 10.0, description: 'Return to terminal prompt' },
  ];

  public getSampleCloud(frameInfo: FrameInfo, params: ParameterMap): any {
    const { time, progress, duration } = frameInfo;
    const isCinematic = Boolean(params.cinematicStages);

    // Calculate bloom expansion factor
    let bloom = 0.0;
    let isDispersing = false;
    let blowProgress = 0.0;

    if (isCinematic) {
      // 5-stage timeline
      if (time < 1.0) {
        // Intro phase - minimal point presence
        bloom = 0.05;
      } else if (time < 3.0) {
        // Bud emergence
        const t = (time - 1.0) / 2.0;
        bloom = 0.15 + 0.25 * t * t * (3 - 2 * t);
      } else if (time < 7.0) {
        // Main blooming peak
        const t = (time - 3.0) / 4.0;
        bloom = 0.4 + 0.75 * Math.sin(t * Math.PI * 0.5);
      } else if (time < 9.5) {
        // Dispersal into wind
        bloom = 1.15;
        isDispersing = true;
        blowProgress = (time - 7.0) / 2.5;
      } else {
        bloom = 0.05;
      }
    } else {
      // Seamless continuous loop
      const cycleMultiplier = params.bloomSpeed ?? 1.0;
      const loopPhase = (progress * cycleMultiplier) % 1.0;
      const rawBloom = 0.5 - 0.5 * Math.cos(loopPhase * Math.PI * 2);
      const breath = 0.05 * Math.sin(time * 3.0);
      bloom = Math.max(0.1, (rawBloom + breath) * (params.bloomOpenness ?? 1.15));
    }

    const whorlCount = Math.min(5, Math.max(2, Math.round(params.whorlCount ?? 4)));
    const petalsPerWhorl = Math.min(12, Math.max(4, Math.round(params.petalCount ?? 8)));
    const petalCurl = params.petalCurl ?? 0.85;

    const baseCol = new THREE.Color(params.petalBaseColor || '#9333ea');
    const tipCol = new THREE.Color(params.petalTipColor || '#fb7185');
    const midCol = new THREE.Color(params.petalMidColor || '#a21caf');
    const blushCol = new THREE.Color(params.petalBlushColor || '#f43f5e');
    // Four-stop chord ramp, as in bloom3d.py. A straight two-colour lerp gave
    // the petals too little luminance sweep for the layers to read apart.
    const STOP_R = [baseCol.r, midCol.r, blushCol.r, tipCol.r];
    const STOP_G = [baseCol.g, midCol.g, blushCol.g, tipCol.g];
    const STOP_B = [baseCol.b, midCol.b, blushCol.b, tipCol.b];
    const coreCol = new THREE.Color(params.coreColor || '#fbbf24');

    const posList: number[] = [];
    const nrmList: number[] = [];
    const colList: number[] = [];
    const aoList: number[] = [];
    const idList: number[] = [];
    const flyingList: number[] = [];
    const glowList: number[] = [];

    let sampleId = 0;
    const U_STEPS = PETAL_U;
    const V_STEPS = PETAL_V;

    // 1. Parametric Petals
    for (let w = 0; w < whorlCount; w++) {
      const whorlRatio = (w + 1) / whorlCount;
      const curLength = (params.petalLength ?? 1.8) * (0.5 + 0.5 * whorlRatio) * (0.3 + 0.7 * bloom);
      const curWidth = curLength * (0.35 + 0.15 * whorlRatio);
      const petalCount = Math.max(4, Math.round(petalsPerWhorl * (0.5 + 0.12 * w)));
      const whorlOffset = (w * 137.5 * Math.PI) / 180;

      // Dispersal delay per whorl (outer whorls blow away first)
      const whorlBlowDelay = 0.2 * (whorlCount - w);
      const whorlBlow = isDispersing ? Math.max(0, (blowProgress - whorlBlowDelay) * 1.5) : 0;

      for (let p = 0; p < petalCount; p++) {
        const petalAngle = (p / petalCount) * Math.PI * 2 + whorlOffset + (time * 0.1);
        // --- Arc-integrated petal (ported from bloom3d.py) ---------------
        // The petal is a strip of fixed arc length whose tangent angle phi
        // sweeps from near-vertical at the base to `alpha` at the tip, so it
        // bends outward progressively instead of running straight out on a
        // cone. rho/zz are the running integral of that tangent.
        // Normalised layer index, 0 innermost -> 1 outermost. The reference's
        // four layers run open 26->80 deg, L 0.46->1.00, curl 0.20->0.70.
        const lr = whorlCount > 1 ? w / (whorlCount - 1) : 1;

        // Per-petal variation (reference jitters theta, L, t0 and tint)
        const seed = w * 131 + p * 17;
        const jTheta = (ph01(seed) * 2 - 1) * 0.1;
        const jLen = 0.95 + ph01(seed + 1) * 0.1;
        const jProg = (ph01(seed + 2) * 2 - 1) * 0.12;
        const jTint = 0.82 + ph01(seed + 3) * 0.3;
        const stagger = (1 - lr) * 0.22;
        const pk = Math.max(0, Math.min(1, (bloom + jProg - stagger) / (1 - stagger)));
        const prog = pk * pk * (3 - 2 * pk);
        const openRad = (26 + 54 * lr) * (Math.PI / 180);
        const alpha = Math.PI / 30 + (openRad - Math.PI / 30) * prog;
        const curlAmt = petalCurl * (0.2 + 0.5 * lr) * prog;
        const L = (params.petalLength ?? 1.8) * (0.46 + 0.54 * lr) * 0.55 * jLen;
        const Wd = (params.petalLength ?? 1.8) * (0.2 + 0.1 * lr) * 0.55;
        const du = 1 / (U_STEPS - 1);

        const phiArr = new Float64Array(U_STEPS);
        const rhoArr = new Float64Array(U_STEPS);
        const zzArr = new Float64Array(U_STEPS);
        let accR = 0, accZ = 0;
        for (let ui = 0; ui < U_STEPS; ui++) {
          const u = ui * du;
          const phi = alpha * (0.25 + 0.75 * u) + curlAmt * u * u;
          phiArr[ui] = phi;
          accR += Math.sin(phi) * du * L;
          accZ += Math.cos(phi) * du * L;
          rhoArr[ui] = accR;
          zzArr[ui] = accZ;
        }

        // Pass 1: base surface into scratch, before wind, so normals come from
        // the real geometry rather than a per-petal constant.
        const PS = this.petalScratch;
        const cosPA = Math.cos(petalAngle + jTheta), sinPA = Math.sin(petalAngle + jTheta);
        for (let ui = 0; ui < U_STEPS; ui++) {
          const u = ui * du;
          const phi = phiArr[ui];
          const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi);
          // width taper along the petal
          const wq = Wd * Math.pow(Math.sin(Math.PI * Math.pow(u, 1.6)), 0.7);
          for (let vi = 0; vi < V_STEPS; vi++) {
            const v = (vi / (V_STEPS - 1)) * 2 - 1;
            const offT = v * wq;             // across the petal
            const offN = 0.55 * v * v * wq;  // cupped cross-section
            const R = 0.04 + rhoArr[ui] - offN * cosPhi;
            const Zc = zzArr[ui] + offN * sinPhi;
            const i = (ui * V_STEPS + vi) * 3;
            PS[i] = R * cosPA - offT * sinPA;
            PS[i + 1] = Zc + w * 0.03;  // our Y is the reference's Z
            PS[i + 2] = R * sinPA + offT * cosPA;
          }
        }

        // Pass 2: normals from surface gradients, then wind, then emit.
        for (let ui = 0; ui < U_STEPS; ui++) {
          const u = ui * du;
          const g = Math.min(1, u * 1.15) * 3;
          const si = Math.min(2, Math.floor(g));
          const sf = g - si;
          const curR = STOP_R[si] * (1 - sf) + STOP_R[si + 1] * sf;
          const curG = STOP_G[si] * (1 - sf) + STOP_G[si + 1] * sf;
          const curB = STOP_B[si] * (1 - sf) + STOP_B[si + 1] * sf;
          const tint = (0.85 + 0.15 * lr) * jTint;

          for (let vi = 0; vi < V_STEPS; vi++) {
            const v = (vi / (V_STEPS - 1)) * 2 - 1;
            const idx = ui * V_STEPS + vi;
            const uA = ((ui > 0 ? ui - 1 : ui) * V_STEPS + vi) * 3;
            const uB = ((ui < U_STEPS - 1 ? ui + 1 : ui) * V_STEPS + vi) * 3;
            const vA = (ui * V_STEPS + (vi > 0 ? vi - 1 : vi)) * 3;
            const vB = (ui * V_STEPS + (vi < V_STEPS - 1 ? vi + 1 : vi)) * 3;

            const dux = PS[uB] - PS[uA], duy = PS[uB + 1] - PS[uA + 1], duz = PS[uB + 2] - PS[uA + 2];
            const dvx = PS[vB] - PS[vA], dvy = PS[vB + 1] - PS[vA + 1], dvz = PS[vB + 2] - PS[vA + 2];

            let nx = duy * dvz - duz * dvy;
            let ny = duz * dvx - dux * dvz;
            let nz = dux * dvy - duy * dvx;
            const nl = Math.hypot(nx, ny, nz) || 1;
            nx /= nl; ny /= nl; nz /= nl;

            let px = PS[idx * 3], py = PS[idx * 3 + 1], pz = PS[idx * 3 + 2];

            let isFlying = 0;
            if (whorlBlow > 0.01) {
              isFlying = 1;
              px += 1.8 * Math.pow(whorlBlow, 1.8);
              py += 0.6 * Math.pow(whorlBlow, 1.5);
              pz += 0.4 * Math.sin(sampleId);
            }

            // AO: brighter toward the tip, darker in the cupped centre line
            const ao = (0.25 + 0.75 * Math.pow(u, 0.8)) * (1 - 0.35 * Math.pow(Math.abs(v), 3));

            posList.push(px, py, pz);
            nrmList.push(nx, ny, nz);
            colList.push(curR * tint, curG * tint, curB * tint);
            aoList.push(ao);
            idList.push(sampleId);
            flyingList.push(isFlying);
            glowList.push(u > 0.85 ? 0.35 : 0.0);

            sampleId++;
          }
        }
      }
    }

    // 2. Core Stamens (Fermat Spiral)
    const stamenCount = params.stamenCount ?? 60;
    const goldenAngle = 137.508 * (Math.PI / 180);

    for (let i = 0; i < stamenCount; i++) {
      const rRatio = Math.sqrt((i + 0.5) / stamenCount);
      const r = rRatio * 0.35 * Math.min(1.0, bloom * 1.5);
      const theta = i * goldenAngle + time * 0.05;

      const sx = Math.cos(theta) * r;
      const sz = Math.sin(theta) * r;
      const sy = 0.12 + (1 - rRatio) * 0.15;

      posList.push(sx, sy, sz);
      nrmList.push(0, 1, 0);
      colList.push(coreCol.r, coreCol.g, coreCol.b);
      aoList.push(1.0);
      idList.push(sampleId++);
      flyingList.push(0);
      glowList.push(0.85); // Glowing amber core
    }

    // 3. Pollen Dust Particles
    const pollenCount = params.pollenCount ?? 200;
    for (let p = 0; p < pollenCount; p++) {
      const pProgress = (progress * (params.pollenSpeed ?? 1.2) + p / pollenCount) % 1.0;
      const pR = 0.2 + pProgress * 1.4;
      const pAngle = pProgress * Math.PI * 4 + p * 2.1;

      const px = Math.cos(pAngle) * pR;
      const py = pProgress * 3.5 - 0.2;
      const pz = Math.sin(pAngle) * pR;

      posList.push(px, py, pz);
      nrmList.push(0, 0, 1);
      colList.push(coreCol.r, coreCol.g, coreCol.b);
      aoList.push(1.0);
      idList.push(sampleId++);
      flyingList.push(1); // Flying particle uses letter glyph
      glowList.push(0.7);
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
    this.petalMeshes.forEach(p => {
      this.flowerHeadGroup.remove(p.mesh);
      p.mesh.geometry.dispose();
    });
    this.petalMeshes = [];

    if (this.stemMesh) {
      this.sceneGroup.remove(this.stemMesh);
      this.stemMesh.geometry.dispose();
    }
    if (this.stamenInstancedMesh) {
      this.flowerHeadGroup.remove(this.stamenInstancedMesh);
      this.stamenInstancedMesh.geometry.dispose();
    }
    if (this.pistilMesh) {
      this.flowerHeadGroup.remove(this.pistilMesh);
      this.pistilMesh.geometry.dispose();
    }
    if (this.pollenParticles) {
      this.sceneGroup.remove(this.pollenParticles);
      this.pollenParticles.geometry.dispose();
    }
    this.petalMaterial.dispose();
    this.stemMaterial.dispose();
    this.coreMaterial.dispose();
    this.pollenMaterial.dispose();
    if (this.sceneGroup.parent) this.sceneGroup.parent.remove(this.sceneGroup);
  }
}
