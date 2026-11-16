import { describe, expect, it } from "vitest";
import { SceneSchema } from "../src/schema/scene";
import { validateAll, validateSemantics } from "../src/schema/validate";
import { baseScene, demoScene, demoWords } from "./helpers";

const W = demoWords();
const run = (elements: unknown[], stageExtra: Record<string, unknown> = {}, sceneExtra: Record<string, unknown> = {}) =>
  validateSemantics(SceneSchema.parse({ ...baseScene(elements, stageExtra), ...sceneExtra }), W);
const tag = (extra: Record<string, unknown> = {}) => ({ type: "tag", text: "X", x: 540, y: 800, ...extra });
const has = (errs: string[], re: RegExp) => errs.some((e) => re.test(e));

describe("validateSemantics: demo scene", () => {
  it("has no errors", () => {
    expect(validateSemantics(SceneSchema.parse(demoScene()), W).errors).toEqual([]);
  });
});

describe("stagger", () => {
  it("errors when two enters are < 0.15 s apart", () => {
    expect(has(run([tag({ enter: { pop: 5 } }), tag({ enter: { pop: 5.1 } })]).errors, /stagger/)).toBe(true);
  });
  it("accepts 0.15 s and more", () => {
    expect(run([tag({ enter: { pop: 5 } }), tag({ enter: { pop: 5.15 } })]).errors).toEqual([]);
    expect(run([tag({ enter: { pop: 5 } }), tag({ enter: { pop: 6 } })]).errors).toEqual([]);
  });
});

describe("durations", () => {
  const withDur = (kind: string, dur: number) => run([tag({ enter: { [kind]: 1, dur } })]).errors;
  it("fade/pop dur 0.2 and 0.9 error; 0.3 and 0.8 ok", () => {
    expect(has(withDur("pop", 0.2), /enter 0\.2 s/)).toBe(true);
    expect(has(withDur("fade", 0.9), /enter 0\.9 s/)).toBe(true);
    expect(withDur("pop", 0.3)).toEqual([]);
    expect(withDur("fade", 0.8)).toEqual([]);
  });
  it("draw 1.6 errors, 1.4 ok", () => {
    expect(has(withDur("draw", 1.6), /draw-on/)).toBe(true);
    expect(withDur("draw", 1.4)).toEqual([]);
  });
});

describe("safe area", () => {
  it("errors for y=100 and y=1700", () => {
    expect(has(run([tag({ y: 100 })]).errors, /safe area/)).toBe(true);
    expect(has(run([tag({ y: 1700 })]).errors, /safe area/)).toBe(true);
  });
  it("errors for x=20", () => expect(has(run([tag({ x: 20 })]).errors, /x=20/)).toBe(true));
  it("accepts the safe-rect edges", () => {
    expect(run([tag({ y: 220 })]).errors).toEqual([]);
    expect(run([tag({ y: 1540 })]).errors).toEqual([]);
  });
});

describe("camera", () => {
  it("push exceeding 1 %/s errors (0.2 over 10 s)", () => {
    expect(has(run([], { camera: { push: 0.2 } }).errors, /1 % scale per second/)).toBe(true);
  });
  it("push within 1 %/s is ok (0.1 over 10 s)", () => {
    expect(run([], { camera: { push: 0.1 } }).errors).toEqual([]);
  });
});

describe("references and ids", () => {
  it("strike with missing target errors", () => {
    expect(has(run([{ type: "strike", target: "nope", kind: "cross" }]).errors, /target "nope" not found/)).toBe(true);
  });
  it("strike with an existing target is ok", () => {
    expect(run([tag({ id: "a" }), { type: "strike", target: "a", kind: "strike", w: 420, enter: { draw: 2 } }]).errors).toEqual([]);
  });
  it("strike on a target without width needs its own w", () => {
    const errs = run([tag({ id: "a" }), { type: "strike", target: "a", kind: "strike", enter: { draw: 2 } }]).errors;
    expect(errs.some((e) => e.includes('set "w" on the strike'))).toBe(true);
  });
  it("duplicate ids error", () => {
    expect(has(run([tag({ id: "a" }), tag({ id: "a", y: 900 })]).errors, /duplicate id/)).toBe(true);
  });
  it("caption override for a non-existent line errors", () => {
    expect(has(run([], {}, { captions: { "99": "x" } }).errors, /no narration line 99/)).toBe(true);
  });
  it("caption override for an existing line is ok", () => {
    expect(run([], {}, { captions: { "1": "x" } }).errors).toEqual([]);
  });
});

describe("cue resolution", () => {
  it("reports a cue past the last word as an error (does not throw)", () => {
    let r: ReturnType<typeof run> | undefined;
    expect(() => (r = run([tag({ enter: { pop: "@w:9999" } })]))).not.toThrow();
    expect(has(r!.errors, /past the last word/)).toBe(true);
  });
  it("reports a stage with to <= from", () => {
    const r = validateSemantics(SceneSchema.parse(baseScene([], { from: 5, to: 5 })), W);
    expect(has(r.errors, /"to" must be after "from"/)).toBe(true);
  });
  it("warns (not errors) when an element enters outside its stage", () => {
    const r = run([tag({ enter: { pop: 20 } })]);
    expect(r.errors).toEqual([]);
    expect(r.warnings.length).toBe(1);
  });
});

describe("validateAll", () => {
  it("passes the demo files", () => {
    const r = validateAll(demoScene(), W);
    expect(r.errors).toEqual([]);
    expect(r.scene?.fps).toBe(30);
  });
  it("reports schema errors with paths", () => {
    const r = validateAll(baseScene([tag({ assset: 1 })]), W);
    expect(r.errors.some((e) => e.startsWith("scene.stages.0.elements.0"))).toBe(true);
    expect(r.scene).toBeUndefined();
  });
  it("reports words schema errors with paths", () => {
    const r = validateAll(baseScene(), [{ i: 0, w: "a" }]);
    expect(r.errors.some((e) => e.startsWith("words[0."))).toBe(true);
  });
  it("reports empty words", () => {
    expect(validateAll(baseScene(), []).errors.length).toBeGreaterThan(0);
  });
});
