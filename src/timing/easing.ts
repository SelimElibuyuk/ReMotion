// The single easing module. All motion in the engine goes through here so the feel stays consistent.
import { Easing, interpolate } from "remotion";

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
export const EASE_IN = Easing.bezier(0.5, 0, 0.75, 0);
export const LINEAR = (t: number) => t;

/** 0..1 progress of `frame` through [start, start+dur], eased and clamped. */
export function progress(frame: number, start: number, dur: number, ease: (t: number) => number = EASE_OUT): number {
  if (dur <= 0) return frame >= start ? 1 : 0;
  return interpolate(frame, [start, start + dur], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/** Linear map with clamping, for value tweens after easing has been applied. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Pop scale: 0.92 -> 1 with at most 4 % overshoot (product rule: no bounce larger than 4 %). */
export function popScale(t: number): number {
  const overshoot = 0.03;
  if (t >= 1) return 1;
  // rise to 1+overshoot at t=0.7 then settle
  if (t < 0.7) return lerp(0.92, 1 + overshoot, EASE_OUT(t / 0.7));
  return lerp(1 + overshoot, 1, EASE_IN_OUT((t - 0.7) / 0.3));
}

/** Deterministic pseudo-random in [0,1) from a seed — use instead of Math.random (renders must be pure). */
export function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
