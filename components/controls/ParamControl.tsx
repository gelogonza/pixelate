"use client";

import type { ParameterDefinition } from "@/engine/types";
import { SliderInput } from "./SliderInput";
import { ColorInput } from "./ColorInput";
import { Select } from "./Select";
import { Toggle } from "./Toggle";
import { TextInput } from "./TextInput";

interface Props {
  def: ParameterDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}

/**
 * Renders one typed scene parameter using Pixelate's own control primitives.
 *
 * Scenes declare a `ParameterDefinition[]`, so adding a scene with twenty
 * parameters yields a full control panel from one file — but the widgets are
 * the same ones the hand-written mode sections use, so nothing about the
 * inspector's look changes.
 */
export function ParamControl({ def, value, onChange }: Props) {
  switch (def.type) {
    case "number":
      return (
        <SliderInput
          label={def.name}
          value={typeof value === "number" ? value : (def.default as number)}
          min={def.min ?? 0}
          max={def.max ?? 1}
          step={def.step ?? 0.01}
          unit={def.unit}
          onChange={onChange}
        />
      );

    case "color":
      return (
        <ColorInput
          label={def.name}
          value={typeof value === "string" ? value : (def.default as string)}
          onChange={onChange}
        />
      );

    case "boolean":
      return (
        <Toggle
          label={def.name}
          value={Boolean(value ?? def.default)}
          hint={def.description}
          onChange={onChange}
        />
      );

    case "select":
      return (
        <Select
          label={def.name}
          value={String(value ?? def.default)}
          options={(def.options ?? []).map((o) => ({
            value: String(o.value),
            label: o.label,
          }))}
          onChange={onChange}
        />
      );

    case "string":
      return (
        <TextInput
          label={def.name}
          value={typeof value === "string" ? value : String(def.default ?? "")}
          placeholder={def.description}
          onChange={onChange}
        />
      );

    default:
      return null;
  }
}

/** Group definitions by their declared category, preserving declaration order. */
export function groupParamDefs(defs: ParameterDefinition[]): Array<[string, ParameterDefinition[]]> {
  const groups = new Map<string, ParameterDefinition[]>();
  for (const def of defs) {
    const key = def.category || "Parameters";
    const list = groups.get(key);
    if (list) list.push(def);
    else groups.set(key, [def]);
  }
  return Array.from(groups.entries());
}
