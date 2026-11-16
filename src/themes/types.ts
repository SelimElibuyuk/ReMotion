// Theme token contract. Primitives never hard-code a colour, font or stroke: they read these tokens.
import type { Tone } from "../schema/scene";

export interface FontSpec {
  /** CSS font-family name used in styles. */
  family: string;
  /** Font files under public/fonts/, loaded with @remotion/fonts before the first frame. */
  files: { path: string; weight?: string; style?: "normal" | "italic" }[];
  /** CSS fallback stack appended after family. */
  fallback: string;
}

export interface ThemeTokens {
  name: string;
  /** Max 6 colours plus background. */
  palette: { background: string; ink: string; mutedInk: string; accent: string; accent2: string; good: string; bad: string };
  type: {
    display: FontSpec;
    body: FontSpec;
    mono: FontSpec;
    /** px sizes. Rules: caption >= 64, label >= 40. */
    scale: { title: number; label: number; caption: number; footnote: number };
    /** Uppercase + letter-spacing for tags / kickers. */
    labelCase: "upper" | "none";
    labelTracking: number;
  };
  stroke: { width: number; cap: "round" | "butt" | "square"; join: "round" | "miter" | "bevel"; wobble: number };
  surface: { texture: "paper" | "grid" | "scanlines" | "halftone" | "none"; vignette: number };
  caption: { box: "solid" | "underline" | "none"; activeWord: string; band: "bottom" | "middle"; boxColor: string; textColor: string };
  motion: { ease: "out" | "inOut"; enterDur: number; drawDur: number; idleDrift: number };
  render: "vector" | "pixel";
  /** Tag / panel look. */
  tag: { radius: number; borderWidth: number; fill: "none" | "solid" | "tint" };
}

export const toneColor = (t: ThemeTokens, tone: Tone | undefined, fallback: Tone = "ink"): string => t.palette[tone ?? fallback];

export const fontStack = (f: FontSpec): string => `"${f.family}", ${f.fallback}`;
