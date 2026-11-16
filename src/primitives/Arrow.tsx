// Arrow / callout: shaft draws first (80 % of draw progress), open arrowhead last (20 %), then the label fades in.
import React from "react";
import { useCurrentFrame } from "remotion";
import { toneColor } from "../themes/types";
import { EASE_OUT, progress } from "../timing/easing";
import { useMotion } from "../timing/motion";
import { applyLabelCase, CANVAS_H, CANVAS_W, fontFamily, textSizePx } from "./shared";
import type { Primitive } from "./types";

const f2 = (n: number) => Math.round(n * 100) / 100;

export const ArrowPrim: Primitive<"arrow"> = ({ el, theme, enter, exit, fps }) => {
  const m = useMotion(enter, exit);
  const frame = useCurrentFrame();
  if (!m.visible) return null;

  const color = toneColor(theme, el.tone, "ink");
  const [x0, y0] = el.from;
  const [x1, y1] = el.to;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;
  const ux = dx / len;
  const uy = dy / len;
  // Slight curve: control point pushed perpendicular to the shaft.
  const bend = Math.min(60, len * 0.08);
  const cx = (x0 + x1) / 2 - uy * bend;
  const cy = (y0 + y1) / 2 + ux * bend;
  // Tangent at the end of a quadratic curve points from control to end.
  const tx0 = x1 - cx;
  const ty0 = y1 - cy;
  const tl = Math.hypot(tx0, ty0) || 1;
  const tx = tx0 / tl;
  const ty = ty0 / tl;
  const headLen = Math.min(48, len * 0.35);
  const spread = (28 * Math.PI) / 180;
  const wing = (sign: number): [number, number] => {
    const c = Math.cos(spread * sign);
    const s = Math.sin(spread * sign);
    return [x1 - (tx * c - ty * s) * headLen, y1 - (tx * s + ty * c) * headLen];
  };
  const [ax, ay] = wing(1);
  const [bx, by] = wing(-1);

  const shaftP = Math.min(1, m.draw / 0.8);
  const headP = Math.max(0, (m.draw - 0.8) / 0.2);
  const sw = theme.stroke.width;
  const dash = (p: number) => ({ pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - p });

  const labelStart = enter ? enter.start + enter.dur : 0;
  let labelOpacity = progress(frame, labelStart, Math.round(0.3 * fps), EASE_OUT);
  if (exit && frame >= exit.start) labelOpacity *= m.draw;

  const size = textSizePx(theme, "label");
  const off = size * 0.9;
  const lx = x0 - ux * off;
  const ly = y0 - uy * off + size * 0.35;
  const anchor = ux > 0.4 ? "end" : ux < -0.4 ? "start" : "middle";

  return (
    <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} width={CANVAS_W} height={CANVAS_H} style={{ position: "absolute", inset: 0, opacity: m.opacity }}>
      {shaftP > 0.001 && (
        <path
          d={`M${f2(x0)} ${f2(y0)} Q${f2(cx)} ${f2(cy)} ${f2(x1)} ${f2(y1)}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap={theme.stroke.cap}
          strokeLinejoin={theme.stroke.join}
          {...dash(shaftP)}
        />
      )}
      {headP > 0.001 && (
        <path
          d={`M${f2(ax)} ${f2(ay)} L${f2(x1)} ${f2(y1)} L${f2(bx)} ${f2(by)}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap={theme.stroke.cap}
          strokeLinejoin={theme.stroke.join}
          {...dash(headP)}
        />
      )}
      {el.text ? (
        <text
          x={lx}
          y={ly}
          textAnchor={anchor}
          fill={color}
          opacity={labelOpacity}
          style={{ fontFamily: fontFamily(theme, "body"), fontSize: size }}
        >
          {applyLabelCase(theme, el.text)}
        </text>
      ) : null}
    </svg>
  );
};
