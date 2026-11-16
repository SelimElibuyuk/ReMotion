// Headline / label text. enter.kind "type" reveals word by word; other kinds go through the wrapper.
import React from "react";
import { useCurrentFrame } from "remotion";
import { toneColor } from "../themes/types";
import { progress } from "../timing/easing";
import { useMotion } from "../timing/motion";
import { Positioned, fontFamily, textSizePx } from "./shared";
import type { Primitive } from "./types";

const WORD_FADE_FRAMES = 6;
const WORD_RISE_PX = 8;

export const TextTypePrim: Primitive<"text"> = ({ el, theme, enter, exit, cue }) => {
  const frame = useCurrentFrame();
  const m = useMotion(enter, exit);
  if (!m.visible) return null;

  const size = el.size ?? "label";
  const role = el.font ?? (size === "title" ? "display" : "body");
  const align = el.align ?? "center";
  const words = el.text.split(/\s+/).filter(Boolean);
  const typing = enter?.kind === "type";

  const wordStyle = (k: number): React.CSSProperties => {
    if (!typing || !enter) return {};
    const wc = el.wordCues?.[k];
    const at = wc !== undefined ? cue(wc) : enter.start + (k / Math.max(1, words.length)) * enter.dur;
    const t = progress(frame, at, WORD_FADE_FRAMES);
    return { opacity: t, transform: `translateY(${(1 - t) * WORD_RISE_PX}px)` };
  };

  // For "type" the wrapper keeps opacity 1 (motionState leaves it alone); each word fades on its own.
  return (
    <Positioned x={el.x} y={el.y} m={m} w={el.maxWidth ?? 900}>
      <div
        style={{
          textAlign: align,
          fontFamily: fontFamily(theme, role),
          fontSize: textSizePx(theme, size, "label"),
          fontWeight: el.weight,
          lineHeight: 1.15,
          color: toneColor(theme, el.tone, "ink"),
        }}
      >
        {words.map((w, k) => (
          <React.Fragment key={k}>
            <span style={{ display: "inline-block", ...wordStyle(k) }}>{w}</span>
            {k < words.length - 1 ? " " : null}
          </React.Fragment>
        ))}
      </div>
    </Positioned>
  );
};
