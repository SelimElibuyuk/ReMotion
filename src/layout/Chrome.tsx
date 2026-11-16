// Top title block (kicker + title), footnote above the caption band and a thin progress line.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "../schema/scene";
import { fontStack, type ThemeTokens } from "../themes/types";
import { EASE_OUT, progress } from "../timing/easing";
import { SAFE_RECT } from "./safeArea";

export const PROGRESS_Y = 1540;

export const Chrome: React.FC<{ theme: ThemeTokens; chrome: Scene["chrome"]; durationInFrames: number }> = ({ theme, chrome, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = progress(frame, 0, Math.max(1, Math.round(0.5 * fps)), EASE_OUT);
  const t = theme.type;
  const p = Math.min(1, Math.max(0, frame / Math.max(1, durationInFrames - 1)));
  const width = SAFE_RECT.right - SAFE_RECT.left;

  // Keep the title on one line (conservative 0.6 em/char estimate); below 76 px allow a balanced second line.
  const oneLine = width / (Math.max(1, chrome.title.length) * 0.6);
  const titleSize = Math.round(Math.min(t.scale.title, oneLine >= 76 ? oneLine : Math.max(76, oneLine * 2)));

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: SAFE_RECT.left,
          width,
          top: 232,
          textAlign: "center",
          opacity: fadeIn,
          transform: `translateY(${(1 - fadeIn) * 14}px)`,
        }}
      >
        {chrome.kicker ? (
          <div
            style={{
              fontFamily: fontStack(t.mono),
              fontSize: t.scale.label,
              fontWeight: 500,
              letterSpacing: `${t.labelTracking}em`,
              textTransform: t.labelCase === "upper" ? "uppercase" : "none",
              color: theme.palette.accent,
              marginBottom: 12,
              lineHeight: 1.1,
            }}
          >
            {chrome.kicker}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: fontStack(t.display),
            fontSize: titleSize,
            fontWeight: 700,
            lineHeight: 1.04,
            color: theme.palette.ink,
            textWrap: "balance",
          }}
        >
          {chrome.title}
        </div>
      </div>

      {chrome.footnote ? (
        <div
          style={{
            position: "absolute",
            left: SAFE_RECT.left,
            width,
            // Below the progress line, so it never collides with stage content or captions.
            top: PROGRESS_Y + 22,
            textAlign: "center",
            fontFamily: fontStack(t.mono),
            fontSize: t.scale.footnote,
            color: theme.palette.mutedInk,
            lineHeight: 1.2,
          }}
        >
          {chrome.footnote}
        </div>
      ) : null}

      <div style={{ position: "absolute", left: SAFE_RECT.left, width, top: PROGRESS_Y, height: 6, background: theme.palette.mutedInk, opacity: 0.35, borderRadius: 3 }} />
      <div style={{ position: "absolute", left: SAFE_RECT.left, width: width * p, top: PROGRESS_Y, height: 6, background: theme.palette.accent, borderRadius: 3 }} />
    </AbsoluteFill>
  );
};
