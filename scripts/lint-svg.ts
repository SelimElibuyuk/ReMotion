// Lints assets/svg/** and assets/icons/**: one stroke colour, no <image>/<text>/data: URIs, viewBox present, path count limit.
// Run: npm run lint:svg
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MAX_PATHS = 150;

function listSvgs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listSvgs(p));
    else if (name.toLowerCase().endsWith(".svg")) out.push(p);
  }
  return out;
}
const SHAPE_RE = /<(path|circle|ellipse|rect|line|polyline|polygon)\b/g;

export function lintSvg(src: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!/<svg\b[^>]*\bviewBox\s*=/.test(src)) errors.push("missing viewBox");
  if (/<image\b/i.test(src)) errors.push("contains <image>");
  if (/<text\b/i.test(src)) errors.push("contains <text>");
  if (/data:/i.test(src)) errors.push("contains a data: URI");
  const shapes = (src.match(SHAPE_RE) ?? []).length;
  if (shapes > MAX_PATHS) errors.push(`${shapes} shapes (max ${MAX_PATHS})`);
  const colours = new Set<string>();
  for (const m of src.matchAll(/\bstroke\s*=\s*"([^"]+)"/g)) if (m[1] !== "none") colours.add(m[1]!.toLowerCase());
  for (const m of src.matchAll(/stroke\s*:\s*([^;"]+)/g)) if (m[1]!.trim() !== "none") colours.add(m[1]!.trim().toLowerCase());
  if (colours.size === 0) errors.push("no stroke colour set");
  if (colours.size > 1) errors.push(`multiple stroke colours: ${[...colours].join(", ")}`);
  const fills = new Set<string>();
  for (const m of src.matchAll(/\bfill\s*=\s*"([^"]+)"/g)) if (m[1] !== "none") fills.add(m[1]!.toLowerCase());
  for (const f of fills) if (!colours.has(f)) warnings.push(`fill colour ${f} differs from stroke colour`);
  return { errors, warnings };
}

function main(): void {
  const files = ["assets/svg", "assets/icons"].flatMap((d) => listSvgs(join(ROOT, d)));
  let bad = 0;
  for (const f of files) {
    const { errors, warnings } = lintSvg(readFileSync(f, "utf8"));
    const rel = relative(ROOT, f);
    for (const e of errors) console.error(`ERROR ${rel}: ${e}`);
    for (const w of warnings) console.warn(`warn  ${rel}: ${w}`);
    if (errors.length) bad++;
  }
  console.log(`lint:svg: ${files.length} files, ${bad} with errors`);
  if (bad) process.exit(1);
}

main();
