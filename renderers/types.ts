import { AppState, MediaSource } from "@/lib/types";
import { GridDims } from "@/lib/imageData";

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
}

export type ModeRenderer = (rc: RenderContext) => void;
