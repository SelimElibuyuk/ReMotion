// Rounded card centred at (x, y). Slide enter (fade + 24 px rise) is handled by Positioned.
import React from "react";
import { toneColor } from "../themes/types";
import { useMotion } from "../timing/motion";
import { Positioned, withAlpha } from "./shared";
import type { Primitive } from "./types";

export const PanelPrim: Primitive<"panel"> = ({ el, theme, enter, exit }) => {
  const m = useMotion(enter, exit);
  if (!m.visible) return null;
  const color = el.tone ? toneColor(theme, el.tone) : theme.palette.mutedInk;
  return (
    <Positioned x={el.x} y={el.y} m={m} w={el.w} h={el.h}>
      <div
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          border: `${theme.stroke.width}px solid ${color}`,
          borderRadius: theme.tag.radius + 16,
          background: withAlpha(el.tone ? color : theme.palette.ink, 0.06),
        }}
      />
    </Positioned>
  );
};
