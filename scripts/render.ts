// CLI: npm run video -- <videoFolder> [--preview] [--frames a-b] [--stills] [--skip-audio] [--theme <name>]
// validate -> (tts, align) -> stage media -> Remotion render -> loudnorm -> export/<id>_vN.mp4
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ThemeNameSchema, SceneSchema, type Scene, type Word } from "../src/schema/scene";
import { validateAll } from "../src/schema/validate";
import { cueToFrame, totalDurationInFrames } from "../src/timing/cues";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(REPO, "public");
const ENTRY = path.join(REPO, "src", "index.ts");
const TARGET_LUFS = -14;

interface Args {
  folder: string;
  preview: boolean;
  frames: [number, number] | null;
  stills: boolean;
  skipAudio: boolean;
  theme: string | null;
}

/** Optional system Chrome/Chromium (for machines that cannot download Remotion's headless browser). */
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;

function fail(msg: string): never {
  console.error(`\nERROR: ${msg}`);
  process.exit(1);
}

function parseArgs(argv: string[]): Args {
  const a: Args = { folder: "", preview: false, frames: null, stills: false, skipAudio: false, theme: null };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i]!;
    if (t === "--preview") a.preview = true;
    else if (t === "--stills") a.stills = true;
    else if (t === "--skip-audio") a.skipAudio = true;
    else if (t === "--frames") {
      const m = /^(\d+)-(\d+)$/.exec(argv[++i] ?? "");
      if (!m || Number(m[1]) > Number(m[2])) fail("--frames expects a-b, e.g. 120-240");
      a.frames = [Number(m[1]), Number(m[2])];
    } else if (t === "--theme") a.theme = argv[++i] ?? fail("--theme needs a name");
    else if (t.startsWith("--")) fail(`unknown option ${t}`);
    else if (!a.folder) a.folder = t;
    else fail(`unexpected argument ${t}`);
  }
  if (!a.folder) fail("usage: npm run video -- <videoFolder> [--preview] [--frames 120-240] [--stills] [--skip-audio] [--theme <name>]");
  return a;
}

function readJson(p: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8").replace(/^﻿/, ""));
  } catch (e) {
    return fail(`cannot read ${p}: ${(e as Error).message}`);
  }
}

function run(cmd: string, args: string[], opts: { inherit?: boolean } = {}) {
  return spawnSync(cmd, args, {
    shell: false,
    cwd: REPO,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: opts.inherit ? "inherit" : "pipe",
  });
}

function step(name: string) {
  console.log(`\n== ${name}`);
}

function printValidation(errors: string[], warnings: string[]) {
  for (const w of warnings) console.warn(`  warning: ${w}`);
  for (const e of errors) console.error(`  error: ${e}`);
}

function mtime(p: string): number {
  return fs.statSync(p).mtimeMs;
}

function probeDuration(file: string): number {
  const r = run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return Number.parseFloat((r.stdout ?? "").trim());
}

function nextVersion(dir: string, prefix: string): number {
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}_v(\\d+)\\.mp4$`);
  let max = 0;
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      const m = re.exec(f);
      if (m) max = Math.max(max, Number(m[1]));
    }
  }
  return max + 1;
}

const lastBucket: Record<string, number> = {};
function progressLine(label: string, p: number, extra = "") {
  if (!process.stdout.isTTY) {
    const bucket = Math.floor(p * 10);
    if (bucket === lastBucket[label]) return;
    lastBucket[label] = bucket;
    console.log(`  ${label} ${Math.round(p * 100)}% ${extra}`);
    return;
  }
  const pct = Math.min(100, Math.round(p * 100));
  const bar = "#".repeat(Math.round(pct / 5)).padEnd(20, ".");
  process.stdout.write(`\r  ${label} [${bar}] ${String(pct).padStart(3)}% ${extra}`.padEnd(78));
}

/** Two-pass EBU R128 loudnorm; video stream is copied, audio re-encoded to AAC 192k. */
function normalise(input: string, output: string) {
  const base = `loudnorm=I=${TARGET_LUFS}:TP=-1.5:LRA=11`;
  const m = run("ffmpeg", ["-hide_banner", "-nostats", "-i", input, "-vn", "-af", `${base}:print_format=json`, "-f", "null", "-"]);
  if (m.status !== 0) throw new Error(`ffmpeg loudnorm measure failed:\n${m.stderr}`);
  const jsonText = /\{[^{}]*"input_i"[^{}]*\}/.exec(m.stderr ?? "")?.[0];
  if (!jsonText) throw new Error(`could not parse loudnorm measurement:\n${m.stderr}`);
  const j = JSON.parse(jsonText) as Record<string, string>;
  console.log(`  measured: I=${j.input_i} LUFS, TP=${j.input_tp} dBTP, LRA=${j.input_lra}`);
  const filter =
    `${base}:measured_I=${j.input_i}:measured_LRA=${j.input_lra}:measured_TP=${j.input_tp}` +
    `:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`;
  const r = run("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error", "-i", input,
    "-map", "0:v:0", "-map", "0:a:0", "-c:v", "copy",
    "-af", filter, "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-movflags", "+faststart", output,
  ]);
  if (r.status !== 0) throw new Error(`ffmpeg loudnorm apply failed:\n${r.stderr}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const folder = path.resolve(args.folder);
  if (!fs.existsSync(folder)) fail(`video folder not found: ${folder}`);
  const parent = path.dirname(folder);
  const scenePath = path.join(folder, "project", "scene.json");
  const scriptPath = path.join(folder, "project", "script.txt");
  if (!fs.existsSync(scenePath)) fail(`missing ${scenePath}`);
  const t0 = Date.now();

  // a. validate the scene on its own first
  step("Validate scene");
  const rawScene = readJson(scenePath);
  const sceneOnly = SceneSchema.safeParse(rawScene);
  if (!sceneOnly.success) {
    printValidation(sceneOnly.error.issues.map((i) => `scene.${i.path.join(".")}: ${i.message}`), []);
    process.exit(1);
  }
  const sceneCfg = sceneOnly.data;
  const voicePath = path.resolve(folder, sceneCfg.audio.voice);
  const wordsPath = path.resolve(folder, sceneCfg.audio.words);
  console.log(`  scene "${sceneCfg.id}", theme ${args.theme ?? sceneCfg.theme}`);

  // b. audio + alignment
  if (args.skipAudio) {
    console.log("  --skip-audio: not running tts/align");
  } else {
    if (!fs.existsSync(voicePath)) {
      if (!fs.existsSync(scriptPath)) fail(`voice missing (${voicePath}) and no project/script.txt to synthesise from`);
      step("TTS (voice.wav missing)");
      const r = run("python", [path.join(REPO, "scripts", "tts.py"), folder], { inherit: true });
      if (r.status !== 0) fail("tts.py failed");
    }
    if (!fs.existsSync(voicePath)) fail(`voice still missing after tts: ${voicePath}`);
    if (!fs.existsSync(wordsPath) || mtime(wordsPath) < mtime(voicePath)) {
      if (!fs.existsSync(scriptPath)) fail("words.json missing/outdated and no project/script.txt to align against");
      step("Align (words.json missing or older than voice.wav)");
      const r = run("python", [path.join(REPO, "scripts", "align.py"), folder], { inherit: true });
      if (r.status !== 0) fail("align.py failed");
    }
  }
  if (!fs.existsSync(voicePath)) fail(`voice not found: ${voicePath}`);
  if (!fs.existsSync(wordsPath)) fail(`words.json not found: ${wordsPath}`);

  step("Validate scene + words");
  const v = validateAll(rawScene, readJson(wordsPath));
  printValidation(v.errors, v.warnings);
  if (v.errors.length > 0 || !v.scene || !v.words) fail(`${v.errors.length} validation error(s)`);
  console.log(`  ok (${v.words.length} words, ${v.warnings.length} warning(s))`);
  const words: Word[] = v.words;
  const scene: Scene = { ...v.scene };
  if (args.theme) {
    const th = ThemeNameSchema.safeParse(args.theme);
    if (!th.success) fail(`unknown theme "${args.theme}" (expected one of ${ThemeNameSchema.options.join(", ")})`);
    scene.theme = th.data;
  }
  if (args.preview) scene.fps = 15;

  // c. stage media into public/media/<id>/
  step("Stage media");
  const mediaDir = path.join(PUBLIC_DIR, "media", scene.id);
  fs.mkdirSync(mediaDir, { recursive: true });
  fs.copyFileSync(voicePath, path.join(mediaDir, "voice.wav"));
  const media: { voice: string | null; music: string | null } = { voice: `media/${scene.id}/voice.wav`, music: null };
  if (scene.audio.music) {
    const musicSrc = path.resolve(parent, scene.audio.music);
    if (fs.existsSync(musicSrc)) {
      const name = `music${path.extname(musicSrc).toLowerCase()}`;
      fs.copyFileSync(musicSrc, path.join(mediaDir, name));
      media.music = `media/${scene.id}/${name}`;
    } else {
      console.warn(`  warning: music not found (${musicSrc}); rendering without music`);
    }
  }
  console.log(`  voice: ${media.voice}${media.music ? `, music: ${media.music}` : ""}`);

  // d. bundle once per run
  step("Bundle");
  const serveUrl = await bundle({
    entryPoint: ENTRY,
    publicDir: PUBLIC_DIR,
    onProgress: (p) => progressLine("bundle", p / 100),
  });
  process.stdout.write("\n");
  const inputProps = { scene, words, media };
  const composition = await selectComposition({ serveUrl, id: "Explainer", inputProps, browserExecutable });
  console.log(`  composition ${composition.width}x${composition.height} @ ${composition.fps} fps, ${composition.durationInFrames} frames`);

  const exportDir = path.join(folder, "export");

  if (args.stills) {
    // g. one still per stage + contact sheet
    step("Stills");
    const stillsDir = path.join(folder, "project", "stills");
    fs.rmSync(stillsDir, { recursive: true, force: true });
    fs.mkdirSync(stillsDir, { recursive: true });
    const total = totalDurationInFrames(words, composition.fps);
    const frames = scene.stages.map((st, i) => {
      const from = cueToFrame(st.from, words, composition.fps);
      const to = i === scene.stages.length - 1 ? total : cueToFrame(st.to, words, composition.fps);
      // Last frame before the outgoing crossfade, so every element of the stage has entered.
      return Math.max(from, Math.min(total - 1, to - Math.round(0.15 * composition.fps)));
    });
    for (let i = 0; i < frames.length; i++) {
      const out = path.join(stillsDir, `${String(i).padStart(2, "0")}_${scene.stages[i]!.id}.png`);
      await renderStill({ composition, serveUrl, output: out, frame: frames[i]!, inputProps, imageFormat: "png", browserExecutable });
      progressLine("stills", (i + 1) / frames.length, `stage ${i + 1}/${frames.length}`);
    }
    process.stdout.write("\n");
    // ffmpeg image2 patterns are fiddly with arbitrary names: copy to sequential temp names.
    const seqDir = fs.mkdtempSync(path.join(stillsDir, ".seq-"));
    const files = fs.readdirSync(stillsDir).filter((f) => f.endsWith(".png")).sort();
    files.forEach((f, i) => fs.copyFileSync(path.join(stillsDir, f), path.join(seqDir, `s${String(i).padStart(3, "0")}.png`)));
    const cols = Math.min(files.length, 4);
    const rows = Math.ceil(files.length / cols);
    const sheet = path.join(folder, "project", "contact_sheet.png");
    const r = spawnSync(
      "ffmpeg",
      ["-y", "-hide_banner", "-loglevel", "error", "-framerate", "1", "-i", "s%03d.png", "-vf", `scale=360:-1,tile=${cols}x${rows}:padding=8:color=0x202020`, "-frames:v", "1", sheet],
      { cwd: seqDir, shell: false, encoding: "utf8" },
    );
    fs.rmSync(seqDir, { recursive: true, force: true });
    if (r.status !== 0) fail(`contact sheet failed:\n${r.stderr}`);
    console.log(`  contact sheet: ${sheet}`);
    console.log(`  stills: ${stillsDir}`);
    console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    return;
  }

  step(args.preview ? "Render (preview: 0.5x, 15 fps)" : "Render");
  const rawDir = path.join(REPO, "out");
  fs.mkdirSync(rawDir, { recursive: true });
  const rawOut = path.join(rawDir, `${scene.id}_raw_${process.pid}.mp4`);
  const rt = Date.now();
  await renderMedia({
    composition,
    browserExecutable,
    serveUrl,
    codec: "h264",
    crf: 18,
    audioCodec: "aac",
    audioBitrate: "192k",
    outputLocation: rawOut,
    inputProps,
    scale: args.preview ? 0.5 : 1,
    ...(args.frames ? { frameRange: args.frames } : {}),
    overwrite: true,
    onProgress: (p) => progressLine("render", p.progress, `${p.renderedFrames}/${composition.durationInFrames} frames`),
  });
  process.stdout.write("\n");
  console.log(`  rendered in ${((Date.now() - rt) / 1000).toFixed(1)} s`);

  // e. loudness
  step(`Loudness normalise to ${TARGET_LUFS} LUFS`);
  fs.mkdirSync(exportDir, { recursive: true });
  const prefix = args.preview ? `${scene.id}_preview` : scene.id;
  const n = nextVersion(exportDir, prefix);
  const finalPath = path.join(exportDir, `${prefix}_v${n}.mp4`);
  try {
    normalise(rawOut, finalPath);
  } finally {
    fs.rmSync(rawOut, { force: true });
  }

  // f. report
  step("Done");
  console.log(`  ${finalPath}`);
  console.log(`  duration ${probeDuration(finalPath).toFixed(2)} s, total ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
