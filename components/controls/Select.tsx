"use client";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}

export function Select<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wider text-white/50">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-ink-850 border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-white/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-ink-900">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
