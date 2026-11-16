// Stroke path in canvas coordinates; draws on via pathLength=1 + dashoffset. Wobble = hand-drawn jitter.
import React from "react";
import { CANVAS } from "../schema/scene";
import { toneColor } from "../themes/types";
import { useMotion } from "../timing/motion";
import { wobblePath } from "./shared";
import type { Primitive } from "./types";

export const DrawPathPrim: Primitive<"path"> = ({ el, theme, enter, exit, seed }) => {
  const m = useMotion(enter, exit);
  if (!m.visible) return null;
  const wobble = el.wobble ?? theme.stroke.wobble;
  const pts = el.points;
  const d = pts
    ? wobble > 0
      ? wobblePath(pts, wobble, seed)
      : `M${pts.map((p) => `${p[0]} ${p[1]}`).join(" L")}`
    : (el.d ?? "");
  const seedInt = Math.abs(Math.round(seed));
  const filterId = `wob-${seedInt}`;
  const filtered = !pts && wobble > 0;
  return (
    <svg
      viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
      width={CANVAS.width}
      height={CANVAS.height}
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: m.opacity, transform: `translateY(${m.translateY}px) scale(${m.scale})` }}
    >
      {filtered ? (
        <defs>
          <filter id={filterId} filterUnits="userSpaceOnUse" x={0} y={0} width={CANVAS.width} height={CANVAS.height}>
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={2} seed={seedInt % 1000} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={wobble * 4} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      ) : null}
      <path
        d={d}
        pathLength={1}
        fill="none"
        stroke={toneColor(theme, el.stroke, "ink")}
        strokeWidth={el.width ?? theme.stroke.width}
        strokeLinecap={theme.stroke.cap}
        strokeLinejoin={theme.stroke.join}
        strokeDasharray={1}
        strokeDashoffset={1 - m.draw}
        // Hide the zero-length round-cap dot before the draw starts.
        opacity={m.draw <= 0 ? 0 : 1}
        filter={filtered ? `url(#${filterId})` : undefined}
      />
    </svg>
  );
};
