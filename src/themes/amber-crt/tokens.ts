import type { ThemeTokens } from "../types";

const vt323 = {
  family: "VT323",
  files: [{ path: "fonts/vt323/VT323-Regular.ttf", weight: "400" }],
  fallback: "Courier New, monospace",
};

export const amberCrt: ThemeTokens = {
  name: "amber-crt",
  palette: { background: "#120c05", ink: "#ffb84a", mutedInk: "#a8742a", accent: "#ffe08a", accent2: "#ff8a3d", good: "#9be15d", bad: "#ff5a3d" },
  type: {
    display: vt323,
    body: vt323,
    mono: vt323,
    scale: { title: 130, label: 48, caption: 72, footnote: 36 },
    labelCase: "upper",
    labelTracking: 0.08,
  },
  stroke: { width: 9, cap: "square", join: "miter", wobble: 0 },
  surface: { texture: "scanlines", vignette: 0.5 },
  caption: { box: "solid", activeWord: "#ffe08a", band: "bottom", boxColor: "rgba(0, 0, 0, 0.75)", textColor: "#ffb84a" },
  motion: { ease: "inOut", enterDur: 0.5, drawDur: 1.2, idleDrift: 0 },
  render: "pixel",
  tag: { radius: 0, borderWidth: 4, fill: "none" },
};
