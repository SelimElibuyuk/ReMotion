// Small helpers shared by primitives. Keep this API stable: several primitives import it.
import React from "react";
import { CANVAS } from "../schema/scene";
import { fontStack, type ThemeTokens } from "../themes/types";
import { rand } from "../timing/easing";
import type { MotionState } from "../timing/motion";

export type TextSizeInput = "title" | "label" | "caption" | "footnote" | number | undefined;
export type FontRole = "display" | "body" | "mono";

/** Canvas size in px (1080x1920). */
export const CANVAS_W = CANVAS.width;
export const CANVAS_H = CANVAS.height;

/** Maps a schema TextSize ("title" | "label" | ... | px number) to px via theme.type.scale. */
export function textSizePx(theme: ThemeTokens, size: TextSizeInput, fallback: keyof ThemeTokens["type"]["scale"] = "label"): number {
  if (typeof size === "number") return size;
  return theme.type.scale[size ?? fallback];
}

/** CSS font-family string for a theme font role. */
export function fontFamily(theme: ThemeTokens, role: FontRole): string {
  return fontStack(theme.type[role]);
}

/** Applies theme.type.labelCase to a string (uppercase for "upper"). */
export function applyLabelCase(theme: ThemeTokens, text: string): string {
  return theme.type.labelCase === "upper" ? text.toUpperCase() : text;
}

/** `color` at `alpha` (0..1) over transparent, for tints; works with any CSS colour. */
export function withAlpha(color: string, alpha: number): string {
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
}

/** CSS transform + opacity for a MotionState (scale and translateY), without positioning. */
export function motionStyle(m: MotionState): React.CSSProperties {
  return {
    opacity: m.opacity,
    transform: `translateY(${m.translateY}px) scale(${m.scale})`,
  };
}

/**
 * Absolutely positions children so their CENTRE sits at (x, y) on the canvas and applies MotionState
 * opacity/scale/translateY. Optional w/h fix the box size; otherwise it shrink-wraps its content.
 */
export const Positioned: React.FC<{
  x: number;
  y: number;
  m: MotionState;
  w?: number;
  h?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ x, y, m, w, h, style, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      transform: `translate(-50%, -50%) translateY(${m.translateY}px) scale(${m.scale})`,
      opacity: m.opacity,
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * Deterministic hand-drawn jitter: subdivides each polyline segment, offsets points perpendicular to the
 * segment by up to `amount` * 6 px (amount 0..1), and returns a smooth SVG path "d". Endpoints stay put.
 */
export function wobblePath(points: ReadonlyArray<readonly [number, number]>, amount: number, seed: number): string {
  const first = points[0];
  const end = points[points.length - 1];
  if (!first || !end) return "";
  const pts: [number, number][] = [];
  const maxOff = amount * 6;
  let k = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    const [x0, y0] = a;
    const [x1, y1] = b;
    const len = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.round(len / 60));
    const nx = len > 0 ? -(y1 - y0) / len : 0;
    const ny = len > 0 ? (x1 - x0) / len : 0;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const off = i === 0 && s === 0 ? 0 : (rand(seed * 101 + k * 7.31) * 2 - 1) * maxOff;
      k++;
      pts.push([x0 + (x1 - x0) * t + nx * off, y0 + (y1 - y0) * t + ny * off]);
    }
  }
  const f = (n: number) => Math.round(n * 100) / 100;
  const P = (p: readonly [number, number] | undefined) => `${f(p?.[0] ?? 0)} ${f(p?.[1] ?? 0)}`;
  if (pts.length < 2) return `M${P(first)} L${P(end)}`;
  // Quadratic smoothing through segment midpoints.
  let d = `M${P(pts[0])}`;
  for (let i = 1; i < pts.length; i++) {
    const c = pts[i];
    const n = pts[i + 1];
    if (!c || !n) break;
    d += ` Q${P(c)} ${P([(c[0] + n[0]) / 2, (c[1] + n[1]) / 2])}`;
  }
  d += ` L${P(end)}`;
  return d;
}
