import * as THREE from 'three';
import type { FrameInfo, IScene, ParameterDefinition, ParameterMap, Preset, SceneContext } from '../types';

export const BLACKHOLE_PARAM_DEFS: ParameterDefinition[] = [
  {
    key: 'spinRate',
    name: 'Kerr Spin Rate',
    type: 'number',
    default: 1.5,
    min: 0.2,
    max: 4.0,
    step: 0.1,
    category: 'Relativity',
  },
  {
    key: 'diskRadius',
    name: 'Accretion Disk Radius',
    type: 'number',
    default: 3.2,
    min: 1.8,
    max: 5.0,
    step: 0.2,
    category: 'Geometry',
  },
  {
    key: 'photonRingGlow',
    name: 'Photon Sphere Intensity',
    type: 'number',
    default: 2.2,
    min: 0.5,
    max: 5.0,
    step: 0.2,
    category: 'Lensing',
  },
  {
    key: 'diskInnerColor',
    name: 'Disk Core Color',
    type: 'color',
    default: '#38bdf8', // Blue-hot inner accretion
    category: 'Colors',
  },
  {
    key: 'diskOuterColor',
    name: 'Disk Outer Color',
    type: 'color',
    default: '#f97316', // Orange-red cooler outer
    category: 'Colors',
  },
  {
    key: 'jetIntensity',
    name: 'Polar Jet Strength',
    type: 'number',
    default: 1.8,
    min: 0.0,
    max: 4.0,
    step: 0.2,
    category: 'Plasma Jets',
  },
  {
    key: 'particleCount',
    name: 'Infalling Matter Particles',
    type: 'number',
    default: 600,
    min: 100,
    max: 1200,
    step: 50,
    category: 'Particles',
  },
];

export const BLACKHOLE_PRESETS: Preset[] = [
  {
    id: 'gargantua',
    name: 'Gargantua Singularity (ASCII)',
    sceneId: 'black_hole',
    rendererId: 'ascii',
    sceneParams: {
      spinRate: 1.5,
      diskRadius: 3.4,
      photonRingGlow: 2.4,
      diskInnerColor: '#60a5fa',
      diskOuterColor: '#f97316',
      jetIntensity: 1.6,
      particleCount: 700,
    },
    rendererParams: {
      charSet: 'detailed',
      cellSize: 8,
      fontFamily: 'JetBrains Mono',
      colorMode: 'original',
      foregroundColor: '#f97316',
      backgroundColor: '#040407',
      brightness: 0.12,
      contrast: 1.45,
      invert: false,
      glow: true,
      glowIntensity: 7,
    },
    cameraParams: {
      distance: 5.8,
      fov: 46,
      elevation: 18,
      azimuth: 25,
      autoRotate: true,
      autoRotateSpeed: 10,
      targetY: 0.0,
    },
    overlayParams: {
      enabled: true,
      title: 'EVENT HORIZON',
      subtitle: 'SCHWARZSCHILD RADIUS // RS = 2GM/C²',
      watermark: '@ascii.studio',
      fontFamily: "'JetBrains Mono', monospace",
      titleSize: 42,
      subtitleSize: 18,
      watermarkSize: 16,
      color: '#f97316',
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
    id: 'cyber_magnetar',
    name: 'Relativistic Magnetar (Dither)',
    sceneId: 'black_hole',
    rendererId: 'dither',
    sceneParams: {
      spinRate: 2.0,
      diskRadius: 3.0,
      photonRingGlow: 2.8,
      diskInnerColor: '#38bdf8',
      diskOuterColor: '#a855f7',
      jetIntensity: 2.5,
      particleCount: 800,
    },
    rendererParams: {
      pixelSize: 5,
      palette: 'cyberpunk',
      ditherMatrix: 'bayer4',
      ditherAmount: 1.3,
      contrast: 1.45,
    },
    cameraParams: {
      distance: 5.4,
      fov: 45,
      elevation: 22,
      azimuth: 0,
      autoRotate: true,
      autoRotateSpeed: 14,
      targetY: 0.0,
    },
    duration: 6.0,
    fps: 30,
    aspectRatio: '9:16',
  },
  {
    id: 'solar_singularity',
    name: 'Solar Singularity (Halftone)',
    sceneId: 'black_hole',
    rendererId: 'halftone',
    sceneParams: {
      spinRate: 1.2,
      diskRadius: 3.6,
      photonRingGlow: 2.0,
      diskInnerColor: '#fbbf24',
      diskOuterColor: '#ea580c',
      jetIntensity: 1.4,
      particleCount: 500,
    },
    rendererParams: {
      dotSize: 9,
      dotShape: 'diamond',
      style: 'monochrome',
      paperColor: '#faf8f2',
      inkColor: '#0c0a09',
      contrast: 1.5,
      invert: true,
    },
    cameraParams: {
      distance: 6.0,
      fov: 44,
      elevation: 25,
      azimuth: 40,
      autoRotate: true,
      autoRotateSpeed: 8,
      targetY: 0.0,
    },
    duration: 6.0,
    fps: 30,
    aspectRatio: '9:16',
  },
];

export class BlackHoleScene implements IScene {
  public id = 'black_hole';
  public name = 'Celestial Black Hole';
  public description = 'Relativistic Kerr black hole with Doppler-beamed accretion disk, gravitational lensing ring, and polar plasma jets';
  public category = 'Cosmic';
  public paramDefs = BLACKHOLE_PARAM_DEFS;
  public defaultParams: ParameterMap = BLACKHOLE_PARAM_DEFS.reduce((acc, p) => {
    acc[p.key] = p.default;
    return acc;
  }, {} as ParameterMap);
  public presets = BLACKHOLE_PRESETS;

  private sceneGroup = new THREE.Group();
  private eventHorizonMesh!: THREE.Mesh;
  private photonRingMesh!: THREE.Mesh;
  private accretionDiskMesh!: THREE.Mesh;
  private verticalLensingRingMesh!: THREE.Mesh;
  private jetUpperMesh!: THREE.Mesh;
  private jetLowerMesh!: THREE.Mesh;
  private matterParticles!: THREE.Points;
  private particlePositions!: Float32Array;
  private particleSeeds!: Float32Array;

  private horizonMaterial!: THREE.MeshBasicMaterial;
  private diskMaterial!: THREE.MeshStandardMaterial;
  private ringMaterial!: THREE.MeshBasicMaterial;
  private jetMaterial!: THREE.MeshBasicMaterial;
  private particleMaterial!: THREE.PointsMaterial;

  public init(ctx: SceneContext, params: ParameterMap): void {
    ctx.scene.add(this.sceneGroup);

    // 1. Event horizon (pure black sphere)
    this.horizonMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const horizonGeom = new THREE.SphereGeometry(1.0, 32, 32);
    this.eventHorizonMesh = new THREE.Mesh(horizonGeom, this.horizonMaterial);
    this.sceneGroup.add(this.eventHorizonMesh);

    // 2. Photon sphere ring (thin incandescent glow around shadow boundary)
    this.ringMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(params.diskInnerColor || '#38bdf8'),
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });
    const photonGeom = new THREE.RingGeometry(1.02, 1.15, 64);
    this.photonRingMesh = new THREE.Mesh(photonGeom, this.ringMaterial);
    this.sceneGroup.add(this.photonRingMesh);

    // 3. Horizontal Accretion Disk
    const innerRadius = 1.35;
    const outerRadius = params.diskRadius ?? 3.2;
    const diskGeom = new THREE.RingGeometry(innerRadius, outerRadius, 64, 8);
    this.diskMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(params.diskOuterColor || '#f97316'),
      emissive: new THREE.Color(params.diskInnerColor || '#38bdf8'),
      emissiveIntensity: 0.8,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
    this.accretionDiskMesh = new THREE.Mesh(diskGeom, this.diskMaterial);
    this.accretionDiskMesh.rotation.x = Math.PI / 2;
    this.sceneGroup.add(this.accretionDiskMesh);

    // 4. Lensed vertical halo (the warped image of the back of the disk projected over the top and bottom)
    const lensGeom = new THREE.TorusGeometry(1.6, 0.22, 16, 64);
    this.verticalLensingRingMesh = new THREE.Mesh(lensGeom, this.diskMaterial);
    this.sceneGroup.add(this.verticalLensingRingMesh);

    // 5. Polar plasma jets
    this.jetMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(params.diskInnerColor || '#38bdf8'),
      transparent: true,
      opacity: 0.65,
    });
    const jetGeom = new THREE.ConeGeometry(0.35, 4.0, 16, 1, true);
    this.jetUpperMesh = new THREE.Mesh(jetGeom, this.jetMaterial);
    this.jetUpperMesh.position.set(0, 2.5, 0);
    this.sceneGroup.add(this.jetUpperMesh);

    this.jetLowerMesh = new THREE.Mesh(jetGeom, this.jetMaterial);
    this.jetLowerMesh.position.set(0, -2.5, 0);
    this.jetLowerMesh.rotation.x = Math.PI;
    this.sceneGroup.add(this.jetLowerMesh);

    // 6. Infalling matter particle vortex
    this.createParticles(params);
  }

  private createParticles(params: ParameterMap): void {
    const count = params.particleCount ?? 600;
    this.particlePositions = new Float32Array(count * 3);
    this.particleSeeds = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.particleSeeds[i * 3] = Math.random(); // radius seed
      this.particleSeeds[i * 3 + 1] = Math.random() * Math.PI * 2; // initial angle
      this.particleSeeds[i * 3 + 2] = (Math.random() - 0.5) * 0.15; // thickness
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(params.diskInnerColor || '#38bdf8'),
      size: 0.05,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    this.matterParticles = new THREE.Points(geom, this.particleMaterial);
    this.sceneGroup.add(this.matterParticles);
  }

  public update(frameInfo: FrameInfo, params: ParameterMap): void {
    const { time, progress, duration } = frameInfo;

    if (params.diskInnerColor) {
      this.ringMaterial.color.set(params.diskInnerColor);
      this.diskMaterial.emissive.set(params.diskInnerColor);
      this.jetMaterial.color.set(params.diskInnerColor);
      this.particleMaterial.color.set(params.diskInnerColor);
    }
    if (params.diskOuterColor) {
      this.diskMaterial.color.set(params.diskOuterColor);
    }

    // Seamless loop: integer rotations per loop!
    const spinMultiplier = params.spinRate ?? 1.5;
    const spinsPerLoop = Math.max(1, Math.round(spinMultiplier * duration));
    const spinAngle = progress * Math.PI * 2 * spinsPerLoop;

    // Spin accretion disk
    this.accretionDiskMesh.rotation.z = -spinAngle;

    // Pulse jets
    const jetScale = 0.8 + 0.3 * Math.sin(progress * Math.PI * 4);
    this.jetUpperMesh.scale.set(jetScale, 1.0 + 0.2 * jetScale, jetScale);
    this.jetLowerMesh.scale.set(jetScale, 1.0 + 0.2 * jetScale, jetScale);

    // Update infalling matter particles
    if (this.matterParticles && this.particlePositions) {
      const count = params.particleCount ?? 600;
      const minR = 1.1;
      const maxR = params.diskRadius ?? 3.2;

      for (let i = 0; i < count; i++) {
        const rSeed = this.particleSeeds[i * 3];
        const thetaSeed = this.particleSeeds[i * 3 + 1];
        const zSeed = this.particleSeeds[i * 3 + 2];

        // Particle spirals inward toward event horizon
        const pProgress = (progress + rSeed) % 1.0;
        const curRadius = minR + (1.0 - pProgress) * (maxR - minR);

        // Keplerian velocity: faster closer in (v ~ 1 / sqrt(r))
        const angle = thetaSeed - (pProgress * Math.PI * 8) / Math.sqrt(curRadius);

        const x = Math.cos(angle) * curRadius;
        const y = zSeed * curRadius * 0.4;
        const z = Math.sin(angle) * curRadius;

        this.particlePositions[i * 3] = x;
        this.particlePositions[i * 3 + 1] = y;
        this.particlePositions[i * 3 + 2] = z;
      }
      this.matterParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  public onResize(_width: number, _height: number): void {}

  public dispose(): void {
    if (this.eventHorizonMesh) this.eventHorizonMesh.geometry.dispose();
    if (this.photonRingMesh) this.photonRingMesh.geometry.dispose();
    if (this.accretionDiskMesh) this.accretionDiskMesh.geometry.dispose();
    if (this.verticalLensingRingMesh) this.verticalLensingRingMesh.geometry.dispose();
    if (this.jetUpperMesh) this.jetUpperMesh.geometry.dispose();
    if (this.jetLowerMesh) this.jetLowerMesh.geometry.dispose();
    if (this.matterParticles) this.matterParticles.geometry.dispose();
    this.horizonMaterial.dispose();
    this.diskMaterial.dispose();
    this.ringMaterial.dispose();
    this.jetMaterial.dispose();
    this.particleMaterial.dispose();
    if (this.sceneGroup.parent) this.sceneGroup.parent.remove(this.sceneGroup);
  }
}
