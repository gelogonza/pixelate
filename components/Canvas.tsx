"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { AppState, MediaSource } from "@/lib/types";
import { useRenderer, RendererHandle } from "@/hooks/useRenderer";

interface Props {
  media: MediaSource | null;
  state: AppState;
  onResize?: (size: { width: number; height: number; dpr: number }) => void;
}

export interface CanvasApi {
  canvas: HTMLCanvasElement | null;
  snapshot: RendererHandle["exportSnapshot"];
}

export const Canvas = forwardRef<CanvasApi, Props>(function Canvas({ media, state, onResize }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handle = useRenderer(canvasRef, containerRef, media, state, onResize);

  useImperativeHandle(
    ref,
    () => ({
      get canvas() { return canvasRef.current; },
      snapshot: handle.exportSnapshot,
    }),
    [handle]
  );

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center p-4"
    >
      <canvas ref={canvasRef} className="block shadow-2xl shadow-black/50 rounded-sm" />
    </div>
  );
});
