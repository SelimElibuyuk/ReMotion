import type { ThemeTokens } from "../types";

export const blueprint: ThemeTokens = {
  name: "blueprint",
  palette: { background: "#0f2a4a", ink: "#eaf6ff", mutedInk: "#8fb4d4", accent: "#6fe3ff", accent2: "#ffd166", good: "#7ef0b0", bad: "#ff7a7a" },
  type: {
    display: {
      family: "IBM Plex Sans Condensed",
      files: [
        { path: "fonts/ibm-plex-sans-condensed/IBMPlexSansCondensed-SemiBold.ttf", weight: "600" },
        { path: "fonts/ibm-plex-sans-condensed/IBMPlexSansCondensed-Bold.ttf", weight: "700" },
      ],
      fallback: "Arial Narrow, sans-serif",
    },
    body: {
      family: "IBM Plex Sans",
      files: [{ path: "fonts/ibm-plex-sans/IBMPlexSans-Variable.ttf", weight: "100 700" }],
      fallback: "Arial, sans-serif",
    },
    mono: {
      family: "IBM Plex Mono",
      files: [
        { path: "fonts/ibm-plex-mono/IBMPlexMono-Regular.ttf", weight: "400" },
        { path: "fonts/ibm-plex-mono/IBMPlexMono-Medium.ttf", weight: "500" },
        { path: "fonts/ibm-plex-mono/IBMPlexMono-Bold.ttf", weight: "700" },
      ],
      fallback: "Consolas, monospace",
    },
    scale: { title: 120, label: 44, caption: 68, footnote: 32 },
    labelCase: "upper",
    labelTracking: 0.14,
  },
  stroke: { width: 9, cap: "round", join: "round", wobble: 0 },
  surface: { texture: "grid", vignette: 0.35 },
  caption: { box: "solid", activeWord: "#6fe3ff", band: "bottom", boxColor: "rgba(6, 20, 38, 0.82)", textColor: "#eaf6ff" },
  motion: { ease: "out", enterDur: 0.5, drawDur: 1.2, idleDrift: 0 },
  render: "vector",
  tag: { radius: 4, borderWidth: 4, fill: "none" },
};
