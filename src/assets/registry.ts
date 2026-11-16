// Asset id -> raw SVG markup. The generated file is produced by `npm run registry` from assets/svg/**.
// SVGs are inlined (not <img>) so themes can recolour strokes and fills at render time.
import { ASSETS } from "./registry.generated";

export type AssetId = keyof typeof ASSETS;
export const ASSET_IDS = Object.keys(ASSETS) as AssetId[];

export function getAsset(id: string): string {
  const svg = (ASSETS as Record<string, string>)[id];
  if (!svg) throw new Error(`Unknown asset "${id}". Known: ${ASSET_IDS.join(", ")}. Run "npm run registry" after adding SVGs.`);
  return svg;
}

export function hasAsset(id: string): boolean {
  return id in ASSETS;
}
