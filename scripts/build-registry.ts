// Scans assets/svg/** (and assets/icons/** if present) and writes src/assets/registry.generated.ts.
// Run: npm run registry
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIRS = ["assets/svg", "assets/icons"].map((d) => join(ROOT, d));
const OUT = join(ROOT, "src/assets/registry.generated.ts");

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

function minifySvg(src: string): string {
  return src
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
}

function main(): void {
  const entries = new Map<string, { svg: string; file: string }>();
  let failed = false;
  for (const file of SOURCE_DIRS.flatMap(listSvgs)) {
    const id = basename(file, ".svg");
    const prev = entries.get(id);
    if (prev) {
      console.error(`Duplicate asset id "${id}": ${relative(ROOT, prev.file)} and ${relative(ROOT, file)}`);
      failed = true;
      continue;
    }
    entries.set(id, { svg: minifySvg(readFileSync(file, "utf8")), file });
  }
  if (failed) process.exit(1);

  const ids = [...entries.keys()].sort();
  const body = ids.map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(entries.get(id)!.svg)},`).join("\n");
  const text = `// GENERATED — do not edit. Produced by scripts/build-registry.ts; run \`npm run registry\`.\nexport const ASSETS = {\n${body}\n} as const satisfies Record<string, string>;\n`;
  writeFileSync(OUT, text, "utf8");
  console.log(`registry: ${ids.length} assets -> ${relative(ROOT, OUT)} (${ids.join(", ")})`);
}

main();
