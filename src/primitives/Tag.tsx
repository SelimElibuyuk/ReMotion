// Boxed label (mono). Fill/border/radius come from theme.tag; typical enter is "pop".
import React from "react";
import { toneColor } from "../themes/types";
import { useMotion } from "../timing/motion";
import { Positioned, applyLabelCase, fontFamily, textSizePx, withAlpha } from "./shared";
import type { Primitive } from "./types";

export const TagPrim: Primitive<"tag"> = ({ el, theme, enter, exit }) => {
  const m = useMotion(enter, exit);
  if (!m.visible) return null;
  const color = toneColor(theme, el.tone, "accent");
  const { fill, borderWidth, radius } = theme.tag;
  const solid = fill === "solid";
  const background = solid ? color : fill === "tint" ? withAlpha(color, 0.15) : "transparent";
  return (
    <Positioned x={el.x} y={el.y} m={m}>
      <div
        style={{
          boxSizing: "border-box",
          whiteSpace: "nowrap",
          padding: "0.45em 0.8em",
          fontFamily: fontFamily(theme, "mono"),
          fontSize: textSizePx(theme, el.size, "label"),
          lineHeight: 1.1,
          letterSpacing: `${theme.type.labelTracking}em`,
          color: solid ? theme.palette.background : color,
          background,
          border: `${borderWidth}px solid ${color}`,
          borderRadius: radius,
        }}
      >
        {applyLabelCase(theme, el.text)}
      </div>
    </Positioned>
  );
};
