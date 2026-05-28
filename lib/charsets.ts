import { AsciiCharsetPreset } from "./types";

/**
 * Charset presets ordered from "least dense" → "most dense".
 * The renderer maps a 0–1 value to an index in the string.
 */
export const CHARSET_PRESETS: Record<Exclude<AsciiCharsetPreset, "custom">, string> = {
  standard: " .:-=+*#%@",
  detailed:
    " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  blocks: " ░▒▓█",
  braille: " ⠁⠃⠉⠋⠛⠟⠿⡿⣿",
  directional: "|/-\\",
};

export function charsetFor(preset: AsciiCharsetPreset, custom: string): string {
  if (preset === "custom") return custom.length > 0 ? custom : CHARSET_PRESETS.standard;
  return CHARSET_PRESETS[preset];
}
