import * as THREE from 'three';
import type { FrameInfo, IScene, ParameterDefinition, ParameterMap, Preset, SceneContext } from '../types';

export const MORPH_PARAM_DEFS: ParameterDefinition[] = [
  {
    key: 'morphSpeed',
    name: 'Morph Speed',
    type: 'number',
    default: 1.0,
    min: 0.5,
    max: 3.0,
    step: 0.1,
    category: 'Topology',
  },
  {
    key: 'twistAmount',
    name: 'Twist & Fold',
    type: 'number',
    default: 2.2,
    min: 0.5,
    max: 6.0,
    step: 0.2,
    category: 'Topology',
  },
  {
    key: 'complexity',
    name: 'Harmonic Frequency',
    type: 'number',
    default: 3.0,
    min: 1.0,
    max: 6.0,
    step: 1.0,
    category: 'Geometry',
  },
  {
    key: 'wireframe',
    name: 'Show Lattice Edges',
    type: 'boolean',
    default: true,
    category: 'Style',
  },
  {
    key: 'primaryColor',
    name: 'Primary Color',
    type: 'color',
    default: '#8b5cf6', // Violet
    category: 'Colors',
  },
  {
    key: 'accentColor',
    name: 'Wireframe / Core Color',
    type: 'color',
    default: '#06b6d4', // Cyan
    category: 'Colors',
  },
  {
    key: 'particleHalo',
    name: 'Particle Halo',
    type: 'number',
    default: 0,
    min: 0,
    max: 800,
    step: 50,
    category: 'Atmosphere',
  },
];

export const MORPH_PRESETS: Preset[] = [
  {
    id: 'hyper_torus',
    name: '4D Hyper-Torus (ASCII)',
    sceneId: 'morphing_geometry',
    rendererId: 'ascii',
    sceneParams: {
      morphSpeed: 1.0,
      twistAmount: 2.5,
      complexity: 3.0,
      wireframe: true,
      primaryColor: '#7c3aed',
      accentColor: '#38bdf8',
      particleHalo: 0,
    },
    rendererParams: {
      charSet: 'detailed',
      cellSize: 8,
      fontFamily: 'JetBrains Mono',
      colorMode: 'original',
      foregroundColor: '#38bdf8',
      backgroundColor: '#040509',
      brightness: 0.12,
      contrast: 1.45,
      invert: false,
      glow: true,
      glowIntensity: 6,
    },
    cameraParams: {
      distance: 5.2,
      fov: 44,
      elevation: 20,
      azimuth: 25,
      autoRotate: true,
      autoRotateSpeed: 16,
      targetY: 0.0,
    },
    overlayParams: {
      enabled: true,
      title: 'HYPER-MANIFOLD',
      subtitle: '4D CLIFFORD PROJECTION // S³ → R³',
      watermark: '@ascii.studio',
      fontFamily: "'JetBrains Mono', monospace",
      titleSize: 42,
      subtitleSize: 18,
      watermarkSize: 16,
      color: '#38bdf8',
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
    id: 'quantum_gyroid',
    name: 'Quantum Gyroid (Dither)',
    sceneId: 'morphing_geometry',
    rendererId: 'dither',
    sceneParams: {
      morphSpeed: 1.2,
      twistAmount: 3.5,
      complexity: 4.0,
      wireframe: true,
      primaryColor: '#ec4899',
      accentColor: '#06b6d4',
      particleHalo: 0,
    },
    rendererParams: {
      pixelSize: 5,
      palette: 'cyberpunk',
      ditherMatrix: 'bayer4',
      ditherAmount: 1.2,
      contrast: 1.4,
    },
    cameraParams: {
      distance: 5.0,
      fov: 42,
      elevation: 25,
      azimuth: 0,
      autoRotate: true,
      autoRotateSpeed: 18,
      targetY: 0.0,
    },
    duration: 6.0,
    fps: 30,
    aspectRatio: '9:16',
  },
  {
    id: 'sacred_polytope',
    name: 'Sacred Polytope (Halftone)',
    sceneId: 'morphing_geometry',
    rendererId: 'halftone',
    sceneParams: {
      morphSpeed: 1.0,
      twistAmount: 1.8,
      complexity: 3.0,
      wireframe: true,
      primaryColor: '#d97706',
      accentColor: '#fbbf24',
      particleHalo: 0,
    },
    rendererParams: {
      dotSize: 10,
      dotShape: 'diamond',
      style: 'monochrome',
      paperColor: '#faf8f2',
      inkColor: '#18181b',
      contrast: 1.5,
      invert: true,
    },
    cameraParams: {
      distance: 5.4,
      fov: 45,
      elevation: 30,
      azimuth: 45,
      autoRotate: true,
      autoRotateSpeed: 12,
      targetY: 0.0,
    },
    duration: 6.0,
    fps: 30,
    aspectRatio: '9:16',
  },
];

export class MorphingAbstractScene implements IScene {
  public id = 'morphing_geometry';
  public name = 'Morphing Abstract Geometry';
  public description = 'Higher-dimensional 4D manifold topology projection with continuous harmonic geometric phase transitions';
  public category = 'Abstract Math';
  public paramDefs = MORPH_PARAM_DEFS;
  public defaultParams: ParameterMap = MORPH_PARAM_DEFS.reduce((acc, p) => {
    acc[p.key] = p.default;
    return acc;
  }, {} as ParameterMap);
  public presets = MORPH_PRESETS;

  private sceneGroup = new THREE.Group();
  private surfaceMesh!: THREE.Mesh;
  private wireframeMesh!: THREE.LineSegments;
  private innerCoreMesh!: THREE.Mesh;
  private basePositions!: Float32Array;
  private particles!: THREE.Points;
  private particlePositions!: Float32Array;

  private surfaceMaterial!: THREE.MeshStandardMaterial;
  private wireMaterial!: THREE.LineBasicMaterial;
  private coreMaterial!: THREE.MeshStandardMaterial;
  private particleMaterial!: THREE.PointsMaterial;

  public init(ctx: SceneContext, params: ParameterMap): void {
    ctx.scene.add(this.sceneGroup);

    this.surfaceMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(params.primaryColor || '#8b5cf6'),
      roughness: 0.25,
      metalness: 0.4,
      side: THREE.DoubleSide,
    });

    this.wireMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(params.accentColor || '#06b6d4'),
      transparent: true,
      opacity: 0.75,
    });

    this.coreMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(params.accentColor || '#06b6d4'),
      emissive: new THREE.Color(params.accentColor || '#06b6d4'),
      emissiveIntensity: 0.8,
    });

    // High resolution Torus Knot base geometry
    const geom = new THREE.TorusKnotGeometry(1.4, 0.45, 128, 32, 2, 3);
    this.basePositions = new Float32Array(geom.attributes.position.array);

    this.surfaceMesh = new THREE.Mesh(geom, this.surfaceMaterial);
    this.sceneGroup.add(this.surfaceMesh);

    // Wireframe edges
    const wireGeom = new THREE.WireframeGeometry(geom);
    this.wireframeMesh = new THREE.LineSegments(wireGeom, this.wireMaterial);
    this.sceneGroup.add(this.wireframeMesh);

    // Inner glowing core
    const coreGeom = new THREE.IcosahedronGeometry(0.5, 2);
    this.innerCoreMesh = new THREE.Mesh(coreGeom, this.coreMaterial);
    this.sceneGroup.add(this.innerCoreMesh);

    // Halo particles
    this.createParticles(params);
  }

  private createParticles(params: ParameterMap): void {
    const count = params.particleHalo ?? 400;
    this.particlePositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 2.4 + Math.random() * 0.8;

      this.particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      this.particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.particlePositions[i * 3 + 2] = r * Math.cos(phi);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(params.accentColor || '#06b6d4'),
      size: 0.04,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(geom, this.particleMaterial);
    this.sceneGroup.add(this.particles);
  }

  public update(frameInfo: FrameInfo, params: ParameterMap): void {
    const { time, progress, duration } = frameInfo;

    if (params.primaryColor) this.surfaceMaterial.color.set(params.primaryColor);
    if (params.accentColor) {
      this.wireMaterial.color.set(params.accentColor);
      this.coreMaterial.color.set(params.accentColor);
      this.coreMaterial.emissive.set(params.accentColor);
      this.particleMaterial.color.set(params.accentColor);
    }

    this.wireframeMesh.visible = Boolean(params.wireframe);

    // Seamless loop: integer cycles per loop
    const cycles = Math.max(1, Math.round((params.morphSpeed ?? 1.0) * duration));
    const phase = progress * Math.PI * 2 * cycles;

    const twist = params.twistAmount ?? 2.2;
    const freq = params.complexity ?? 3.0;

    // Deform base mesh along 4D projection harmonics
    const pos = this.surfaceMesh.geometry.attributes.position;
    const base = this.basePositions;

    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const bz = base[i * 3 + 2];

      const r = Math.sqrt(bx * bx + by * by + bz * bz);
      const angle = Math.atan2(by, bx);

      // Higher dimensional oscillation
      const morph = Math.sin(angle * freq + phase) * Math.cos(bz * twist + phase) * 0.35;
      const factor = 1.0 + morph / (r + 0.1);

      pos.setXYZ(i, bx * factor, by * factor, bz * factor);
    }
    pos.needsUpdate = true;
    this.surfaceMesh.geometry.computeVertexNormals();

    // Rotate core
    this.innerCoreMesh.rotation.x = phase * 0.5;
    this.innerCoreMesh.rotation.y = phase * 0.7;

    // Rotate particle halo
    if (this.particles) {
      this.particles.rotation.y = phase * 0.3;
    }
  }

  public onResize(_width: number, _height: number): void {}

  public dispose(): void {
    if (this.surfaceMesh) this.surfaceMesh.geometry.dispose();
    if (this.wireframeMesh) this.wireframeMesh.geometry.dispose();
    if (this.innerCoreMesh) this.innerCoreMesh.geometry.dispose();
    if (this.particles) this.particles.geometry.dispose();
    this.surfaceMaterial.dispose();
    this.wireMaterial.dispose();
    this.coreMaterial.dispose();
    this.particleMaterial.dispose();
    if (this.sceneGroup.parent) this.sceneGroup.parent.remove(this.sceneGroup);
  }
}
