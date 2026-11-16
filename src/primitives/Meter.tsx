// Meter: 180 degree gauge with sweeping needle, or a horizontal progress bar.
import React from "react";
import { useCurrentFrame } from "remotion";
import { toneColor } from "../themes/types";
import { EASE_OUT, progress } from "../timing/easing";
import { useMotion } from "../timing/motion";
import { applyLabelCase, CANVAS_H, CANVAS_W, fontFamily, textSizePx, withAlpha } from "./shared";
import type { Primitive } from "./types";

const f2 = (n: number) => Math.round(n * 100) / 100;

export const MeterPrim: Primitive<"meter"> = ({ el, theme, enter, exit, fps }) => {
  const m = useMotion(enter, exit);
  const frame = useCurrentFrame();
  if (!m.visible) return null;

  const min = el.min ?? 0;
  const max = el.max ?? 100;
  const range = max - min || 1;
  const target = Math.max(0, Math.min(1, (el.value - min) / range));
  const start = enter ? enter.start + enter.dur : 0;
  const t = progress(frame, start, Math.round(1.0 * fps), EASE_OUT);
  const frac = target * t;
  const shown = min + (el.value - min) * t;
  const decimals = Number.isInteger(el.value) && Number.isInteger(min) ? 0 : 1;

  const color = toneColor(theme, el.tone, "accent");
  const ink = toneColor(theme, "ink");
  const muted = toneColor(theme, "mutedInk");
  const sw = theme.stroke.width;
  const size = theme.type.scale.label;
  const big = theme.type.scale.title;
  let opacity = m.opacity;
  if (enter?.kind === "draw" || exit?.kind === "draw") opacity *= m.draw;

  const svgStyle: React.CSSProperties = { position: "absolute", inset: 0, opacity };
  const viewBox = `0 0 ${CANVAS_W} ${CANVAS_H}`;
  const readout = (x: number, y: number) => (
    <text x={x} y={y} textAnchor="middle" fill={ink} style={{ fontFamily: fontFamily(theme, "body"), fontSize: big, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
      {shown.toFixed(decimals)}
    </text>
  );

  if (el.kind === "bar") {
    const barH = 64;
    const left = el.x - el.w / 2;
    const fillW = el.w * frac;
    return (
      <svg viewBox={viewBox} width={CANVAS_W} height={CANVAS_H} style={svgStyle}>
        {readout(el.x, el.y - barH / 2 - 24)}
        <rect x={left} y={el.y - barH / 2} width={el.w} height={barH} rx={barH / 2} fill="none" stroke={muted} strokeWidth={sw} />
        {fillW > barH * 0.3 && (
          <rect x={left} y={el.y - barH / 2} width={fillW} height={barH} rx={barH / 2} fill={withAlpha(color, 0.35)} stroke={color} strokeWidth={sw} />
        )}
        {el.label ? (
          <text x={el.x} y={el.y + barH / 2 + size + 16} textAnchor="middle" fill={ink} style={{ fontFamily: fontFamily(theme, "body"), fontSize: size }}>
            {applyLabelCase(theme, el.label)}
          </text>
        ) : null}
      </svg>
    );
  }

  const r = el.w / 2 - 20;
  const cx = el.x;
  const cy = el.y + r / 2;
  const ang = Math.PI * (1 - frac);
  const needleLen = r * 0.82;
  const nx = cx + Math.cos(ang) * needleLen;
  const ny = cy - Math.sin(ang) * needleLen;
  const arc = `M${f2(cx - r)} ${f2(cy)} A${f2(r)} ${f2(r)} 0 0 1 ${f2(cx + r)} ${f2(cy)}`;
  return (
    <svg viewBox={viewBox} width={CANVAS_W} height={CANVAS_H} style={svgStyle}>
      <path d={arc} fill="none" stroke={muted} strokeWidth={sw * 2.5} strokeLinecap={theme.stroke.cap} />
      {frac > 0.002 && (
        <path d={arc} fill="none" stroke={color} strokeWidth={sw * 2.5} strokeLinecap={theme.stroke.cap} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - frac} />
      )}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={ink} strokeWidth={sw * 1.5} strokeLinecap={theme.stroke.cap} />
      <circle cx={cx} cy={cy} r={sw * 3} fill={ink} />
      {readout(cx, cy + size + 40)}
      {el.label ? (
        <text x={cx} y={cy + size + 40 + size + 20} textAnchor="middle" fill={ink} style={{ fontFamily: fontFamily(theme, "body"), fontSize: size }}>
          {applyLabelCase(theme, el.label)}
        </text>
      ) : null}
    </svg>
  );
};
