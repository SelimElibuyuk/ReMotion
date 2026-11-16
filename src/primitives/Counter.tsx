// Number that rolls from -> to starting at cue(el.at). Tabular figures so digits do not jitter.
import React from "react";
import { useCurrentFrame } from "remotion";
import { toneColor } from "../themes/types";
import { EASE_OUT, lerp, progress } from "../timing/easing";
import { useMotion } from "../timing/motion";
import { Positioned, fontFamily, textSizePx } from "./shared";
import type { Primitive } from "./types";

/** Deterministic en-US formatting with thousands separators (no Intl, so output is locale independent). */
function formatNumber(v: number, decimals: number): string {
  const fixed = Math.abs(v).toFixed(decimals);
  const [int = "0", frac] = fixed.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const neg = v < 0 && Number(fixed) !== 0 ? "-" : "";
  return neg + grouped + (frac ? "." + frac : "");
}

export const CounterPrim: Primitive<"counter"> = ({ el, theme, enter, exit, cue, fps }) => {
  const frame = useCurrentFrame();
  const start = cue(el.at);
  // Fades in at the roll start unless the element has its own enter.
  const m = useMotion(enter ?? { kind: "fade", start, dur: Math.round(theme.motion.enterDur * fps) }, exit);
  if (!m.visible) return null;
  const t = progress(frame, start, (el.dur ?? 1.5) * fps, EASE_OUT);
  const value = lerp(el.from, el.to, t);
  return (
    <Positioned x={el.x} y={el.y} m={m}>
      <div
        style={{
          whiteSpace: "nowrap",
          fontFamily: fontFamily(theme, "display"),
          fontSize: textSizePx(theme, el.size, "title"),
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          color: toneColor(theme, el.tone, "ink"),
        }}
      >
        {el.prefix ?? ""}
        {formatNumber(value, el.decimals ?? 0)}
        {el.suffix ?? ""}
      </div>
    </Positioned>
  );
};
