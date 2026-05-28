"use client";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}

export function TextInput({ label, value, onChange, placeholder, mono }: Props) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wider text-white/50">{label}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-ink-850 border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-white/30 ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}
