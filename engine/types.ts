import type * as THREE from 'three';

export type ParamType = 'number' | 'boolean' | 'color' | 'select' | 'string';

export interface ParameterDefinition<T = any> {
  key: string;
  name: string;
  type: ParamType;
  default: T;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: Array<{ label: string; value: string | number }>;
  category?: string;
  description?: string;
}

export type ParameterMap = Record<string, any>;

export interface FrameInfo {
  frame: number;
  time: number;
  duration: number;
  progress: number;
  fps: number;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  width: number;
  height: number;
  pixelRatio: number;
}

export interface GeometrySampleCloud {
  positions: Float32Array; // [x, y, z, x, y, z, ...]
  normals: Float32Array;   // [nx, ny, nz, ...]
  colors: Float32Array;    // [r, g, b, ...] in range 0..1
  ambientOcclusion?: Float32Array; // [ao, ...] in range 0..1
  ids?: Int32Array;        // Stable IDs for consistent glyph assignment
  flying?: Uint8Array;     // 1 if detached/flying particle, 0 otherwise
  glow?: Float32Array;     // Optional emission/glow intensity (0..1)
}

export interface SceneStage {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  description: string;
}

export interface IScene {
  id: string;
  name: string;
  description: string;
  category: string;
  paramDefs: ParameterDefinition[];
  defaultParams: ParameterMap;
  presets: Preset[];
  stages?: SceneStage[];
  init(ctx: SceneContext, params: ParameterMap): Promise<void> | void;
  update(frameInfo: FrameInfo, params: ParameterMap): void;
  getSampleCloud?(frameInfo: FrameInfo, params: ParameterMap): GeometrySampleCloud | null;
  onResize(width: number, height: number): void;
  dispose(): void;
}

export interface IRenderer {
  id: string;
  name: string;
  description: string;
  paramDefs: ParameterDefinition[];
  defaultParams: ParameterMap;
  init(targetCanvas: HTMLCanvasElement, width: number, height: number): void;
  render(
    threeScene: THREE.Scene,
    threeCamera: THREE.PerspectiveCamera,
    threeRenderer: THREE.WebGLRenderer,
    params: ParameterMap,
    frameInfo: FrameInfo
  ): void;
  resize(width: number, height: number): void;
  getOutputCanvas(): HTMLCanvasElement;
  dispose(): void;
}

export type AspectRatioId = '9:16' | '4:5' | '1:1' | '16:9';

export interface AspectRatioPreset {
  id: AspectRatioId;
  label: string;
  width: number;
  height: number;
  targetSocials: string[];
}

export interface CameraParams {
  distance: number;
  fov: number;
  elevation: number;
  azimuth: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  targetY: number;
}

export interface TypographyOverlayParams {
  enabled: boolean;
  title: string;
  subtitle: string;
  watermark: string;
  fontFamily: string;
  titleSize: number;
  subtitleSize: number;
  watermarkSize: number;
  color: string;
  opacity: number;
  position: 'top' | 'center' | 'bottom';
  fadeInDuration: number;
  fadeOutDuration: number;
  subtleGlow: boolean;
}

export interface Preset {
  id: string;
  name: string;
  sceneId: string;
  rendererId: string;
  sceneParams: ParameterMap;
  rendererParams: ParameterMap;
  cameraParams: CameraParams;
  overlayParams?: TypographyOverlayParams;
  duration: number;
  fps: number;
  aspectRatio: AspectRatioId;
  seed?: number;
}

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  progress: number;
  status: 'rendering_frames' | 'encoding_video' | 'complete' | 'cancelled' | 'error';
  message: string;
  elapsedMs: number;
  estimatedRemainingMs: number;
}
