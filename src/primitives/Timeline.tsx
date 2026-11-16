// Horizontal time axis with ticks, event dots/labels and span brackets.
import React from "react";
import { useCurrentFrame } from "remotion";
import { toneColor } from "../themes/types";
import { EASE_OUT, popScale, progress } from "../timing/easing";
import { useMotion } from "../timing/motion";
import { applyLabelCase, CANVAS_H, CANVAS_W, fontFamily, textSizePx } from "./shared";
import type { Primitive } from "./types";

function niceStep(span: number): number {
  const raw = span / 6;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const k of [1, 2, 5, 10]) if (k * mag >= raw) return k * mag;
  return 10 * mag;
}

export const TimelinePrim: Primitive<"timeline"> = ({ el, theme, enter, exit, cue, fps }) => {
  const m = useMotion(enter, exit);
  const frame = useCurrentFrame();
  if (!m.visible) return null;

  const [ra, rb] = el.range;
  const span = rb - ra || 1;
  const left = el.x - el.w / 2;
  const px = (t: number) => left + ((t - ra) / span) * el.w;
  const ay = el.y;
  const sw = theme.stroke.width;
  const size = textSizePx(theme, "label");
  const ink = toneColor(theme, "ink");
  const muted = toneColor(theme, "mutedInk");

  const axisStart = enter?.start ?? 0;
  const axisDur = Math.round(0.8 * fps);
  const axisEnd = axisStart + axisDur;
  const axisP = progress(frame, axisStart, axisDur, EASE_OUT);
  const step = Math.round(0.2 * fps);
  const popDur = Math.round(0.35 * fps);

  const hasSpans = (el.spans?.length ?? 0) > 0;
  const stemAbove = hasSpans ? 190 : 80;
  const stemBelow = 80;

  const evStart = el.events.map((e, i) => (e.at !== undefined ? cue(e.at) : axisEnd + (i + 1) * step));
  const lastEv = evStart.length ? Math.max(...evStart) + popDur : axisEnd;

  let opacity = m.opacity;
  if (enter?.kind === "draw" || exit?.kind === "draw") opacity *= m.draw;

  const ticks: number[] = [];
  const ts = niceStep(Math.abs(span));
  for (let t = Math.ceil(ra / ts) * ts; t <= rb + 1e-9; t += ts) ticks.push(t);

  const anchorFor = (x: number): "start" | "middle" | "end" => (x < left + 140 ? "start" : x > left + el.w - 140 ? "end" : "middle");

  return (
    <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} width={CANVAS_W} height={CANVAS_H} style={{ position: "absolute", inset: 0, opacity }}>
      {axisP > 0.001 && (
        <line
          x1={left}
          y1={ay}
          x2={left + el.w}
          y2={ay}
          stroke={ink}
          strokeWidth={sw}
          strokeLinecap={theme.stroke.cap}
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - axisP}
        />
      )}
      {ticks.map((t) => {
        const f = (px(t) - left) / el.w;
        if (axisP < f) return null;
        return <line key={t} x1={px(t)} y1={ay - 14} x2={px(t)} y2={ay + 14} stroke={muted} strokeWidth={sw} strokeLinecap={theme.stroke.cap} />;
      })}
      {el.events.map((e, i) => {
        const s = evStart[i] ?? axisEnd;
        if (frame < s) return null;
        const p = progress(frame, s, popDur, (u) => u);
        const above = i % 2 === 0;
        const color = toneColor(theme, e.tone, "accent");
        const x = px(e.t);
        const stem = above ? stemAbove : stemBelow;
        const dir = above ? -1 : 1;
        const textFade = progress(frame, s, popDur, EASE_OUT);
        const yearY = above ? ay - stem - size * 1.2 - 12 : ay + stem + size + 12;
        const labelY = above ? ay - stem - 12 : ay + stem + size * 2.2 + 12;
        return (
          <g key={i}>
            <line x1={x} y1={ay} x2={x} y2={ay + dir * stem} stroke={color} strokeWidth={sw} strokeLinecap={theme.stroke.cap} opacity={textFade} />
            <g transform={`translate(${x} ${ay}) scale(${popScale(p)})`} opacity={Math.min(1, p * 3)}>
              <circle r={14} fill={color} stroke={color} strokeWidth={sw} />
            </g>
            <g opacity={textFade}>
              <text x={x} y={yearY} textAnchor={anchorFor(x)} fill={color} style={{ fontFamily: fontFamily(theme, "mono"), fontSize: size, fontWeight: 700 }}>
                {e.t}
              </text>
              <text x={x} y={labelY} textAnchor={anchorFor(x)} fill={ink} style={{ fontFamily: fontFamily(theme, "body"), fontSize: size }}>
                {applyLabelCase(theme, e.label)}
              </text>
            </g>
          </g>
        );
      })}
      {(el.spans ?? []).map((sp, k) => {
        const s = sp.at !== undefined ? cue(sp.at) : lastEv + (k + 1) * step;
        const dur = Math.round(0.4 * fps);
        const p = progress(frame, s, dur, EASE_OUT);
        if (p <= 0.001) return null;
        const color = toneColor(theme, sp.tone, "accent2");
        const x0 = px(sp.from);
        const x1 = px(sp.to);
        const by = ay - 40;
        const labelFade = progress(frame, s + dur, Math.round(0.3 * fps), EASE_OUT);
        return (
          <g key={k}>
            <path
              d={`M${x0} ${by + 16} L${x0} ${by} L${x1} ${by} L${x1} ${by + 16}`}
              fill="none"
              stroke={color}
              strokeWidth={sw}
              strokeLinecap={theme.stroke.cap}
              strokeLinejoin={theme.stroke.join}
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1 - p}
            />
            <text
              x={(x0 + x1) / 2}
              y={by - 14}
              textAnchor="middle"
              fill={color}
              opacity={labelFade}
              style={{ fontFamily: fontFamily(theme, "body"), fontSize: size }}
            >
              {applyLabelCase(theme, sp.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
