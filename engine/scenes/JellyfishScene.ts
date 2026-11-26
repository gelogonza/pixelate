import * as THREE from 'three';
import type { FrameInfo, IScene, ParameterDefinition, ParameterMap, Preset, SceneContext } from '../types';

export const JELLYFISH_PARAM_DEFS: ParameterDefinition[] = [
  {
    key: 'pulseSpeed',
    name: 'Pulse Frequency',
    type: 'number',
    default: 1.0,
    min: 0.5,
    max: 3.0,
    step: 0.1,
    category: 'Motion',
  },
  {
    key: 'pulseStrength',
    name: 'Pulse Contraction',
    type: 'number',
    default: 0.35,
    min: 0.1,
    max: 0.7,
    step: 0.05,
    category: 'Motion',
  },
  {
    key: 'tentacleCount',
    name: 'Tentacle Count',
    type: 'number',
    default: 24,
    min: 8,
    max: 48,
    step: 4,
    category: 'Anatomy',
  },
  {
    key: 'tentacleLength',
    name: 'Tentacle Length',
    type: 'number',
    default: 3.5,
    min: 1.5,
    max: 6.0,
    step: 0.2,
    category: 'Anatomy',
  },
  {
    key: 'bellColor',
    name: 'Bell Outer Color',
    type: 'color',
    default: '#06b6d4', // Bioluminescent Cyan
    category: 'Materials',
  },
  {
    key: 'coreGlowColor',
    name: 'Internal Organ Glow',
    type: 'color',
    default: '#ec4899', // Hot Pink
    category: 'Materials',
  },
  {
    key: 'ambientParticles',
    name: 'Marine Snow Particles',
    type: 'number',
    default: 0,
    min: 0,
    max: 800,
    step: 50,
    category: 'Atmosphere',
  },
];

export const JELLYFISH_PRESETS: Preset[] = [
  {
    id: 'abyss_bioluminescence',
    name: 'Abyssal Aurelia (ASCII Neon)',
    sceneId: 'jellyfish',
    rendererId: 'ascii',
    sceneParams: {
      pulseSpeed: 1.0,
      pulseStrength: 0.35,
      tentacleCount: 28,
      tentacleLength: 3.8,
      bellColor: '#06b6d4',
      coreGlowColor: '#f43f5e',
      ambientParticles: 0,
    },
    rendererParams: {
      charSet: 'detailed',
      cellSize: 8,
      fontFamily: 'JetBrains Mono',
      colorMode: 'original',
      foregroundColor: '#38bdf8',
      backgroundColor: '#030509',
      brightness: 0.1,
      contrast: 1.35,
      invert: false,
      glow: true,
      glowIntensity: 6,
    },
    cameraParams: {
      distance: 5.5,
      fov: 44,
      elevation: 15,
      azimuth: 30,
      autoRotate: true,
      autoRotateSpeed: 12,
      targetY: -0.2,
    },
    overlayParams: {
      enabled: true,
      title: 'AURELIA AURITA',
      subtitle: 'ABYSSAL ZONE // 4000M',
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
    duration: 6.0,
    fps: 30,
    aspectRatio: '9:16',
  },
  {
    id: 'golden_medusa',
    name: 'Golden Solar Medusa (Halftone)',
    sceneId: 'jellyfish',
    rendererId: 'halftone',
    sceneParams: {
      pulseSpeed: 1.0,
      pulseStrength: 0.4,
      tentacleCount: 24,
      tentacleLength: 3.5,
      bellColor: '#f59e0b',
      coreGlowColor: '#ef4444',
      ambientParticles: 0,
    },
    rendererParams: {
      dotSize: 10,
      dotShape: 'circle',
      style: 'monochrome',
      paperColor: '#fefce8',
      inkColor: '#1c1917',
      contrast: 1.4,
      invert: true,
    },
    cameraParams: {
      distance: 5.2,
      fov: 42,
      elevation: 20,
      azimuth: 45,
      autoRotate: true,
      autoRotateSpeed: 10,
      targetY: -0.2,
    },
    duration: 6.0,
    fps: 30,
    aspectRatio: '9:16',
  },
  {
    id: 'spectral_ghost',
    name: 'Phantom Jellyfish (Dither)',
    sceneId: 'jellyfish',
    rendererId: 'dither',
    sceneParams: {
      pulseSpeed: 1.2,
      pulseStrength: 0.38,
      tentacleCount: 32,
      tentacleLength: 4.2,
      bellColor: '#818cf8',
      coreGlowColor: '#c084fc',
      ambientParticles: 0,
    },
    rendererParams: {
      pixelSize: 5,
      palette: 'cyberpunk',
      ditherMatrix: 'bayer4',
      ditherAmount: 1.2,
      contrast: 1.4,
    },
    cameraParams: {
      distance: 5.8,
      fov: 45,
      elevation: 10,
      azimuth: 15,
      autoRotate: true,
      autoRotateSpeed: 14,
      targetY: -0.3,
    },
    duration: 6.0,
    fps: 30,
    aspectRatio: '9:16',
  },
];

export class JellyfishScene implements IScene {
  public id = 'jellyfish';
  public name = 'Bioluminescent Jellyfish';
  public description = 'Deep-sea translucent cnidarian with harmonic pulsing dome, fluid oral arms, and stinging tentacles';
  public category = 'Organic Life';
  public paramDefs = JELLYFISH_PARAM_DEFS;
  public defaultParams: ParameterMap = JELLYFISH_PARAM_DEFS.reduce((acc, p) => {
    acc[p.key] = p.default;
    return acc;
  }, {} as ParameterMap);
  public presets = JELLYFISH_PRESETS;

  private sceneGroup = new THREE.Group();
  private bellMesh!: THREE.Mesh;
  private bellBasePositions!: Float32Array;
  private coreOrgans!: THREE.Mesh;
  private tentacleLines: THREE.Line[] = [];
  private oralArmMeshes: THREE.Mesh[] = [];
  private particles!: THREE.Points;
  private particlePositions!: Float32Array;
  private particleSeeds!: Float32Array;

  private bellMaterial!: THREE.MeshStandardMaterial;
  private coreMaterial!: THREE.MeshStandardMaterial;
  private tentacleMaterial!: THREE.LineBasicMaterial;
  private marineSnowMaterial!: THREE.PointsMaterial;

  public init(ctx: SceneContext, params: ParameterMap): void {
    ctx.scene.add(this.sceneGroup);

    this.bellMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(params.bellColor || '#06b6d4'),
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(params.bellColor || '#06b6d4'),
      emissiveIntensity: 0.25,
    });

    this.coreMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(params.coreGlowColor || '#ec4899'),
      roughness: 0.2,
      emissive: new THREE.Color(params.coreGlowColor || '#ec4899'),
      emissiveIntensity: 0.8,
    });

    this.tentacleMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(params.bellColor || '#06b6d4'),
      transparent: true,
      opacity: 0.65,
    });

    this.marineSnowMaterial = new THREE.PointsMaterial({
      color: 0x67e8f9,
      size: 0.04,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    // 1. Bell Geometry (Hemisphere with rim)
    const bellGeom = new THREE.SphereGeometry(1.4, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
    this.bellMesh = new THREE.Mesh(bellGeom, this.bellMaterial);
    this.bellMesh.rotation.x = Math.PI;
    this.bellMesh.position.set(0, 1.2, 0);
    this.sceneGroup.add(this.bellMesh);

    // Save initial vertex positions for deformation
    const pos = bellGeom.attributes.position;
    this.bellBasePositions = new Float32Array(pos.array);

    // 2. Internal glowing stomach/gonads
    const coreGeom = new THREE.TorusGeometry(0.35, 0.15, 16, 32);
    this.coreOrgans = new THREE.Mesh(coreGeom, this.coreMaterial);
    this.coreOrgans.rotation.x = Math.PI / 2;
    this.coreOrgans.position.set(0, 1.1, 0);
    this.sceneGroup.add(this.coreOrgans);

    // 3. Oral Arms (central ruffled curtains)
    this.createOralArms();

    // 4. Tentacles
    this.createTentacles(params);

    // 5. Marine Snow Particles
    this.createParticles(params);
  }

  private createOralArms(): void {
    const armCount = 4;
    for (let i = 0; i < armCount; i++) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 1.0, 0),
        new THREE.Vector3(0.2, 0.2, 0),
        new THREE.Vector3(-0.15, -0.8, 0.1),
        new THREE.Vector3(0.1, -1.8, -0.05),
        new THREE.Vector3(0, -2.6, 0),
      ]);
      const armGeom = new THREE.TubeGeometry(curve, 32, 0.06, 8, false);
      const armMesh = new THREE.Mesh(armGeom, this.coreMaterial);
      armMesh.rotation.y = (i / armCount) * Math.PI * 2;
      this.sceneGroup.add(armMesh);
      this.oralArmMeshes.push(armMesh);
    }
  }

  private createTentacles(params: ParameterMap): void {
    this.tentacleLines.forEach(l => {
      this.sceneGroup.remove(l);
      l.geometry.dispose();
    });
    this.tentacleLines = [];

    const count = params.tentacleCount ?? 24;
    const len = params.tentacleLength ?? 3.5;
    const pointsPerTentacle = 24;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 1.35;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      const points: THREE.Vector3[] = [];
      for (let j = 0; j < pointsPerTentacle; j++) {
        const v = j / (pointsPerTentacle - 1);
        points.push(new THREE.Vector3(x, 1.1 - v * len, z));
      }

      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geom, this.tentacleMaterial);
      (line as any).userData = { angle, radius: r, length: len, seed: Math.random() * 10 };
      this.sceneGroup.add(line);
      this.tentacleLines.push(line);
    }
  }

  private createParticles(params: ParameterMap): void {
    const count = params.ambientParticles ?? 350;
    this.particlePositions = new Float32Array(count * 3);
    this.particleSeeds = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.particleSeeds[i * 3] = (Math.random() - 0.5) * 6;
      this.particleSeeds[i * 3 + 1] = Math.random() * 8 - 4;
      this.particleSeeds[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particles = new THREE.Points(geom, this.marineSnowMaterial);
    this.sceneGroup.add(this.particles);
  }

  public update(frameInfo: FrameInfo, params: ParameterMap): void {
    const { time, progress, duration } = frameInfo;

    if (params.bellColor) {
      this.bellMaterial.color.set(params.bellColor);
      this.bellMaterial.emissive.set(params.bellColor);
      this.tentacleMaterial.color.set(params.bellColor);
    }
    if (params.coreGlowColor) {
      this.coreMaterial.color.set(params.coreGlowColor);
      this.coreMaterial.emissive.set(params.coreGlowColor);
    }

    // Seamless loop pulse cycles
    const pulseCycles = Math.max(1, Math.round((params.pulseSpeed ?? 1.0) * duration));
    const pulsePhase = progress * Math.PI * 2 * pulseCycles;

    // Asymmetric organic pulse: sharp contraction, slower relaxed expansion
    const contraction = Math.pow(Math.sin(pulsePhase) * 0.5 + 0.5, 2.5);
    const pulseStrength = params.pulseStrength ?? 0.35;

    // 1. Deform Bell Geometry dynamically
    if (this.bellMesh && this.bellBasePositions) {
      const pos = this.bellMesh.geometry.attributes.position;
      const base = this.bellBasePositions;
      for (let i = 0; i < pos.count; i++) {
        const bx = base[i * 3];
        const by = base[i * 3 + 1];
        const bz = base[i * 3 + 2];

        // Height factor: rim deforms most
        const rimFactor = Math.max(0, -by);
        const scaleRadial = 1.0 - contraction * pulseStrength * (0.3 + 0.7 * rimFactor);
        const scaleY = 1.0 + contraction * pulseStrength * 0.4;

        pos.setXYZ(i, bx * scaleRadial, by * scaleY, bz * scaleRadial);
      }
      pos.needsUpdate = true;
      this.bellMesh.geometry.computeVertexNormals();
    }

    // 2. Vertical swimming propulsion in sync with pulse
    const swim = Math.sin(pulsePhase) * 0.35;
    this.sceneGroup.position.y = swim;

    // 3. Update Tentacles waving in current
    for (let t = 0; t < this.tentacleLines.length; t++) {
      const line = this.tentacleLines[t];
      const { angle, radius, length, seed } = (line as any).userData;
      const pos = line.geometry.attributes.position;
      const points = pos.count;

      for (let j = 0; j < points; j++) {
        const v = j / (points - 1);
        const wave = Math.sin(time * 3.0 - v * 4.0 + seed) * 0.25 * v;
        const waveZ = Math.cos(time * 2.5 - v * 3.5 + seed) * 0.2 * v;

        const curRadius = radius * (1.0 - contraction * pulseStrength * 0.6);
        const x = Math.cos(angle) * curRadius + wave;
        const y = 1.1 - v * length;
        const z = Math.sin(angle) * curRadius + waveZ;

        pos.setXYZ(j, x, y, z);
      }
      pos.needsUpdate = true;
    }

    // 4. Update Oral Arms
    for (let i = 0; i < this.oralArmMeshes.length; i++) {
      const arm = this.oralArmMeshes[i];
      const armWave = Math.sin(time * 2.0 + i) * 0.08;
      arm.rotation.z = armWave;
    }

    // 5. Marine Snow Particles
    if (this.particles && this.particlePositions) {
      const count = params.ambientParticles ?? 350;
      for (let i = 0; i < count; i++) {
        const sx = this.particleSeeds[i * 3];
        const sy = this.particleSeeds[i * 3 + 1];
        const sz = this.particleSeeds[i * 3 + 2];

        const pTime = (progress + (i / count)) % 1.0;
        const curY = 4.0 - pTime * 8.0;
        const curX = sx + Math.sin(time + i) * 0.15;
        const curZ = sz + Math.cos(time + i) * 0.15;

        this.particlePositions[i * 3] = curX;
        this.particlePositions[i * 3 + 1] = curY;
        this.particlePositions[i * 3 + 2] = curZ;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  public onResize(_width: number, _height: number): void {}

  public dispose(): void {
    if (this.bellMesh) this.bellMesh.geometry.dispose();
    if (this.coreOrgans) this.coreOrgans.geometry.dispose();
    this.tentacleLines.forEach(l => {
      this.sceneGroup.remove(l);
      l.geometry.dispose();
    });
    this.oralArmMeshes.forEach(a => {
      this.sceneGroup.remove(a);
      a.geometry.dispose();
    });
    if (this.particles) this.particles.geometry.dispose();
    this.bellMaterial.dispose();
    this.coreMaterial.dispose();
    this.tentacleMaterial.dispose();
    this.marineSnowMaterial.dispose();
    if (this.sceneGroup.parent) this.sceneGroup.parent.remove(this.sceneGroup);
  }
}
