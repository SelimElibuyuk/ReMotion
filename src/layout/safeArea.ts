import { CANVAS } from "../schema/scene";

/** Shorts UI keeps the top 220 px and bottom 380 px clear of key content. */
export const SAFE = { top: 220, bottom: 380, side: 60 } as const;
export const SAFE_RECT = {
  left: SAFE.side,
  right: CANVAS.width - SAFE.side,
  top: SAFE.top,
  bottom: CANVAS.height - SAFE.bottom,
} as const;

/** Free area for stage content between the title block and the caption band (warning outside). */
export const CONTENT_BAND = { top: 440, bottom: 1300 } as const;

/** Product rules enforced by validation (seconds unless noted). */
export const RULES = {
  minStagger: 0.15,
  enterDur: [0.3, 0.8] as const,
  maxDrawDur: 1.5,
  maxCrossfade: 0.4,
  maxPushPerSecond: 0.01,
  minCaptionPx: 64,
  minLabelPx: 40,
} as const;
