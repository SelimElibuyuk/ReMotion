// Loads a theme's vendored fonts (public/fonts/**) before the first frame. Idempotent per family + weight.
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import type { ThemeTokens } from "./types";

const loaded = new Set<string>();

export async function loadThemeFonts(theme: ThemeTokens): Promise<void> {
  const jobs: Promise<void>[] = [];
  for (const spec of [theme.type.display, theme.type.body, theme.type.mono]) {
    for (const f of spec.files) {
      const key = `${spec.family}|${f.weight ?? "400"}|${f.style ?? "normal"}`;
      if (loaded.has(key)) continue;
      loaded.add(key);
      jobs.push(
        loadFont({ family: spec.family, url: staticFile(f.path), weight: f.weight, style: f.style }).catch((e) => {
          loaded.delete(key);
          console.warn(`Font "${spec.family}" (${f.path}) failed to load`, e);
        }),
      );
    }
  }
  await Promise.all(jobs);
}
