// Scene file schema: the single source of truth for what a scene.json may contain.
// Every object is .strict(): unknown keys fail validation, so typos never render silently.
import { z } from "zod";

export const CANVAS = { width: 1080, height: 1920 } as const;

/** "@w:12", "@w:12+0.4", "@line:3", "@line:3-0.2", "@end", "@end-1" or plain seconds. */
export const CUE_RE = /^@(?:(w|line):(\d+)|(end))([+-]\d+(?:\.\d+)?)?$/;
export const CueSchema = z.union([
  z.number().nonnegative(),
  z.string().regex(CUE_RE, 'Cue must look like "@w:12", "@line:3", "@w:12+0.4", "@end" or a number of seconds'),
]);
export type Cue = z.infer<typeof CueSchema>;

export const ToneSchema = z.enum(["ink", "mutedInk", "accent", "accent2", "good", "bad"]);
export type Tone = z.infer<typeof ToneSchema>;

export const ENTER_KINDS = ["draw", "fade", "pop", "slide", "type"] as const;
export type EnterKind = (typeof ENTER_KINDS)[number];

const motionSchema = (kinds: readonly EnterKind[]) =>
  z
    .object({
      draw: CueSchema.optional(),
      fade: CueSchema.optional(),
      pop: CueSchema.optional(),
      slide: CueSchema.optional(),
      type: CueSchema.optional(),
      /** Seconds. Defaults to theme.motion.enterDur (draw: 1.2 s). */
      dur: z.number().positive().optional(),
    })
    .strict()
    .refine((m) => kinds.filter((k) => m[k] !== undefined).length === 1, {
      message: `Exactly one of ${kinds.join(" / ")} must be set`,
    })
    .refine((m) => ENTER_KINDS.filter((k) => !kinds.includes(k)).every((k) => m[k] === undefined), {
      message: `Only ${kinds.join(" / ")} are allowed here`,
    });

export const EnterSchema = motionSchema(ENTER_KINDS);
export const ExitSchema = motionSchema(["fade", "draw"]);
export type Enter = z.infer<typeof EnterSchema>;
export type Exit = z.infer<typeof ExitSchema>;

const Point = z.tuple([z.number(), z.number()]);
const TextSize = z.union([z.enum(["title", "label", "caption", "footnote"]), z.number().min(40)]);

const base = {
  /** Optional id so other elements (strike, arrow) and shared-element morphs can reference it. */
  id: z.string().optional(),
  enter: EnterSchema.optional(),
  exit: ExitSchema.optional(),
};
const pos = { x: z.number(), y: z.number() };

export const SvgElement = z
  .object({ type: z.literal("svg"), asset: z.string(), ...pos, w: z.number().positive(), tint: ToneSchema.optional(), ...base })
  .strict();
export const TagElement = z
  .object({ type: z.literal("tag"), text: z.string(), ...pos, tone: ToneSchema.optional(), size: TextSize.optional(), ...base })
  .strict();
export const CounterElement = z
  .object({
    type: z.literal("counter"),
    from: z.number(),
    to: z.number(),
    prefix: z.string().optional(),
    suffix: z.string().optional(),
    decimals: z.number().int().min(0).max(4).optional(),
    ...pos,
    /** Cue where the roll starts. The counter fades in here unless it has its own enter. */
    at: CueSchema,
    /** Roll duration in seconds. */
    dur: z.number().positive().optional(),
    size: TextSize.optional(),
    tone: ToneSchema.optional(),
    ...base,
  })
  .strict();
export const TextElement = z
  .object({
    type: z.literal("text"),
    text: z.string(),
    ...pos,
    size: TextSize.optional(),
    weight: z.number().int().min(100).max(900).optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    maxWidth: z.number().positive().optional(),
    tone: ToneSchema.optional(),
    font: z.enum(["display", "body", "mono"]).optional(),
    /** Optional per-word cues for enter.type reveal; otherwise words spread evenly over dur. */
    wordCues: z.array(CueSchema).optional(),
    ...base,
  })
  .strict();
export const PathElement = z
  .object({
    type: z.literal("path"),
    /** SVG path data in canvas coordinates, or a polyline via points. */
    d: z.string().optional(),
    points: z.array(Point).min(2).optional(),
    stroke: ToneSchema.optional(),
    width: z.number().positive().optional(),
    /** 0 = clean, 1 = strongly hand-drawn. Defaults to theme.stroke.wobble. */
    wobble: z.number().min(0).max(1).optional(),
    ...base,
  })
  .strict()
  .refine((p) => (p.d === undefined) !== (p.points === undefined), { message: "Set exactly one of d / points" });
export const PanelElement = z
  .object({ type: z.literal("panel"), ...pos, w: z.number().positive(), h: z.number().positive(), tone: ToneSchema.optional(), ...base })
  .strict();
export const ArrowElement = z
  .object({ type: z.literal("arrow"), from: Point, to: Point, text: z.string().optional(), tone: ToneSchema.optional(), ...base })
  .strict();
export const StrikeElement = z
  .object({
    type: z.literal("strike"),
    /** id of the element to strike / cross / tick. Box comes from the target's x, y, w (h defaults to 120). */
    target: z.string(),
    kind: z.enum(["strike", "cross", "tick"]),
    tone: ToneSchema.optional(),
    w: z.number().positive().optional(),
    h: z.number().positive().optional(),
    ...base,
  })
  .strict();
export const BarChartElement = z
  .object({
    type: z.literal("barchart"),
    ...pos,
    w: z.number().positive(),
    h: z.number().positive(),
    bars: z.array(z.object({ label: z.string(), value: z.number(), tone: ToneSchema.optional() }).strict()).min(2).max(6),
    max: z.number().positive().optional(),
    /** Re-grow to new values at a cue. */
    changes: z.array(z.object({ at: CueSchema, values: z.array(z.number()) }).strict()).optional(),
    valueSuffix: z.string().optional(),
    ...base,
  })
  .strict();
export const TimelineElement = z
  .object({
    type: z.literal("timeline"),
    ...pos,
    w: z.number().positive(),
    range: z.tuple([z.number(), z.number()]),
    events: z.array(z.object({ t: z.number(), label: z.string(), at: CueSchema.optional(), tone: ToneSchema.optional() }).strict()),
    spans: z
      .array(z.object({ from: z.number(), to: z.number(), label: z.string(), at: CueSchema.optional(), tone: ToneSchema.optional() }).strict())
      .optional(),
    ...base,
  })
  .strict();
export const MeterElement = z
  .object({
    type: z.literal("meter"),
    ...pos,
    w: z.number().positive(),
    kind: z.enum(["gauge", "bar"]).optional(),
    value: z.number(),
    min: z.number().optional(),
    max: z.number().optional(),
    label: z.string().optional(),
    tone: ToneSchema.optional(),
    ...base,
  })
  .strict();
export const DotsElement = z
  .object({
    type: z.literal("dots"),
    ...pos,
    w: z.number().positive(),
    count: z.number().int().positive().max(1000),
    perRow: z.number().int().positive(),
    highlight: z.number().int().nonnegative().optional(),
    label: z.string().optional(),
    tone: ToneSchema.optional(),
    ...base,
  })
  .strict();

export const ElementSchema = z.discriminatedUnion("type", [
  SvgElement,
  TagElement,
  CounterElement,
  TextElement,
  PathElement,
  PanelElement,
  ArrowElement,
  StrikeElement,
  BarChartElement,
  TimelineElement,
  MeterElement,
  DotsElement,
]);
export type SceneElement = z.infer<typeof ElementSchema>;
export type ElementType = SceneElement["type"];
export type ElementOf<T extends ElementType> = Extract<SceneElement, { type: T }>;

export const StageSchema = z
  .object({
    id: z.string(),
    from: CueSchema,
    to: CueSchema,
    /** Hard cut into this stage instead of the default crossfade. */
    cut: z.boolean().optional(),
    camera: z
      .object({
        /** [x0, y0, x1, y1] px offset at stage start -> end. Slow by rule. */
        pan: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
        /** Total scale gain over the stage, e.g. 0.03 = 3 %. Capped at 1 %/s by validation. */
        push: z.number().min(0).optional(),
      })
      .strict()
      .optional(),
    elements: z.array(ElementSchema),
  })
  .strict();
export type Stage = z.infer<typeof StageSchema>;

export const THEME_NAMES = ["blueprint", "archive", "amber-crt", "newsprint", "transit"] as const;
export const ThemeNameSchema = z.enum(THEME_NAMES);
export type ThemeName = z.infer<typeof ThemeNameSchema>;

export const SceneSchema = z
  .object({
    id: z.string().regex(/^[\w-]+$/),
    theme: ThemeNameSchema,
    fps: z.number().int().positive().default(30),
    audio: z
      .object({
        voice: z.string(),
        words: z.string(),
        music: z.string().optional(),
        musicGain: z.number().min(0).max(1).optional(),
      })
      .strict(),
    chrome: z
      .object({ title: z.string(), kicker: z.string().optional(), footnote: z.string().optional() })
      .strict(),
    /** Per-line caption override: { "3": "custom text" }. */
    captions: z.record(z.string().regex(/^\d+$/), z.string()).optional(),
    stages: z.array(StageSchema).min(1),
  })
  .strict();
export type Scene = z.infer<typeof SceneSchema>;
export type SceneInput = z.input<typeof SceneSchema>;

export const WordSchema = z
  .object({ i: z.number().int().nonnegative(), w: z.string(), s: z.number().nonnegative(), e: z.number().nonnegative(), line: z.number().int().nonnegative() })
  .strict();
export const WordsSchema = z.array(WordSchema).min(1);
export type Word = z.infer<typeof WordSchema>;

/** Props of the single Explainer composition. Media paths are relative to the Remotion publicDir. */
export const ExplainerPropsSchema = z.object({
  scene: SceneSchema,
  words: WordsSchema,
  media: z.object({ voice: z.string().nullable(), music: z.string().nullable() }),
});
export type ExplainerProps = z.infer<typeof ExplainerPropsSchema>;
