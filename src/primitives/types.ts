// Contract every primitive implements. Primitives are rendered inside their stage's <Sequence>,
// so useCurrentFrame() and all frame numbers here are relative to the stage start.
import type { Cue, ElementOf, ElementType } from "../schema/scene";
import type { ThemeTokens } from "../themes/types";
import type { Motion } from "../timing/motion";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PrimitiveProps<T extends ElementType> {
  el: ElementOf<T>;
  theme: ThemeTokens;
  /** Resolved enter; null = visible from stage start. */
  enter: Motion | null;
  exit: Motion | null;
  /** Resolve any cue to a stage-relative frame (for per-word / per-event timing inside a primitive). */
  cue: (c: Cue) => number;
  fps: number;
  /** For "strike": the target element's box (centre x/y, width, height). */
  targetBox?: Box;
  /** Stable seed for deterministic wobble. */
  seed: number;
}

export type Primitive<T extends ElementType> = React.FC<PrimitiveProps<T>>;
