import { describe, expect, it } from "vitest";
import { SceneSchema } from "../src/schema/scene";
import { baseScene, demoScene, readJson } from "./helpers";

const ok = (v: unknown) => SceneSchema.safeParse(v).success;
const tag = (extra: Record<string, unknown> = {}) => ({ type: "tag", text: "X", x: 540, y: 800, ...extra });

describe("scene schema: reference scenes", () => {
  it("parses the PRD cobra example verbatim", () => {
    const r = SceneSchema.safeParse(readJson("tests/fixtures/prd_cobra.json"));
    expect(r.success, r.success ? "" : JSON.stringify(r.error.issues)).toBe(true);
  });
  it("parses the demo scene", () => {
    const r = SceneSchema.safeParse(demoScene());
    expect(r.success, r.success ? "" : JSON.stringify(r.error.issues)).toBe(true);
  });
  it("defaults fps to 30", () => {
    const s = baseScene([]);
    delete s.fps;
    expect(SceneSchema.parse(s).fps).toBe(30);
  });
});

describe("scene schema: strictness", () => {
  it("rejects unknown top-level keys", () => expect(ok({ ...baseScene(), extra: 1 })).toBe(false));
  it("rejects unknown stage keys", () => expect(ok(baseScene([], { camra: {} }))).toBe(false));
  it("rejects unknown element keys (typo 'assset')", () => {
    const el = { type: "svg", asset: "cobra", assset: "x", x: 540, y: 800, w: 400 };
    expect(ok(baseScene([el]))).toBe(false);
  });
  it("accepts the same element without the typo", () => {
    expect(ok(baseScene([{ type: "svg", asset: "cobra", x: 540, y: 800, w: 400 }]))).toBe(true);
  });
  it("rejects unknown keys inside enter", () => {
    expect(ok(baseScene([tag({ enter: { pop: 1, durr: 1 } })]))).toBe(false);
  });
});

describe("scene schema: enter / exit", () => {
  it("accepts each single enter kind", () => {
    for (const k of ["draw", "fade", "pop", "slide", "type"]) {
      expect(ok(baseScene([tag({ enter: { [k]: "@w:1" } })])), k).toBe(true);
    }
  });
  it("rejects enter with two kinds", () => {
    expect(ok(baseScene([tag({ enter: { fade: 1, pop: 2 } })]))).toBe(false);
  });
  it("rejects enter with zero kinds", () => {
    expect(ok(baseScene([tag({ enter: {} })]))).toBe(false);
    expect(ok(baseScene([tag({ enter: { dur: 0.5 } })]))).toBe(false);
  });
  it("rejects exit pop / slide / type", () => {
    expect(ok(baseScene([tag({ exit: { pop: 5 } })]))).toBe(false);
    expect(ok(baseScene([tag({ exit: { slide: 5 } })]))).toBe(false);
    expect(ok(baseScene([tag({ exit: { type: 5 } })]))).toBe(false);
  });
  it("accepts exit fade and draw", () => {
    expect(ok(baseScene([tag({ exit: { fade: 5 } })]))).toBe(true);
    expect(ok(baseScene([tag({ exit: { draw: 5 } })]))).toBe(true);
  });
  it("rejects non-positive dur", () => {
    expect(ok(baseScene([tag({ enter: { pop: 1, dur: 0 } })]))).toBe(false);
  });
});

describe("scene schema: cues", () => {
  const withCue = (c: unknown) => baseScene([tag({ enter: { pop: c } })]);
  it.each(["@w:", "@word:3", "w:3", "@line:-1", "@w:12+", "@w:1.5", "@end:2", "", "@w:12 +0.4"])("rejects bad cue %j", (c) => {
    expect(ok(withCue(c))).toBe(false);
  });
  it.each(["@w:12", "@w:12+0.4", "@w:12-0.2", "@line:3", "@line:3-0.2", "@end", "@end-1", 2.5, 0])("accepts good cue %j", (c) => {
    expect(ok(withCue(c))).toBe(true);
  });
  it("rejects negative seconds", () => expect(ok(withCue(-1))).toBe(false));
});

describe("scene schema: path and barchart", () => {
  const path = (extra: Record<string, unknown>) => ({ type: "path", ...extra });
  it("path accepts exactly one of d / points", () => {
    expect(ok(baseScene([path({ d: "M0 0 L10 10" })]))).toBe(true);
    expect(ok(baseScene([path({ points: [[0, 0], [10, 10]] })]))).toBe(true);
  });
  it("path rejects neither or both", () => {
    expect(ok(baseScene([path({})]))).toBe(false);
    expect(ok(baseScene([path({ d: "M0 0", points: [[0, 0], [1, 1]] })]))).toBe(false);
  });
  it("path rejects a single point", () => expect(ok(baseScene([path({ points: [[0, 0]] })]))).toBe(false));

  const bars = (n: number) => ({
    type: "barchart",
    x: 540,
    y: 800,
    w: 600,
    h: 400,
    bars: Array.from({ length: n }, (_, i) => ({ label: `b${i}`, value: i })),
  });
  it.each([
    [1, false],
    [2, true],
    [6, true],
    [7, false],
  ])("barchart with %i bars -> %s", (n, expected) => {
    expect(ok(baseScene([bars(n)]))).toBe(expected);
  });
});

describe("scene schema: misc", () => {
  it("rejects unknown theme", () => expect(ok({ ...baseScene(), theme: "neon" })).toBe(false));
  it("rejects empty stages", () => expect(ok({ ...baseScene(), stages: [] })).toBe(false));
  it("rejects text size below 40 px", () => {
    expect(ok(baseScene([tag({ size: 30 })]))).toBe(false);
    expect(ok(baseScene([tag({ size: 40 })]))).toBe(true);
  });
  it("validates caption override keys", () => {
    expect(ok({ ...baseScene(), captions: { x: "t" } })).toBe(false);
    expect(ok({ ...baseScene(), captions: { "3": "t" } })).toBe(true);
  });
});
