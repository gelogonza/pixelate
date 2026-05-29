"use client";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export function ColorInput({ label, value, onChange }: Props) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wider text-white/50">{label}</div>
      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8 flex-shrink-0 rounded border border-white/10 overflow-hidden">
          <div className="absolute inset-0" style={{ backgroundColor: value }} />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label={`${label} color picker`}
          />
        </div>
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
