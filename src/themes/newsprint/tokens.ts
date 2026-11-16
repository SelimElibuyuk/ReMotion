import type { ThemeTokens } from "../types";

export const newsprint: ThemeTokens = {
  name: "newsprint",
  palette: { background: "#efeadd", ink: "#1b1b1b", mutedInk: "#6b665a", accent: "#c4311f", accent2: "#1f4e8c", good: "#2e7d4f", bad: "#c4311f" },
  type: {
    display: {
      family: "Playfair Display",
      files: [{ path: "fonts/playfair-display/PlayfairDisplay-Variable.ttf", weight: "400 900" }],
      fallback: "Georgia, serif",
    },
    body: {
      family: "Source Serif 4",
      files: [{ path: "fonts/source-serif-4/SourceSerif4-Variable.ttf", weight: "200 900" }],
      fallback: "Georgia, serif",
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
    scale: { title: 120, label: 42, caption: 68, footnote: 32 },
    labelCase: "upper",
    labelTracking: 0.12,
  },
  stroke: { width: 9, cap: "butt", join: "miter", wobble: 0.15 },
  surface: { texture: "halftone", vignette: 0.2 },
  caption: { box: "solid", activeWord: "#ffd84a", band: "bottom", boxColor: "#1b1b1b", textColor: "#f7f3e8" },
  motion: { ease: "out", enterDur: 0.55, drawDur: 1.2, idleDrift: 0 },
  render: "vector",
  tag: { radius: 0, borderWidth: 4, fill: "solid" },
};
