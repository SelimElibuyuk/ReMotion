import type { ThemeTokens } from "../types";

const outfit = {
  family: "Outfit",
  files: [{ path: "fonts/outfit/Outfit-Variable.ttf", weight: "100 900" }],
  fallback: "Arial, sans-serif",
};

export const transit: ThemeTokens = {
  name: "transit",
  palette: { background: "#fbfbf8", ink: "#16202e", mutedInk: "#6c7685", accent: "#e8412c", accent2: "#1c6fd6", good: "#18a05e", bad: "#e8412c" },
  type: {
    display: outfit,
    body: outfit,
    mono: {
      family: "IBM Plex Mono",
      files: [
        { path: "fonts/ibm-plex-mono/IBMPlexMono-Regular.ttf", weight: "400" },
        { path: "fonts/ibm-plex-mono/IBMPlexMono-Medium.ttf", weight: "500" },
        { path: "fonts/ibm-plex-mono/IBMPlexMono-Bold.ttf", weight: "700" },
      ],
      fallback: "Consolas, monospace",
    },
    scale: { title: 120, label: 42, caption: 68, footnote: 32 },
    labelCase: "upper",
    labelTracking: 0.1,
  },
  stroke: { width: 11, cap: "round", join: "round", wobble: 0 },
  surface: { texture: "none", vignette: 0.08 },
  caption: { box: "none", activeWord: "#e8412c", band: "bottom", boxColor: "#16202e", textColor: "#16202e" },
  motion: { ease: "out", enterDur: 0.5, drawDur: 1.2, idleDrift: 0 },
  render: "vector",
  tag: { radius: 40, borderWidth: 5, fill: "tint" },
};
