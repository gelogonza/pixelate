"use client";

interface Props {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}

export function Toggle({ label, value, onChange, hint }: Props) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-0.5">
      <div className="flex flex-col">
        <span className="text-[11px] uppercase tracking-wider text-white/60">{label}</span>
        {hint && <span className="text-[10px] text-white/30">{hint}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative w-8 h-[18px] rounded-full transition-colors ${value ? "bg-white/80" : "bg-white/10"}`}
      >
        <span
          className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-ink-950 transition-transform ${value ? "translate-x-[14px]" : "translate-x-0"}`}
        />
      </button>
    </label>
  );
}
