"use client";

import {
  AppState,
  AsciiAlgorithm,
  AsciiCharsetPreset,
  ColorOptions,
  DitherStyle,
  RenderMode,
  RenderResolution,
} from "@/lib/types";
import { Section } from "./controls/Section";
import { SliderInput } from "./controls/SliderInput";
import { Toggle } from "./controls/Toggle";
import { ColorInput } from "./controls/ColorInput";
import { Select } from "./controls/Select";
import { TextInput } from "./controls/TextInput";
import { ColorControls } from "./controls/ColorControls";
import { EFFECT_MODES, MODE_OPTIONS, modeLabel } from "@/lib/modes";
import { captureVisualState, makeKeyframe, upsertKeyframe, withVisualState } from "@/lib/timeline";

interface Props {
  state: AppState;
  setState: (next: AppState) => void;
  hasImage: boolean;
  onReplaceImage: () => void;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onExportReact: () => void;
  onExportVideo: () => void;
  onExportFavicon: () => void;
  recordingVideo: boolean;
  recordingProgress: number;
  canvasSize: { width: number; height: number; dpr: number } | null;
}

export function Sidebar({
  state,
  setState,
  hasImage,
  onReplaceImage,
  onExportPNG,
  onExportSVG,
  onExportReact,
  onExportVideo,
  onExportFavicon,
  recordingVideo,
  recordingProgress,
  canvasSize,
}: Props) {
  const set = <K extends keyof AppState>(key: K, value: AppState[K]) =>
    setState({ ...state, [key]: value });

  const setAscii = (patch: Partial<AppState["ascii"]>) =>
    setState({ ...state, ascii: { ...state.ascii, ...patch } });
  const setPixels = (patch: Partial<AppState["pixels"]>) =>
    setState({ ...state, pixels: { ...state.pixels, ...patch } });
  const setDots = (patch: Partial<AppState["dots"]>) =>
    setState({ ...state, dots: { ...state.dots, ...patch } });
  const setMosaic = (patch: Partial<AppState["mosaic"]>) =>
    setState({ ...state, mosaic: { ...state.mosaic, ...patch } });
  const setBlurred = (patch: Partial<AppState["blurred"]>) =>
    setState({ ...state, blurred: { ...state.blurred, ...patch } });
  const setBlack = (patch: Partial<AppState["black"]>) =>
    setState({ ...state, black: { ...state.black, ...patch } });
  const setTransparent = (patch: Partial<AppState["transparent"]>) =>
    setState({ ...state, transparent: { ...state.transparent, ...patch } });
  const setEffect = (patch: Partial<AppState["effect"]>) =>
    setState({ ...state, effect: { ...state.effect, ...patch } });
  const setOutput = (patch: Partial<AppState["output"]>) =>
    setState({ ...state, output: { ...state.output, ...patch } });
  const setMouse = (patch: Partial<AppState["mouse"]>) =>
    setState({ ...state, mouse: { ...state.mouse, ...patch } });
  const setTimeline = (patch: Partial<AppState["timeline"]>) =>
    setState({ ...state, timeline: { ...state.timeline, ...patch } });

  const setColor = <
    M extends "ascii" | "pixels" | "dots" | "mosaic" | "blurred" | "black" | "transparent" | "effect"
  >(mode: M, color: ColorOptions) => {
    setState({ ...state, [mode]: { ...state[mode], color } });
  };

  const isEffectMode = EFFECT_MODES.has(state.mode);
  const sortedKeyframes = state.timeline.keyframes.slice().sort((a, b) => a.time - b.time);
  const selectedKeyframe = sortedKeyframes.find((k) => k.id === state.timeline.selectedId) ?? null;
  const needsText =
    state.mode === "text_fill" ||
    state.mode === "word_cloud" ||
    state.mode === "matrix_rain";
  const showSeed = new Set<RenderMode>([
    "voronoi",
    "pointillism",
    "oil_painting",
    "stippling",
    "flow_field",
    "thermal",
    "infrared",
    "solarize",
    "duotone",
    "voronoi_stipple",
    "string_art",
    "pixel_sort",
    "glitch",
    "reaction_diffusion",
    "liquid",
    "sand",
    "magnetic_field",
    "noise_displacement",
  ]).has(state.mode);
  const showThreshold = new Set<RenderMode>([
    "dithering",
    "halftone_cmyk",
    "linocut",
    "solarize",
    "text_fill",
    "word_cloud",
    "matrix_rain",
    "binary",
    "pixel_sort",
  ]).has(state.mode);
  const effectScaleLabel: Partial<Record<RenderMode, string>> = {
    flow_field: "Line spacing",
    liquid: "Fluid grid",
    sand: "Grain size",
    magnetic_field: "Field spacing",
    reaction_diffusion: "Pattern scale",
    pointillism: "Dot spacing",
    stippling: "Stipple spacing",
    topographic: "Contour spacing",
    string_art: "Pin density",
    halftone_cmyk: "Dot spacing",
    pixel_sort: "Segment size",
    dithering: "Dither scale",
    glitch: "Band size",
    text_fill: "Text size",
    word_cloud: "Word size",
    emoji: "Emoji size",
    binary: "Glyph size",
    matrix_rain: "Glyph size",
  };
  const effectIntensityLabel: Partial<Record<RenderMode, string>> = {
    flow_field: "Flow strength",
    liquid: "Flow energy",
    sand: "Gravity",
    magnetic_field: "Field curvature",
    reaction_diffusion: "Reaction amount",
    glitch: "Glitch amount",
    dithering: "Diffusion amount",
    pixel_sort: "Sort turbulence",
    topographic: "Contour detail",
    text_fill: "Fill strength",
    word_cloud: "Fill density",
  };

  const addKeyframe = () => {
    const time = state.timeline.enabled ? state.timeline.currentTime : 0;
    const kf = makeKeyframe(time, state);
    const keyframes = upsertKeyframe(state.timeline.keyframes, kf);
    setState({
      ...state,
      timeline: {
        ...state.timeline,
        enabled: true,
        playing: false,
        keyframes,
        selectedId: kf.id,
        currentTime: kf.time,
      },
    });
  };

  const updateSelectedKeyframe = () => {
    const kf = selectedKeyframe;
    if (!kf) {
      addKeyframe();
      return;
    }
    const next = {
      ...kf,
      time: state.timeline.currentTime,
      state: captureVisualState(state),
    };
    const keyframes = upsertKeyframe(state.timeline.keyframes, next, 0);
    setState({
      ...state,
      timeline: {
        ...state.timeline,
        keyframes,
        selectedId: next.id,
      },
    });
  };

  const deleteSelectedKeyframe = () => {
    if (!selectedKeyframe) return;
    const keyframes = state.timeline.keyframes.filter((k) => k.id !== selectedKeyframe.id);
    setState({
      ...state,
      timeline: {
        ...state.timeline,
        keyframes,
        selectedId: keyframes.length > 0 ? keyframes[0].id : null,
      },
    });
  };

  const jumpToKeyframe = (id: string) => {
    const kf = state.timeline.keyframes.find((k) => k.id === id);
    if (!kf) return;
    const loaded = withVisualState(state, kf.state);
    setState({
      ...loaded,
      timeline: {
        ...loaded.timeline,
        enabled: true,
        playing: false,
        currentTime: kf.time,
        selectedId: kf.id,
      },
    });
  };

  return (
    <aside className="h-full w-[380px] shrink-0 bg-ink-900 border-l border-white/5 flex flex-col">
      <header className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <h1 className="text-sm font-medium tracking-wider uppercase">Pixelate</h1>
        </div>
        <span className="text-[10px] text-white/30 font-mono">v0.1</span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 px-scroll">
        <Section title="Mode">
          <Select<RenderMode>
            label="Render mode"
            value={state.mode}
            options={MODE_OPTIONS.map((m) => ({
              value: m.value,
              label: `${m.group} - ${m.label}`,
            }))}
            onChange={(m) => set("mode", m)}
          />
        </Section>

        <Section title="Timeline">
          <Toggle
            label="Enabled"
            value={state.timeline.enabled}
            onChange={(v) => {
              if (v && state.timeline.keyframes.length === 0) {
                const kf = makeKeyframe(0, state);
                setState({
                  ...state,
                  timeline: {
                    ...state.timeline,
                    enabled: true,
                    playing: false,
                    currentTime: 0,
                    keyframes: [kf],
                    selectedId: kf.id,
                  },
                });
                return;
              }
              setTimeline({ enabled: v, playing: v ? state.timeline.playing : false });
            }}
          />
          {state.timeline.enabled && (
            <>
              <SliderInput
                label="Duration"
                value={state.timeline.duration}
                min={1}
                max={10}
                step={0.25}
                onChange={(v) =>
                  setTimeline({
                    duration: v,
                    currentTime: Math.min(v, state.timeline.currentTime),
                  })
                }
                unit="s"
              />
              <SliderInput
                label="Playhead"
                value={state.timeline.currentTime}
                min={0}
                max={Math.max(0.1, state.timeline.duration)}
                step={0.01}
                onChange={(v) => setTimeline({ currentTime: v, playing: false })}
                unit="s"
              />
              <Toggle
                label="Loop"
                value={state.timeline.loop}
                onChange={(v) => setTimeline({ loop: v })}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTimeline({ playing: !state.timeline.playing })}
                  className="text-xs py-2 rounded border border-white/10 hover:border-white/30 hover:bg-white/5 transition-colors"
                >
                  {state.timeline.playing ? "Pause" : "Play"}
                </button>
                <button
                  type="button"
                  onClick={addKeyframe}
                  className="text-xs py-2 rounded border border-white/10 hover:border-white/30 hover:bg-white/5 transition-colors"
                >
                  Add keyframe
                </button>
                <button
                  type="button"
                  onClick={updateSelectedKeyframe}
                  className="text-xs py-2 rounded border border-white/10 hover:border-white/30 hover:bg-white/5 transition-colors"
                >
                  Update selected
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedKeyframe}
                  disabled={!selectedKeyframe}
                  className="text-xs py-2 rounded border border-white/10 hover:border-white/30 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Delete selected
                </button>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {sortedKeyframes.map((kf, i) => (
                  <button
                    key={kf.id}
                    type="button"
                    onClick={() => jumpToKeyframe(kf.id)}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded border transition-colors ${
                      state.timeline.selectedId === kf.id
                        ? "border-emerald-400/60 bg-emerald-400/10"
                        : "border-white/10 hover:border-white/30 hover:bg-white/5"
                    }`}
                  >
                    K{i + 1} · {kf.time.toFixed(2)}s
                  </button>
                ))}
              </div>
            </>
          )}
        </Section>

        {state.mode === "ascii" && (
          <>
            <Section title="ASCII">
              <Select<AsciiCharsetPreset>
                label="Character mapping"
                value={state.ascii.charsetPreset}
                options={[
                  { value: "standard", label: "Brightness ASCII" },
                  { value: "blocks", label: "Block characters" },
                  { value: "braille", label: "Braille density" },
                  { value: "directional", label: "Edge glyphs" },
                  { value: "detailed", label: "Detailed ASCII" },
                  { value: "custom", label: "Custom charset" },
                ]}
                onChange={(v) => {
                  const patch: Partial<AppState["ascii"]> = { charsetPreset: v };
                  if (v === "directional") patch.algorithm = "edge_directional";
                  else if (state.ascii.algorithm === "edge_directional") patch.algorithm = "brightness";
                  setAscii(patch);
                }}
              />
              {state.ascii.charsetPreset === "custom" && (
                <TextInput
                  label="Custom charset"
                  value={state.ascii.charset}
                  onChange={(v) => setAscii({ charset: v })}
                  placeholder=" .:-=+*#%@"
                  mono
                />
              )}
              <SliderInput
                label="Density"
                value={state.ascii.density}
                min={20}
                max={240}
                onChange={(v) => setAscii({ density: v })}
                unit="cols"
              />
              <SliderInput
                label="Char aspect"
                value={state.ascii.charAspect}
                min={1}
                max={2.4}
                step={0.05}
                onChange={(v) => setAscii({ charAspect: v })}
              />
              <Select<AsciiAlgorithm>
                label="Mapping algorithm"
                value={state.ascii.algorithm}
                options={[
                  { value: "brightness", label: "Perceptual luminance" },
                  { value: "average", label: "Standard brightness" },
                  { value: "lightness", label: "HSL lightness" },
                  { value: "edge", label: "Sobel edge strength" },
                  { value: "edge_directional", label: "Edge direction sketch" },
                  { value: "contrast", label: "Contrast boosted" },
                ]}
                onChange={(v) => setAscii({ algorithm: v })}
              />
              <Toggle
                label="Inverted"
                value={state.ascii.inverted}
                onChange={(v) => setAscii({ inverted: v })}
              />
              <Toggle
                label="Dithered"
                value={state.ascii.dithered}
                onChange={(v) => setAscii({ dithered: v })}
              />
            </Section>
            <Section title="ASCII color">
              <ColorControls
                value={state.ascii.color}
                onChange={(v) => setColor("ascii", v)}
              />
            </Section>
          </>
        )}

        {state.mode === "blurred" && (
          <>
            <Section title="Blurred Image">
              <SliderInput
                label="Blur radius"
                value={state.blurred.radius}
                min={0}
                max={50}
                onChange={(v) => setBlurred({ radius: v })}
                unit="px"
              />
              <SliderInput
                label="Saturation"
                value={state.blurred.saturation}
                min={0}
                max={2}
                step={0.05}
                onChange={(v) => setBlurred({ saturation: v })}
              />
              <SliderInput
                label="Brightness"
                value={state.blurred.brightness}
                min={0}
                max={2}
                step={0.05}
                onChange={(v) => setBlurred({ brightness: v })}
              />
            </Section>
            <Section title="Blur color">
              <ColorControls
                value={state.blurred.color}
                onChange={(v) => setColor("blurred", v)}
              />
            </Section>
          </>
        )}

        {state.mode === "black" && (
          <>
            <Section title="Black Silhouette">
              <SliderInput
                label="Threshold"
                value={state.black.threshold}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => setBlack({ threshold: v })}
              />
              <SliderInput
                label="Softness"
                value={state.black.softness}
                min={0}
                max={10}
                step={0.5}
                onChange={(v) => setBlack({ softness: v })}
                unit="px"
              />
              <Toggle
                label="Invert"
                value={state.black.invert}
                onChange={(v) => setBlack({ invert: v })}
              />
            </Section>
            <Section title="Silhouette color">
              <ColorControls
                value={state.black.color}
                onChange={(v) => setColor("black", v)}
              />
            </Section>
          </>
        )}

        {state.mode === "transparent" && (
          <>
            <Section title="Transparent Image">
              <SliderInput
                label="Opacity"
                value={state.transparent.opacity}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => setTransparent({ opacity: v })}
              />
              <SliderInput
                label="Blur"
                value={state.transparent.blur}
                min={0}
                max={50}
                onChange={(v) => setTransparent({ blur: v })}
                unit="px"
              />
            </Section>
            <Section title="Transparent color">
              <ColorControls
                value={state.transparent.color}
                onChange={(v) => setColor("transparent", v)}
              />
            </Section>
          </>
        )}

        {isEffectMode && (
          <>
            <Section title={modeLabel(state.mode)}>
              <SliderInput
                label={effectScaleLabel[state.mode] ?? "Scale"}
                value={state.effect.scale}
                min={4}
                max={80}
                onChange={(v) => setEffect({ scale: v })}
                unit="px"
              />
              <SliderInput
                label={effectIntensityLabel[state.mode] ?? "Intensity"}
                value={state.effect.intensity}
                min={0}
                max={1}
                step={0.02}
                onChange={(v) => setEffect({ intensity: v })}
              />
              {showThreshold && (
                <SliderInput
                  label="Threshold"
                  value={state.effect.threshold}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => setEffect({ threshold: v })}
                />
              )}
              {showSeed && (
                <SliderInput
                  label="Seed"
                  value={state.effect.seed}
                  min={1}
                  max={999}
                  onChange={(v) => setEffect({ seed: v })}
                />
              )}
              {state.mode === "dithering" && (
                <Select<DitherStyle>
                  label="Dither style"
                  value={state.effect.ditherStyle}
                  options={[
                    { value: "floyd", label: "Floyd-Steinberg" },
                    { value: "bayer", label: "Bayer matrix" },
                    { value: "ordered", label: "Ordered" },
                    { value: "sierra", label: "Sierra" },
                    { value: "atkinson", label: "Atkinson" },
                  ]}
                  onChange={(v) => setEffect({ ditherStyle: v })}
                />
              )}
              {needsText && (
                <TextInput
                  label="Text"
                  value={state.effect.text}
                  onChange={(v) => setEffect({ text: v })}
                  placeholder="PIXELATE"
                  mono
                />
              )}
              {state.mode === "emoji" && (
                <TextInput
                  label="Emoji set"
                  value={state.effect.emojiSet}
                  onChange={(v) => setEffect({ emojiSet: v })}
                  placeholder="🌑🌒🌓🌔🌕"
                />
              )}
              {(state.mode === "duotone" ||
                state.mode === "risograph" ||
                state.mode === "dithering" ||
                state.mode === "linocut" ||
                state.mode === "string_art") && (
                <div className="grid grid-cols-2 gap-2">
                  <ColorInput
                    label="Shadow"
                    value={state.effect.shadowColor}
                    onChange={(v) => setEffect({ shadowColor: v })}
                  />
                  <ColorInput
                    label="Highlight"
                    value={state.effect.highlightColor}
                    onChange={(v) => setEffect({ highlightColor: v })}
                  />
                </div>
              )}
            </Section>
            <Section title="Effect color">
              <ColorControls
                value={state.effect.color}
                onChange={(v) => setColor("effect", v)}
              />
            </Section>
          </>
        )}

        {state.mode === "pixels" && (
          <>
            <Section title="Pixel Blocks">
              <SliderInput
                label="Cell size"
                value={state.pixels.cellSize}
                min={3}
                max={60}
                onChange={(v) => setPixels({ cellSize: v })}
                unit="px"
              />
              <SliderInput
                label="Gap"
                value={state.pixels.gap}
                min={0}
                max={10}
                onChange={(v) => setPixels({ gap: v })}
                unit="px"
              />
              <Toggle
                label="Rounded"
                value={state.pixels.rounded}
                onChange={(v) => setPixels({ rounded: v })}
              />
              {state.pixels.rounded && (
                <SliderInput
                  label="Roundness"
                  value={state.pixels.roundness}
                  min={0}
                  max={0.5}
                  step={0.02}
                  onChange={(v) => setPixels({ roundness: v })}
                />
              )}
            </Section>
            <Section title="Pixel color">
              <ColorControls
                value={state.pixels.color}
                onChange={(v) => setColor("pixels", v)}
              />
            </Section>
          </>
        )}

        {state.mode === "dots" && (
          <>
            <Section title="Dots">
              <SliderInput
                label="Cell size"
                value={state.dots.cellSize}
                min={3}
                max={60}
                onChange={(v) => setDots({ cellSize: v })}
                unit="px"
              />
              <Toggle
                label="Size from brightness"
                value={state.dots.sizeFromBrightness}
                onChange={(v) => setDots({ sizeFromBrightness: v })}
              />
              {state.dots.sizeFromBrightness && (
                <>
                  <Toggle
                    label="Invert size"
                    value={state.dots.invertSize}
                    onChange={(v) => setDots({ invertSize: v })}
                  />
                  <SliderInput
                    label="Min size"
                    value={state.dots.minSize}
                    min={0}
                    max={1}
                    step={0.02}
                    onChange={(v) => setDots({ minSize: v })}
                  />
                  <SliderInput
                    label="Max size"
                    value={state.dots.maxSize}
                    min={0}
                    max={1}
                    step={0.02}
                    onChange={(v) => setDots({ maxSize: v })}
                  />
                </>
              )}
            </Section>
            <Section title="Dot color">
              <ColorControls
                value={state.dots.color}
                onChange={(v) => setColor("dots", v)}
              />
            </Section>
          </>
        )}

        {state.mode === "mosaic" && (
          <>
            <Section title="Mosaic">
              <SliderInput
                label="Tile size"
                value={state.mosaic.cellSize}
                min={4}
                max={80}
                onChange={(v) => setMosaic({ cellSize: v })}
                unit="px"
              />
              <SliderInput
                label="Variation"
                value={state.mosaic.variation}
                min={0}
                max={1}
                step={0.02}
                onChange={(v) => setMosaic({ variation: v })}
              />
              <SliderInput
                label="Rotation"
                value={state.mosaic.rotation}
                min={0}
                max={1}
                step={0.02}
                onChange={(v) => setMosaic({ rotation: v })}
              />
              <Toggle
                label="Rounded"
                value={state.mosaic.rounded}
                onChange={(v) => setMosaic({ rounded: v })}
              />
            </Section>
            <Section title="Mosaic color">
              <ColorControls
                value={state.mosaic.color}
                onChange={(v) => setColor("mosaic", v)}
              />
            </Section>
          </>
        )}

        <Section title="Output">
          <SliderInput
            label="Brightness"
            value={state.output.brightness}
            min={0}
            max={2}
            step={0.01}
            onChange={(v) => setOutput({ brightness: v })}
          />
          <SliderInput
            label="Saturation"
            value={state.output.saturation}
            min={0}
            max={2}
            step={0.01}
            onChange={(v) => setOutput({ saturation: v })}
          />
          <SliderInput
            label="Hue"
            value={state.output.hue}
            min={-180}
            max={180}
            onChange={(v) => setOutput({ hue: v })}
            unit="deg"
          />
          <SliderInput
            label="Luminance"
            value={state.output.luminance}
            min={0}
            max={2}
            step={0.01}
            onChange={(v) => setOutput({ luminance: v })}
          />
          <SliderInput
            label="Opacity"
            value={state.output.opacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => setOutput({ opacity: v })}
          />
        </Section>

        <Section title="Mouse Interaction">
          <Toggle
            label="Enabled"
            value={state.mouse.enabled}
            onChange={(v) => setMouse({ enabled: v })}
          />
          {state.mouse.enabled && (
            <>
              <SliderInput
                label="Repel radius"
                value={state.mouse.radius}
                min={20}
                max={400}
                onChange={(v) => setMouse({ radius: v })}
                unit="px"
              />
              <SliderInput
                label="Strength"
                value={state.mouse.strength}
                min={0}
                max={3}
                step={0.05}
                onChange={(v) => setMouse({ strength: v })}
              />
              <SliderInput
                label="Return speed"
                value={state.mouse.returnSpeed}
                min={0.01}
                max={0.3}
                step={0.005}
                onChange={(v) => setMouse({ returnSpeed: v })}
              />
              <SliderInput
                label="Damping"
                value={state.mouse.damping}
                min={0.5}
                max={0.98}
                step={0.01}
                onChange={(v) => setMouse({ damping: v })}
              />
            </>
          )}
        </Section>

        <Section title="Canvas">
          <Select<RenderResolution>
            label="Render resolution"
            value={state.renderResolution}
            options={[
              { value: "auto", label: "Auto (display × DPR)" },
              { value: "720p", label: "720p" },
              { value: "1080p", label: "1080p" },
              { value: "1440p", label: "1440p" },
              { value: "2160p", label: "2160p (4K)" },
            ]}
            onChange={(v) => set("renderResolution", v)}
          />
          <Toggle
            label="Background"
            value={state.backgroundEnabled}
            onChange={(v) => set("backgroundEnabled", v)}
          />
          {state.backgroundEnabled && (
            <ColorInput
              label="Background color"
              value={state.background}
              onChange={(v) => set("background", v)}
            />
          )}
        </Section>

        <Section title="Source">
          <button
            onClick={onReplaceImage}
            disabled={!hasImage}
            className="w-full text-xs py-2 rounded border border-white/10 hover:border-white/30 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Replace media
          </button>
        </Section>
      </div>

      <footer className="border-t border-white/5 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Export</div>
          {canvasSize && (
            <div className="text-[10px] text-white/30 tabular-nums font-mono">
              <span className="text-white/50">{canvasSize.width}×{canvasSize.height}</span>
            </div>
          )}
        </div>
        <SliderInput
          label="Video length"
          value={state.videoDurationSec}
          min={1}
          max={10}
          step={1}
          onChange={(v) => set("videoDurationSec", v)}
          unit="s"
        />
        <div className="grid grid-cols-2 gap-2">
          <ExportButton onClick={onExportPNG} disabled={!hasImage}>PNG</ExportButton>
          <ExportButton onClick={onExportSVG} disabled={!hasImage}>SVG</ExportButton>
          <ExportButton onClick={onExportReact} disabled={!hasImage}>React</ExportButton>
          <ExportButton
            onClick={onExportVideo}
            disabled={!hasImage || recordingVideo}
            active={recordingVideo}
          >
            {recordingVideo ? `Recording ${Math.round(recordingProgress * 100)}%` : "Video"}
          </ExportButton>
          <ExportButton onClick={onExportFavicon} disabled={!hasImage}>
            Favicon
          </ExportButton>
        </div>
        <p className="text-[10px] text-white/30 leading-relaxed pt-1">
          PNG &amp; Video render at canvas size · SVG &amp; React are vector · Favicon is .ico with 16/32/48/64/128/256.
        </p>
      </footer>
    </aside>
  );
}

function ExportButton({
  onClick,
  disabled,
  active,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs py-2 rounded border transition-colors ${
        active
          ? "bg-red-500/20 border-red-500/40 text-red-200"
          : "border-white/10 hover:border-white/30 hover:bg-white/5"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}
