import type { ThemeTokens } from "../types";

const baskerville = {
  family: "Libre Baskerville",
  files: [{ path: "fonts/libre-baskerville/LibreBaskerville-Variable.ttf", weight: "400 700" }],
  fallback: "Georgia, serif",
};

export const archive: ThemeTokens = {
  name: "archive",
  palette: { background: "#f1e6cc", ink: "#33200f", mutedInk: "#7a6347", accent: "#b3261e", accent2: "#2f5d73", good: "#3f6b3a", bad: "#b3261e" },
  type: {
    display: baskerville,
    body: baskerville,
    mono: {
      family: "Courier Prime",
      files: [
        { path: "fonts/courier-prime/CourierPrime-Regular.ttf", weight: "400" },
        { path: "fonts/courier-prime/CourierPrime-Bold.ttf", weight: "700" },
      ],
      fallback: "Courier New, monospace",
    },
    scale: { title: 112, label: 44, caption: 66, footnote: 32 },
    labelCase: "upper",
    labelTracking: 0.1,
  },
  stroke: { width: 9, cap: "round", join: "round", wobble: 0.5 },
  surface: { texture: "paper", vignette: 0.28 },
  caption: { box: "underline", activeWord: "#b3261e", band: "bottom", boxColor: "#33200f", textColor: "#33200f" },
  motion: { ease: "out", enterDur: 0.55, drawDur: 1.2, idleDrift: 0 },
  render: "vector",
  tag: { radius: 6, borderWidth: 5, fill: "tint" },
};
