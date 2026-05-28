"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  onFile: (file: File) => void;
}

function isAcceptableMedia(file: File): boolean {
  if (file.type) {
    if (/^image\/(png|jpe?g|webp)$/i.test(file.type)) return true;
    if (/^video\/(mp4|webm|ogg|quicktime)$/i.test(file.type)) return true;
  }
  return /\.(png|jpe?g|webp|mp4|webm|ogv|mov)$/i.test(file.name);
}

export function UploadZone({ onFile }: Props) {
  const [dragging, setDragging] = useState(false);
  const dragDepthRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback(
    (file?: File | null) => {
      if (!file) {
        console.warn("[Pixelate] No file in drop event");
        return;
      }
      if (!isAcceptableMedia(file)) {
        console.warn("[Pixelate] Rejected file (unsupported type):", file.type, file.name);
        return;
      }
      onFile(file);
    },
    [onFile]
  );

  // Prevent the browser from opening dropped files in a new tab,
  // which would otherwise hijack the drop before our zone handler fires.
  useEffect(() => {
    const block = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setDragging(true);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    accept(file);
  };

  return (
    <div
      className="absolute inset-0 p-4"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`group relative w-full h-full rounded-lg border-2 border-dashed transition-colors flex items-center justify-center checker-bg cursor-pointer ${
          dragging
            ? "border-white/50 bg-white/[0.03]"
            : "border-white/10 hover:border-white/20"
        }`}
      >
        <div className="text-center space-y-2 pointer-events-none">
          <div className="text-white/80 text-sm">
            {dragging ? "Release to upload" : "Drop image or video here"}
          </div>
          <div className="text-white/40 text-xs">
            or click to browse - JPG - PNG - WebP - MP4 - WebM - MOV
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/ogg,video/quicktime,.mov"
          className="hidden"
          onChange={(e) => {
            accept(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
