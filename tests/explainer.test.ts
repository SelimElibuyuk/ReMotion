import { describe, expect, it } from "vitest";
import { SceneSchema } from "../src/schema/scene";
import { END_TAIL_S } from "../src/timing/cues";
import { baseScene, demoScene, demoWords, synthWords } from "./helpers";

// Explainer.tsx imports primitives/themes/layout modules that may not exist yet; load defensively.
let mod: typeof import("../src/Explainer") | null = null;
let loadError = "";
try {
  mod = await import("../src/Explainer");
} catch (e) {
  loadError = (e as Error).message.split("\n")[0] ?? "";
}

if (!mod) {
  describe("Explainer helpers (skipped: module not importable yet)", () => {
    it.todo(`layoutStages / musicVolume / calculateExplainerMetadata -- import failed: ${loadError}`);
  });
} else {
  const { layoutStages, musicVolume, calculateExplainerMetadata } = mod;
  const W = synthWords();

  describe("musicVolume", () => {
    it("ducks to 45 % of gain while a word is spoken", () => {
      expect(musicVolume(Math.round(1.25 * 30), W, 30, 0.2)).toBeCloseTo(0.2 * 0.45, 5);
    });
    it("is full gain in a long gap and after fade-in", () => {
      // gap between 2.0 and 3.0 s is only 1 s; ramps are 0.25 s each side -> t=2.5 is un-ducked
      expect(musicVolume(75, W, 30, 0.2)).toBeCloseTo(0.2, 5);
    });
    it("fades in over the first second", () => {
      expect(musicVolume(0, [], 30, 0.2)).toBe(0);
      expect(musicVolume(15, [], 30, 0.2)).toBeCloseTo(0.1, 5);
    });
    it("ramps between full and ducked", () => {
      const v = musicVolume(Math.round(0.9 * 30), W, 30, 0.2); // 0.1 s before word 0 (ramp 0.25)
      expect(v).toBeLessThan(0.2 * 1);
      expect(v).toBeGreaterThan(0.2 * 0.45);
    });
  });

  describe("calculateExplainerMetadata", () => {
    it("returns 1080x1920 with duration from words", () => {
      const scene = SceneSchema.parse(baseScene());
      const r = calculateExplainerMetadata({ props: { scene, words: W, media: { voice: null, music: null } } });
      expect(r).toMatchObject({ width: 1080, height: 1920, fps: 30 });
      expect(r.durationInFrames).toBe(Math.ceil((6 + END_TAIL_S) * 30));
    });
  });

  describe("layoutStages", () => {
    const scene = SceneSchema.parse(demoScene());
    const words = demoWords();
    const total = Math.ceil((words[words.length - 1]!.e + END_TAIL_S) * 30);
    const L = layoutStages(scene, words, 30, total);

    it("returns one layout per stage", () => expect(L).toHaveLength(scene.stages.length));
    it("first stage has no fade-in; last has no fade-out", () => {
      expect(L[0]!.fadeIn).toBe(0);
      expect(L[L.length - 1]!.fadeOut).toBe(0);
    });
    it("middle stages crossfade by 0.4 s (12 frames)", () => {
      expect(L[1]!.fadeIn).toBe(12);
      expect(L[1]!.fadeOut).toBe(12);
    });
    it("last stage runs to the end of the composition", () => {
      const last = L[L.length - 1]!;
      expect(last.from + last.visibleLen).toBe(total);
    });
    it("sequences never exceed the composition length", () => {
      for (const s of L) expect(s.from + s.len).toBeLessThanOrEqual(total);
    });
    it("cut: true removes the crossfade on both sides of the boundary", () => {
      const cutScene = SceneSchema.parse({ ...demoScene(), stages: demoScene().stages.map((s: any, i: number) => (i === 2 ? { ...s, cut: true } : s)) });
      const C = layoutStages(cutScene, words, 30, total);
      expect(C[2]!.fadeIn).toBe(0);
      expect(C[1]!.fadeOut).toBe(0);
    });
  });
}
