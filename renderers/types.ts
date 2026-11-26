import type * as THREE from "three";
import { AppState, MediaSource } from "@/lib/types";
import { GridDims } from "@/lib/imageData";
import type { GeometrySampleCloud } from "@/engine/types";

/**
 * Present only when the active source is a procedural scene. Geometry-space
 * modes read this; every image-space mode ignores it and uses `source`.
 */
export interface GeometryContext {
  cloud: GeometrySampleCloud | null;
  camera: THREE.PerspectiveCamera;
}

export interface Cell {
  ox: number;
  oy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  g: number;
  b: number;
  brightness: number;
  edge: number;
  edgeAngle: number;
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  cells: Cell[];
  width: number;
  height: number;
  dims: GridDims;
  state: AppState;
  time: number;          // seconds
  source: MediaSource | null;
  geometry?: GeometryContext | null;
}

export type ModeRenderer = (rc: RenderContext) => void;
