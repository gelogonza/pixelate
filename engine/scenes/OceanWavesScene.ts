import * as THREE from 'three';
import type { FrameInfo, IScene, ParameterDefinition, ParameterMap, Preset, SceneContext } from '../types';

export const OCEAN_PARAM_DEFS: ParameterDefinition[] = [
  {
    key: 'waveSpeed',
    name: 'Wave Frequency',
    type: 'number',
    default: 1.0,
    min: 0.5,
    max: 3.0,
    step: 0.1,
    category: 'Waves',
  },
  {
    key: 'waveHeight',
    name: 'Wave Amplitude',
    type: 'number',
    default: 0.45,
    min: 0.1,
    max: 1.2,
    step: 0.05,
    category: 'Waves',
  },
  {
    key: 'waveSteepness',
    name: 'Gerstner Choppiness',
    type: 'number',
    default: 0.6,
    min: 0.1,
    max: 1.0,
    step: 0.05,
    category: 'Waves',
  },
  {
    key: 'waterColor',
    name: 'Deep Water Color',
    type: 'color',
    default: '#0f172a',
    category: 'Materials',
  },
  {
    key: 'crestColor',
    name: 'Wave Crest Color',
    type: 'color',
    default: '#38bdf8',
    category: 'Materials',
  },
];

export const OCEAN_PRESETS: Preset[] = [
  {
    id: 'midnight_swell',
    name: 'Midnight Ocean Swell (ASCII)',
    sceneId: 'ocean_waves',
    rendererId: 'ascii',
    sceneParams: {
      waveSpeed: 1.0,
      waveHeight: 0.48,
      waveSteepness: 0.65,
      waterColor: '#090d16',
      crestColor: '#38bdf8',
    },
    rendererParams: {
      charSet: 'detailed',
      cellSize: 8,
      fontFamily: 'JetBrains Mono',
      colorMode: 'original',
      foregroundColor: '#38bdf8',
      backgroundColor: '#030509',
      brightness: 0.1,
      contrast: 1.4,
      invert: false,
      glow: true,
      glowIntensity: 5,
    },
    cameraParams: {
      distance: 6.2,
      fov: 46,
      elevation: 20,
      azimuth: 35,
      autoRotate: true,
      autoRotateSpeed: 10,
      targetY: 0.0,
    },
    overlayParams: {
      enabled: true,
      title: 'MARE NOCTURNAL',
      subtitle: 'GERSTNER SWELL // DEEP DRIFT',
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
    id: 'golden_hour_ocean',
    name: 'Golden Hour Swell (Halftone)',
    sceneId: 'ocean_waves',
    rendererId: 'halftone',
    sceneParams: {
      waveSpeed: 1.0,
      waveHeight: 0.42,
      waveSteepness: 0.55,
      waterColor: '#1c1917',
      crestColor: '#fbbf24',
    },
    rendererParams: {
      dotSize: 10,
      dotShape: 'circle',
      style: 'monochrome',
      paperColor: '#faf8f2',
      inkColor: '#18181b',
      contrast: 1.45,
      invert: true,
    },
    cameraParams: {
      distance: 5.8,
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
  {
    id: 'synthwave_sea',
    name: 'Neon Synthwave Sea (Dither)',
    sceneId: 'ocean_waves',
    rendererId: 'dither',
    sceneParams: {
      waveSpeed: 1.2,
      waveHeight: 0.52,
      waveSteepness: 0.7,
      waterColor: '#1e1b4b',
      crestColor: '#ec4899',
    },
    rendererParams: {
      pixelSize: 6,
      palette: 'cyberpunk',
      ditherMatrix: 'bayer4',
      ditherAmount: 1.2,
      contrast: 1.4,
    },
    cameraParams: {
      distance: 6.0,
      fov: 45,
      elevation: 18,
      azimuth: 15,
      autoRotate: true,
      autoRotateSpeed: 12,
      targetY: 0.0,
    },
    duration: 6.0,
    fps: 30,
    aspectRatio: '9:16',
  },
];

export class OceanWavesScene implements IScene {
  public id = 'ocean_waves';
  public name = 'Ocean Waves';
  public description = 'Gerstner wave displacement simulation with steep crests, foam peaks';
  public category = 'Nature';
  public paramDefs = OCEAN_PARAM_DEFS;
  public defaultParams: ParameterMap = OCEAN_PARAM_DEFS.reduce((acc, p) => {
    acc[p.key] = p.default;
    return acc;
  }, {} as ParameterMap);
  public presets = OCEAN_PRESETS;

  private sceneGroup = new THREE.Group();
  private oceanMesh!: THREE.Mesh;
  private basePositions!: Float32Array;

  private oceanMaterial!: THREE.MeshStandardMaterial;

  public init(ctx: SceneContext, params: ParameterMap): void {
    ctx.scene.add(this.sceneGroup);

    this.oceanMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(params.waterColor || '#0f172a'),
      roughness: 0.15,
      metalness: 0.2,
      flatShading: true,
    });


    // High density grid for fluid waves
    const size = 10;
    const segments = 48;
    const geom = new THREE.PlaneGeometry(size, size, segments, segments);
    geom.rotateX(-Math.PI / 2);

    this.basePositions = new Float32Array(geom.attributes.position.array);
    this.oceanMesh = new THREE.Mesh(geom, this.oceanMaterial);
    this.sceneGroup.add(this.oceanMesh);

  }

  public update(frameInfo: FrameInfo, params: ParameterMap): void {
    const { progress, duration } = frameInfo;

    if (params.waterColor) this.oceanMaterial.color.set(params.waterColor);

    // Seamless loop wave cycles
    const waveCycles = Math.max(1, Math.round((params.waveSpeed ?? 1.0) * duration));
    const phase = progress * Math.PI * 2 * waveCycles;

    const waveHeight = params.waveHeight ?? 0.45;
    const steepness = params.waveSteepness ?? 0.6;

    const pos = this.oceanMesh.geometry.attributes.position;
    const base = this.basePositions;

    // Gerstner Wave components
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3];
      const bz = base[i * 3 + 2];

      // Wave 1: Primary diagonal swell
      const k1 = 1.2;
      const dot1 = (bx * 0.7 + bz * 0.7) * k1 - phase;
      const h1 = Math.sin(dot1) * waveHeight;
      const dx1 = Math.cos(dot1) * waveHeight * steepness * 0.7;
      const dz1 = Math.cos(dot1) * waveHeight * steepness * 0.7;

      // Wave 2: Secondary crossing wave
      const k2 = 1.8;
      const dot2 = (bx * -0.6 + bz * 0.8) * k2 - phase * 1.3;
      const h2 = Math.sin(dot2) * waveHeight * 0.5;

      const y = h1 + h2;
      const x = bx - dx1;
      const z = bz - dz1;

      pos.setXYZ(i, x, y, z);
    }

    pos.needsUpdate = true;
    this.oceanMesh.geometry.computeVertexNormals();

  }

  public onResize(_width: number, _height: number): void {}

  public dispose(): void {
    if (this.oceanMesh) this.oceanMesh.geometry.dispose();
    this.oceanMaterial.dispose();
    if (this.sceneGroup.parent) this.sceneGroup.parent.remove(this.sceneGroup);
  }
}
