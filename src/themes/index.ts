import type { ThemeName } from "../schema/scene";
import { amberCrt } from "./amber-crt/tokens";
import { archive } from "./archive/tokens";
import { blueprint } from "./blueprint/tokens";
import { newsprint } from "./newsprint/tokens";
import { transit } from "./transit/tokens";
import type { ThemeTokens } from "./types";

export const THEMES: Record<ThemeName, ThemeTokens> = {
  blueprint,
  archive,
  "amber-crt": amberCrt,
  newsprint,
  transit,
};
