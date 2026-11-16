import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Word } from "../src/schema/scene";

export const root = resolve(__dirname, "..");
export const readJson = (p: string): any => JSON.parse(readFileSync(resolve(root, p), "utf8"));
export const demoScene = () => readJson("examples/demo-scene/project/scene.json");
export const demoWords = (): Word[] => readJson("examples/demo-scene/project/words.json");

/** 6 words on 3 lines: line0 = w0,w1; line1 = w2,w3; line2 = w4,w5. */
export const synthWords = (): Word[] => [
  { i: 0, w: "a", s: 1, e: 1.5, line: 0 },
  { i: 1, w: "b", s: 1.6, e: 2, line: 0 },
  { i: 2, w: "c", s: 3, e: 3.5, line: 1 },
  { i: 3, w: "d", s: 3.6, e: 4, line: 1 },
  { i: 4, w: "e", s: 5, e: 5.5, line: 2 },
  { i: 5, w: "f", s: 5.6, e: 6, line: 2 },
];

/** Minimal valid scene; stage covers 0..10 s using plain-second cues. */
export const baseScene = (elements: unknown[] = [], stageExtra: Record<string, unknown> = {}): any => ({
  id: "t",
  theme: "blueprint",
  audio: { voice: "v.wav", words: "w.json" },
  chrome: { title: "T" },
  stages: [{ id: "s", from: 0, to: 10, elements, ...stageExtra }],
});
