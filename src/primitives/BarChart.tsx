// Vertical bar chart: bars grow staggered, value labels count up, optional re-grow to new values at cues.
import React from "react";
import { useCurrentFrame } from "remotion";
import { toneColor } from "../themes/types";
import { EASE_IN_OUT, EASE_OUT, lerp, progress } from "../timing/easing";
import { useMotion } from "../timing/motion";
import { applyLabelCase, CANVAS_H, CANVAS_W, fontFamily, textSizePx, withAlpha } from "./shared";
import type { Primitive } from "./types";

export const BarChartPrim: Primitive<"barchart"> = ({ el, theme, enter, exit, cue, fps }) => {
  const m = useMotion(enter, exit);
  const frame = useCurrentFrame();
  if (!m.visible) return null;

  const n = el.bars.length;
  const labelSize = textSizePx(theme, "label");
  const pad = 14;
  const top = el.y - el.h / 2 + labelSize + pad;
  const base = el.y + el.h / 2 - labelSize - pad;
  const plotH = Math.max(10, base - top);
  const left = el.x - el.w / 2;
  const slot = el.w / n;
  const barW = slot * 0.6;

  const changes = [...(el.changes ?? [])].map((c) => ({ at: cue(c.at), values: c.values })).sort((a, b) => a.at - b.at);
  const allVals = [...el.bars.map((b) => b.value), ...changes.flatMap((c) => c.values)];
  const max = el.max ?? Math.max(...allVals, 1) * 1.1;
  const decimals = allVals.every((v) => Number.isInteger(v)) ? 0 : 1;
  const tweenDur = Math.round(0.6 * fps);
  const growDur = Math.round(0.6 * fps);
  const stagger = Math.round(0.15 * fps);
  const start = enter?.start ?? 0;

  const valueAt = (i: number): number => {
    let v = el.bars[i]?.value ?? 0;
    for (const c of changes) {
      const to = c.values[i] ?? v;
      v = lerp(v, to, progress(frame, c.at, tweenDur, EASE_IN_OUT));
    }
    return v;
  };

  let opacity = m.opacity;
  if (enter?.kind === "draw" || exit?.kind === "draw") opacity *= m.draw;
  const sw = theme.stroke.width;

  return (
    <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} width={CANVAS_W} height={CANVAS_H} style={{ position: "absolute", inset: 0, opacity }}>
      <line x1={left} y1={base} x2={left + el.w} y2={base} stroke={toneColor(theme, "ink")} strokeWidth={sw} strokeLinecap={theme.stroke.cap} />
      {el.bars.map((b, i) => {
        const g = progress(frame, start + i * stagger, growDur, EASE_OUT);
        const v = valueAt(i) * g;
        const hgt = Math.max(0, Math.min(plotH, (v / max) * plotH));
        const cx = left + slot * (i + 0.5);
        const color = toneColor(theme, b.tone, "accent");
        return (
          <g key={i}>
            {hgt > 0.5 && (
              <rect
                x={cx - barW / 2}
                y={base - hgt}
                width={barW}
                height={hgt}
                fill={withAlpha(color, 0.35)}
                stroke={color}
                strokeWidth={sw}
                strokeLinejoin={theme.stroke.join}
              />
            )}
            {g > 0.001 && (
              <text
                x={cx}
                y={base - hgt - pad}
                textAnchor="middle"
                fill={toneColor(theme, "ink")}
                style={{ fontFamily: fontFamily(theme, "body"), fontSize: labelSize, fontVariantNumeric: "tabular-nums", fontWeight: 700 }}
              >
                {v.toFixed(decimals)}
                {el.valueSuffix ?? ""}
              </text>
            )}
            <text
              x={cx}
              y={base + pad + labelSize * 0.85}
              textAnchor="middle"
              fill={toneColor(theme, "ink")}
              style={{ fontFamily: fontFamily(theme, "body"), fontSize: labelSize }}
            >
              {applyLabelCase(theme, b.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
