"use client";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
}

export function SliderInput({ label, value, min, max, step = 1, onChange, unit }: Props) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-white/50">
        <span>{label}</span>
        {unit && <span className="text-white/30">{unit}</span>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          className="px-slider flex-1"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <input
          type="number"
          className="px-num w-14 bg-ink-850 border border-white/10 rounded px-1.5 py-1 text-xs text-right tabular-nums focus:outline-none focus:border-white/30"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isNaN(v)) onChange(v);
          }}
        />
      </div>
    </div>
  );
}
