// Shared enter/exit motion. Every primitive calls useMotion() so entrances look the same everywhere.
import { useCurrentFrame } from "remotion";
import type { EnterKind } from "../schema/scene";
import { EASE_IN_OUT, EASE_OUT, popScale, progress } from "./easing";

/** A resolved motion, in frames relative to the stage start. */
export interface Motion {
  kind: EnterKind;
  start: number;
  dur: number;
}

export interface MotionState {
  /** Has the element entered yet (frame >= enter.start)? Before that, render nothing. */
  visible: boolean;
  opacity: number;
  scale: number;
  /** px, for "slide" (24 px rise). */
  translateY: number;
  /** 0..1, for "draw" (stroke-dash) and "type" (word reveal). Primitives that don't draw treat draw as fade. */
  draw: number;
  /** Raw 0..1 enter progress, eased. */
  enterT: number;
}

export function motionState(frame: number, enter: Motion | null, exit: Motion | null): MotionState {
  let opacity = 1;
  let scale = 1;
  let translateY = 0;
  let draw = 1;
  let enterT = 1;
  if (enter) {
    if (frame < enter.start) return { visible: false, opacity: 0, scale: 1, translateY: 0, draw: 0, enterT: 0 };
    enterT = progress(frame, enter.start, enter.dur, EASE_OUT);
    const linearT = progress(frame, enter.start, enter.dur, (t) => t);
    switch (enter.kind) {
      case "fade":
        opacity = enterT;
        break;
      case "pop":
        opacity = Math.min(1, linearT * 3);
        scale = popScale(linearT);
        break;
      case "slide":
        opacity = enterT;
        translateY = (1 - enterT) * 24;
        break;
      case "draw":
        draw = progress(frame, enter.start, enter.dur, EASE_IN_OUT);
        break;
      case "type":
        draw = linearT;
        break;
    }
  }
  if (exit && frame >= exit.start) {
    const t = progress(frame, exit.start, exit.dur, EASE_IN_OUT);
    if (exit.kind === "draw") draw = Math.min(draw, 1 - t);
    else opacity *= 1 - t;
  }
  return { visible: true, opacity, scale, translateY, draw, enterT };
}

export function useMotion(enter: Motion | null, exit: Motion | null): MotionState {
  return motionState(useCurrentFrame(), enter, exit);
}
