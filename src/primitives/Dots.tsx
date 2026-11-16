// Unit chart: dots fill in reading order (empty outline -> filled); the first `highlight` dots use the tone colour.
import React from "react";
import { useCurrentFrame } from "remotion";
import { toneColor } from "../themes/types";
import { EASE_OUT, progress } from "../timing/easing";
import { useMotion } from "../timing/motion";
import { applyLabelCase, CANVAS_H, CANVAS_W, fontFamily, textSizePx } from "./shared";
import type { Primitive } from "./types";

export const DotsPrim: Primitive<"dots"> = ({ el, theme, enter, exit, fps }) => {
  const m = useMotion(enter, exit);
  const frame = useCurrentFrame();
  if (!m.visible) return null;

  const cols = Math.min(el.perRow, el.count);
  const spacing = el.w / cols;
  const rows = Math.ceil(el.count / el.perRow);
  const r = spacing * 0.34;
  const left = el.x - el.w / 2;
  const top = el.y - (rows * spacing) / 2;
  const size = textSizePx(theme, "label");
  const hi = el.highlight ?? el.count;
  const hiColor = toneColor(theme, el.tone, "accent");
  const loColor = toneColor(theme, "mutedInk");
  const start = enter ? enter.start + enter.dur : 0;
  const total = Math.round(1.2 * fps);
  const each = Math.max(3, Math.round(0.2 * fps));
  let opacity = m.opacity;
  if (enter?.kind === "draw" || exit?.kind === "draw") opacity *= m.draw;
  const sw = Math.max(2, theme.stroke.width * 0.6);

  const dots: React.ReactNode[] = [];
  for (let i = 0; i < el.count; i++) {
    const col = i % el.perRow;
    const row = Math.floor(i / el.perRow);
    const color = i < hi ? hiColor : loColor;
    const s = start + (i / Math.max(1, el.count)) * total;
    const fill = progress(frame, s, each, EASE_OUT);
    const cx = left + spacing * (col + 0.5);
    const cy = top + spacing * (row + 0.5);
    dots.push(<circle key={i} cx={cx} cy={cy} r={r} fill={color} fillOpacity={fill} stroke={color} strokeWidth={sw} />);
  }

  return (
    <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} width={CANVAS_W} height={CANVAS_H} style={{ position: "absolute", inset: 0, opacity }}>
      {dots}
      {el.label ? (
        <text
          x={el.x}
          y={top + rows * spacing + size + 24}
          textAnchor="middle"
          fill={toneColor(theme, "ink")}
          style={{ fontFamily: fontFamily(theme, "body"), fontSize: size }}
        >
          {applyLabelCase(theme, el.label)}
        </text>
      ) : null}
    </svg>
  );
};
