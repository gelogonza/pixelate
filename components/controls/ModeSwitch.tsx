"use client";

import { RenderMode } from "@/lib/types";

const MODES: { value: RenderMode; label: string }[] = [
  { value: "ascii", label: "ASCII" },
  { value: "pixels", label: "Pixels" },
  { value: "dots", label: "Dots" },
  { value: "mosaic", label: "Mosaic" },
  { value: "blurred", label: "Blur" },
  { value: "black", label: "Black" },
  { value: "transparent", label: "Alpha" },
];

interface Props {
  value: RenderMode;
  onChange: (m: RenderMode) => void;
}

export function ModeSwitch({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-4 gap-1 bg-ink-850 p-1 rounded border border-white/5">
      {MODES.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={`text-[11px] uppercase tracking-wider py-1.5 rounded transition-colors ${
            value === m.value
              ? "bg-white text-ink-950 font-medium"
              : "text-white/60 hover:bg-white/5"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
