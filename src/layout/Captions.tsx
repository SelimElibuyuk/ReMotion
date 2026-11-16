// Bottom caption band: shows the current <=5-word phrase of the narration, word-tinted, with a 4-frame crossfade.
import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Word } from "../schema/scene";
import { fontStack, type ThemeTokens } from "../themes/types";
import { wordsByLine } from "../timing/cues";

const MAX_WORDS = 5;
const FADE_FRAMES = 4;
const HOLD_AFTER_LINE_S = 0.4;
const BAND = { top: 1335, height: 200, maxWidth: 920 } as const;

interface PhraseWord {
  text: string;
  s: number;
  e: number;
}
interface Phrase {
  words: PhraseWord[];
  start: number;
  end: number;
  /** false for overrides: no active-word tint. */
  tint: boolean;
}

const BREAK_RE = /[,.;:!?—–…)]["'”’]?$/;

/** Break after punctuation first, then split any run longer than 5 words into balanced chunks. */
function splitPhrases(words: PhraseWord[]): PhraseWord[][] {
  const runs: PhraseWord[][] = [];
  let cur: PhraseWord[] = [];
  for (const w of words) {
    cur.push(w);
    if (BREAK_RE.test(w.text)) {
      runs.push(cur);
      cur = [];
    }
  }
  if (cur.length) runs.push(cur);
  const out: PhraseWord[][] = [];
  for (const run of runs) {
    const n = Math.ceil(run.length / MAX_WORDS);
    const size = Math.ceil(run.length / n);
    for (let i = 0; i < run.length; i += size) out.push(run.slice(i, i + size));
  }
  return out;
}

export function buildPhrases(words: Word[], overrides: Record<string, string> | undefined): Phrase[] {
  const lines = wordsByLine(words);
  const phrases: Phrase[] = [];
  lines.forEach((lw, li) => {
    const first = lw[0]!;
    const lineStart = first.s;
    const lineEnd = lw[lw.length - 1]!.e;
    const nextStart = lines[li + 1]?.[0]?.s;
    const lineHide = Math.min(lineEnd + HOLD_AFTER_LINE_S, nextStart ?? Infinity);
    const override = overrides?.[String(first.line)];
    let pw: PhraseWord[];
    if (override !== undefined) {
      const toks = override.split(/\s+/).filter(Boolean);
      const span = Math.max(0.01, lineEnd - lineStart);
      pw = toks.map((text, i) => ({ text, s: lineStart + (span * i) / toks.length, e: lineStart + (span * (i + 1)) / toks.length }));
    } else {
      pw = lw.map((w) => ({ text: w.w, s: w.s, e: w.e }));
    }
    const groups = splitPhrases(pw);
    groups.forEach((g, gi) => {
      const nextG = groups[gi + 1];
      phrases.push({
        words: g,
        start: gi === 0 ? Math.max(0, g[0]!.s - 0.05) : g[0]!.s,
        end: nextG ? nextG[0]!.s : lineHide,
        tint: override === undefined,
      });
    });
  });
  return phrases;
}

export const Captions: React.FC<{ theme: ThemeTokens; words: Word[]; overrides?: Record<string, string>; fps: number }> = ({ theme, words, overrides, fps }) => {
  const frame = useCurrentFrame();
  const phrases = useMemo(() => buildPhrases(words, overrides), [words, overrides]);
  const t = frame / fps;
  const cap = theme.caption;

  const visible = phrases
    .map((p) => {
      const sf = p.start * fps;
      const ef = p.end * fps;
      const inA = Math.min(1, Math.max(0, (frame - sf) / FADE_FRAMES));
      const outA = 1 - Math.min(1, Math.max(0, (frame - ef) / FADE_FRAMES));
      return { p, opacity: Math.min(inA, outA) };
    })
    .filter((v) => v.opacity > 0 && frame >= v.p.start * fps - 0.001);

  const boxStyle: React.CSSProperties =
    cap.box === "solid"
      ? { background: cap.boxColor, padding: "6px 22px", borderRadius: theme.tag.radius + 6 }
      : cap.box === "underline"
        ? { borderBottom: `5px solid ${cap.boxColor}`, padding: "0 6px 4px" }
        : { textShadow: `0 0 14px ${theme.palette.background}, 0 0 4px ${theme.palette.background}` };

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {visible.map(({ p, opacity }, idx) => {
        let active = -1;
        if (p.tint) p.words.forEach((w, i) => (w.s <= t ? (active = i) : undefined));
        return (
          <div
            key={`${p.start}-${idx}`}
            style={{
              position: "absolute",
              left: (1080 - BAND.maxWidth) / 2,
              width: BAND.maxWidth,
              top: BAND.top,
              height: BAND.height,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity,
            }}
          >
            <div
              style={{
                textAlign: "center",
                fontFamily: fontStack(theme.type.body),
                fontSize: theme.type.scale.caption,
                fontWeight: 600,
                lineHeight: 1.22,
                color: cap.textColor,
              }}
            >
              <span style={{ ...boxStyle, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>
                {p.words.map((w, i) => (
                  <React.Fragment key={i}>
                    {i > 0 ? " " : null}
                    <span style={{ color: i === active ? cap.activeWord : cap.textColor }}>{w.text}</span>
                  </React.Fragment>
                ))}
              </span>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
