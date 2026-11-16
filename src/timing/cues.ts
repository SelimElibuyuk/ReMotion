// Cue -> seconds -> frame resolution against words.json.
import { CUE_RE, type Cue, type Word } from "../schema/scene";

/** Silence kept after the last word before the video ends. */
export const END_TAIL_S = 1.2;

export class CueError extends Error {}

export function cueToSeconds(cue: Cue, words: Word[]): number {
  if (typeof cue === "number") return cue;
  const m = CUE_RE.exec(cue);
  if (!m) throw new CueError(`Invalid cue "${cue}"`);
  const [, kind, nStr, end, offStr] = m;
  const off = offStr ? Number(offStr) : 0;
  const last = words[words.length - 1];
  if (!last) throw new CueError("words.json is empty");
  if (end) return Math.max(0, last.e + off);
  const n = Number(nStr);
  if (kind === "w") {
    const w = words[n];
    if (!w) throw new CueError(`Cue "${cue}" points past the last word (index ${last.i})`);
    return Math.max(0, w.s + off);
  }
  const first = words.find((w) => w.line === n);
  if (!first) throw new CueError(`Cue "${cue}" points past the last narration line (${last.line})`);
  return Math.max(0, first.s + off);
}

export function cueToFrame(cue: Cue, words: Word[], fps: number): number {
  return Math.round(cueToSeconds(cue, words) * fps);
}

/** Total composition length: end of voice plus a short tail. */
export function totalDurationInFrames(words: Word[], fps: number): number {
  const last = words[words.length - 1];
  return Math.max(1, Math.ceil(((last?.e ?? 0) + END_TAIL_S) * fps));
}

/** Words grouped by narration line, in order. */
export function wordsByLine(words: Word[]): Word[][] {
  const lines: Word[][] = [];
  for (const w of words) (lines[w.line] ??= []).push(w);
  return lines.filter(Boolean);
}
