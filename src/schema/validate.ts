// Semantic validation on top of the zod schema: cue resolution and the product motion rules.
import { CONTENT_BAND, RULES, SAFE_RECT } from "../layout/safeArea";
import { CueError, cueToSeconds } from "../timing/cues";
import { ENTER_KINDS, SceneSchema, WordsSchema, type Cue, type Enter, type Scene, type SceneElement, type Word } from "./scene";

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export function enterKindOf(m: Enter): (typeof ENTER_KINDS)[number] {
  const k = ENTER_KINDS.find((k) => m[k] !== undefined);
  if (!k) throw new Error("enter has no kind");
  return k;
}

/** Cue at which an element starts entering (counter: its `at`), or null if it is there from the stage start. */
export function enterCueOf(el: SceneElement): Cue | null {
  if (el.enter) return el.enter[enterKindOf(el.enter)] as Cue;
  if (el.type === "counter") return el.at;
  return null;
}

export function validateSemantics(scene: Scene, words: Word[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sec = (c: Cue, where: string): number | null => {
    try {
      return cueToSeconds(c, words);
    } catch (e) {
      if (e instanceof CueError) errors.push(`${where}: ${e.message}`);
      else throw e;
      return null;
    }
  };

  for (const lineKey of Object.keys(scene.captions ?? {})) {
    if (!words.some((w) => w.line === Number(lineKey))) errors.push(`captions."${lineKey}": no narration line ${lineKey}`);
  }

  // Stages must hand over cleanly: next.from == prev.to (crossfade), otherwise there is a gap or a double image.
  for (let i = 1; i < scene.stages.length; i++) {
    const prev = scene.stages[i - 1]!;
    const cur = scene.stages[i]!;
    try {
      const gap = cueToSeconds(cur.from, words) - cueToSeconds(prev.to, words);
      if (Math.abs(gap) > 0.05) {
        warnings.push(`stages[${i}] "${cur.id}": starts ${gap.toFixed(2)} s ${gap > 0 ? "after" : "before"} "${prev.id}" ends; use the same cue for a clean crossfade`);
      }
    } catch {
      /* cue errors are reported below */
    }
  }

  scene.stages.forEach((stage, si) => {
    const sw = `stages[${si}] "${stage.id}"`;
    const from = sec(stage.from, `${sw}.from`);
    const to = sec(stage.to, `${sw}.to`);
    if (from !== null && to !== null && to <= from) errors.push(`${sw}: "to" must be after "from"`);
    const stageLen = from !== null && to !== null ? to - from : null;

    if (stage.camera?.push && stageLen && stage.camera.push / stageLen > RULES.maxPushPerSecond + 1e-9) {
      errors.push(`${sw}.camera.push: ${stage.camera.push} over ${stageLen.toFixed(1)} s exceeds 1 % scale per second`);
    }

    const ids = new Set<string>();
    const starts: { t: number; where: string }[] = [];
    stage.elements.forEach((el, ei) => {
      const ew = `${sw}.elements[${ei}] (${el.type}${el.id ? ` #${el.id}` : ""})`;
      if (el.id) {
        if (ids.has(el.id)) errors.push(`${ew}: duplicate id`);
        ids.add(el.id);
      }
      // Durations
      if (el.enter) {
        const kind = enterKindOf(el.enter);
        const d = el.enter.dur;
        if (d !== undefined) {
          if (kind === "draw" || kind === "type") {
            if (d > RULES.maxDrawDur && kind === "draw") errors.push(`${ew}: draw-on ${d} s exceeds ${RULES.maxDrawDur} s`);
          } else if (d < RULES.enterDur[0] || d > RULES.enterDur[1]) {
            errors.push(`${ew}: enter ${d} s must be within ${RULES.enterDur[0]}–${RULES.enterDur[1]} s`);
          }
        }
      }
      const ec = enterCueOf(el);
      if (ec !== null) {
        const t = sec(ec, `${ew}.enter`);
        if (t !== null) {
          starts.push({ t, where: ew });
          if (from !== null && to !== null && (t < from - 1e-6 || t > to)) warnings.push(`${ew}: enters outside its stage window`);
        }
      }
      if (el.exit) {
        const k = el.exit.fade !== undefined ? "fade" : "draw";
        sec(el.exit[k] as Cue, `${ew}.exit`);
      }
      // Cue-bearing sub fields
      if (el.type === "barchart") el.changes?.forEach((c, i) => sec(c.at, `${ew}.changes[${i}].at`));
      if (el.type === "timeline") {
        el.events.forEach((e, i) => e.at !== undefined && sec(e.at, `${ew}.events[${i}].at`));
        el.spans?.forEach((s, i) => s.at !== undefined && sec(s.at, `${ew}.spans[${i}].at`));
      }
      if (el.type === "text") el.wordCues?.forEach((c, i) => sec(c, `${ew}.wordCues[${i}]`));
      if (el.type === "strike") {
        const target = stage.elements.find((o) => o.id === el.target);
        if (!target) errors.push(`${ew}: target "${el.target}" not found in this stage`);
        else if (!("w" in target) && el.w === undefined) {
          errors.push(`${ew}: target "${el.target}" (${target.type}) has no width; set "w" on the strike`);
        }
      }
      // Safe area (centre point of positioned elements)
      if ("x" in el && "y" in el) {
        if (el.y < SAFE_RECT.top || el.y > SAFE_RECT.bottom) {
          errors.push(`${ew}: y=${el.y} is outside the safe area (${SAFE_RECT.top}–${SAFE_RECT.bottom})`);
        } else if (el.y < CONTENT_BAND.top || el.y > CONTENT_BAND.bottom) {
          warnings.push(`${ew}: y=${el.y} is outside the content band (${CONTENT_BAND.top}–${CONTENT_BAND.bottom}); it may overlap the title or captions`);
        }
        if (el.x < SAFE_RECT.left || el.x > SAFE_RECT.right) {
          errors.push(`${ew}: x=${el.x} is outside the safe area (${SAFE_RECT.left}–${SAFE_RECT.right})`);
        }
      }
      if (typeof (el as { size?: unknown }).size === "number" && ((el as { size: number }).size < RULES.minLabelPx)) {
        errors.push(`${ew}: size below ${RULES.minLabelPx} px`);
      }
    });

    // One thing moves at a time.
    starts.sort((a, b) => a.t - b.t);
    for (let i = 1; i < starts.length; i++) {
      const a = starts[i - 1]!;
      const b = starts[i]!;
      if (b.t - a.t < RULES.minStagger - 1e-6) {
        errors.push(`${b.where}: enters ${(b.t - a.t).toFixed(2)} s after ${a.where}; stagger must be ≥ ${RULES.minStagger} s`);
      }
    }
  });

  return { errors, warnings };
}

/** Full validation of raw JSON: schema, then semantics. */
export function validateAll(rawScene: unknown, rawWords: unknown): ValidationResult & { scene?: Scene; words?: Word[] } {
  const s = SceneSchema.safeParse(rawScene);
  const w = WordsSchema.safeParse(rawWords);
  const errors: string[] = [];
  if (!s.success) errors.push(...s.error.issues.map((i) => `scene.${i.path.join(".")}: ${i.message}`));
  if (!w.success) errors.push(...w.error.issues.map((i) => `words[${i.path.join(".")}]: ${i.message}`));
  if (!s.success || !w.success) return { errors, warnings: [] };
  const sem = validateSemantics(s.data, w.data);
  return { ...sem, scene: s.data, words: w.data };
}
