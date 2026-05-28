"use client";
import { useRef } from "react";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export function ColorInput({ label, value, onChange }: Props) {
  const pickerRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wider text-white/50">{label}</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => pickerRef.current?.click()}
          className="relative w-8 h-8 rounded border border-white/10 overflow-hidden focus:outline-none focus:border-white/40"
          aria-label={`${label} color picker`}
          title={`Pick ${label.toLowerCase()} color`}
        >
          <div className="absolute inset-0" style={{ backgroundColor: value }} />
          <input
            ref={pickerRef}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute opacity-0 pointer-events-none w-0 h-0"
          />
        </button>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-ink-850 border border-white/10 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-white/30"
        />
      </div>
    </div>
  );
}
