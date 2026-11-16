// Strike-through, cross-out or tick drawn over another element's box.
import React from "react";
import { toneColor } from "../themes/types";
import { useMotion } from "../timing/motion";
import { CANVAS_H, CANVAS_W, wobblePath } from "./shared";
import type { Primitive } from "./types";

const seg = (p: number, a: number, b: number) => Math.max(0, Math.min(1, (p - a) / (b - a)));

export const StrikeCheckPrim: Primitive<"strike"> = ({ el, theme, enter, exit, targetBox, seed }) => {
  const m = useMotion(enter, exit);
  if (!m.visible || !targetBox) return null;

  const { x, y, w, h } = targetBox;
  const color = toneColor(theme, el.tone, el.kind === "tick" ? "good" : "bad");
  const sw = theme.stroke.width * 1.6;
  const wob = theme.stroke.wobble;
  const pad = 16;

  const paths: { d: string; p: number }[] = [];
  if (el.kind === "strike") {
    const tilt = Math.tan(((6 + (seed % 3)) * Math.PI) / 180) * (w / 2 + pad);
    const pts: [number, number][] = [
      [x - w / 2 - pad, y + tilt],
      [x + w / 2 + pad, y - tilt],
    ];
    paths.push({ d: wobblePath(pts, wob, seed), p: m.draw });
  } else if (el.kind === "cross") {
    const l = x - w / 2 - pad;
    const r = x + w / 2 + pad;
    const t = y - h / 2 - pad;
    const b = y + h / 2 + pad;
    paths.push({ d: wobblePath([[l, t], [r, b]], wob, seed), p: seg(m.draw, 0, 0.5) });
    paths.push({ d: wobblePath([[r, t], [l, b]], wob, seed + 1), p: seg(m.draw, 0.5, 1) });
  } else {
    const s = Math.max(70, Math.min(140, h));
    const cx = x + w / 2 + s * 0.7;
    const pts: [number, number][] = [
      [cx - s * 0.5, y + s * 0.02],
      [cx - s * 0.15, y + s * 0.4],
      [cx + s * 0.55, y - s * 0.45],
    ];
    paths.push({ d: wobblePath(pts, wob * 0.5, seed), p: m.draw });
  }

  return (
    <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} width={CANVAS_W} height={CANVAS_H} style={{ position: "absolute", inset: 0, opacity: m.opacity }}>
      {paths.map((pp, i) =>
        pp.p > 0.001 ? (
          <path
            key={i}
            d={pp.d}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap={theme.stroke.cap}
            strokeLinejoin={theme.stroke.join}
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - pp.p}
          />
        ) : null,
      )}
    </svg>
  );
};
