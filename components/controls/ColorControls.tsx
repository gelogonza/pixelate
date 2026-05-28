"use client";

import { ColorMode, ColorOptions } from "@/lib/types";
import { resizePalette } from "@/lib/defaults";
import { Select } from "./Select";
import { SliderInput } from "./SliderInput";
import { Toggle } from "./Toggle";
import { ColorInput } from "./ColorInput";

interface Props {
  label?: string;
  value: ColorOptions;
  onChange: (next: ColorOptions) => void;
  /** Some modes look weird in 'single' (e.g. mosaic loses image info). All four enabled here. */
  hideSingle?: boolean;
}

export function ColorControls({
  value,
  onChange,
  hideSingle,
}: Props) {
  const patch = (p: Partial<ColorOptions>) => onChange({ ...value, ...p });

  const modeOptions: { value: ColorMode; label: string }[] = [
    ...(hideSingle ? [] : [{ value: "single" as const, label: "Single color" }]),
    { value: "source" as const, label: "Match image" },
    { value: "palette" as const, label: "Palette" },
    { value: "complementary" as const, label: "Complementary" },
    { value: "rainbow" as const, label: "Rainbow" },
  ];

  return (
    <div className="space-y-3">
      <Select<ColorMode>
        label="Color mode"
        value={value.mode}
        options={modeOptions}
        onChange={(m) => patch({ mode: m })}
      />

      {value.mode === "single" && (
        <ColorInput
          label="Color"
          value={value.color}
          onChange={(v) => patch({ color: v })}
        />
      )}

      {value.mode === "palette" && (
        <>
          <SliderInput
            label="Palette size"
            value={value.palette.length}
            min={1}
            max={8}
            onChange={(n) => patch({ palette: resizePalette(value.palette, n) })}
            unit="colors"
          />
          <div className="grid grid-cols-2 gap-2">
            {value.palette.map((col, i) => (
              <ColorInput
                key={i}
                label={`Color ${i + 1}`}
                value={col}
                onChange={(v) => {
                  const next = value.palette.slice();
                  next[i] = v;
                  patch({ palette: next });
                }}
              />
            ))}
          </div>
        </>
      )}

      <Toggle
        label="Animate mode"
        hint="Animates the active render mode behavior"
        value={value.animated}
        onChange={(v) => patch({ animated: v })}
      />
      <Toggle
        label="Cycle colors"
        hint="Keeps current renderer static, but cycles color assignments"
        value={!!value.cycleColors}
        onChange={(v) => patch({ cycleColors: v })}
      />
      {(value.animated || value.cycleColors || value.mode === "rainbow") && (
        <SliderInput
          label="Animation speed"
          value={value.animationSpeed}
          min={0.5}
          max={30}
          step={0.5}
          onChange={(v) => patch({ animationSpeed: v })}
          unit="hz"
        />
      )}
    </div>
  );
}
