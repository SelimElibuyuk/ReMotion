import { describe, expect, it } from "vitest";
import { EASE_IN_OUT, EASE_OUT, lerp, popScale, progress, rand } from "../src/timing/easing";
import { motionState, type Motion } from "../src/timing/motion";

const m = (kind: Motion["kind"], start = 30, dur = 20): Motion => ({ kind, start, dur });

describe("motionState: enter", () => {
  it("is invisible before start", () => {
    for (const k of ["fade", "pop", "slide", "draw", "type"] as const) {
      const s = motionState(29, m(k), null);
      expect(s.visible, k).toBe(false);
      expect(s.opacity, k).toBe(0);
    }
  });
  it("without enter is fully visible", () => {
    expect(motionState(0, null, null)).toMatchObject({ visible: true, opacity: 1, scale: 1, translateY: 0, draw: 1 });
  });
  it("fade goes 0 -> 1", () => {
    expect(motionState(30, m("fade"), null).opacity).toBe(0);
    const mid = motionState(40, m("fade"), null).opacity;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(motionState(50, m("fade"), null).opacity).toBe(1);
    expect(motionState(500, m("fade"), null).opacity).toBe(1);
  });
  it("pop scale starts at 0.92, never exceeds 1.04, ends at 1", () => {
    expect(motionState(30, m("pop"), null).scale).toBeCloseTo(0.92);
    let max = 0;
    for (let f = 30; f <= 60; f++) max = Math.max(max, motionState(f, m("pop"), null).scale);
    expect(max).toBeLessThanOrEqual(1.04);
    expect(max).toBeGreaterThan(1);
    expect(motionState(50, m("pop"), null).scale).toBe(1);
  });
  it("slide translateY goes 24 -> 0", () => {
    expect(motionState(30, m("slide"), null).translateY).toBeCloseTo(24);
    expect(motionState(50, m("slide"), null).translateY).toBeCloseTo(0);
    const mid = motionState(40, m("slide"), null).translateY;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(24);
  });
  it("draw progress goes 0 -> 1 monotonically", () => {
    expect(motionState(30, m("draw"), null).draw).toBe(0);
    expect(motionState(50, m("draw"), null).draw).toBe(1);
    let prev = -1;
    for (let f = 30; f <= 50; f++) {
      const d = motionState(f, m("draw"), null).draw;
      expect(d).toBeGreaterThanOrEqual(prev);
      prev = d;
    }
  });
  it("type progress is linear 0 -> 1", () => {
    expect(motionState(40, m("type"), null).draw).toBeCloseTo(0.5);
  });
  it("zero-duration enter snaps to done at start", () => {
    expect(motionState(30, m("fade", 30, 0), null).opacity).toBe(1);
  });
});

describe("motionState: exit", () => {
  it("fade exit reduces opacity to 0", () => {
    const ex = m("fade", 100, 20);
    expect(motionState(99, null, ex).opacity).toBe(1);
    const mid = motionState(110, null, ex).opacity;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(motionState(120, null, ex).opacity).toBe(0);
    expect(motionState(200, null, ex).opacity).toBe(0);
  });
  it("draw exit un-draws to 0 without touching opacity", () => {
    const s = motionState(120, null, m("draw", 100, 20));
    expect(s.draw).toBe(0);
    expect(s.opacity).toBe(1);
  });
  it("exit combines with a finished enter", () => {
    expect(motionState(300, m("fade"), m("fade", 200, 10)).opacity).toBe(0);
  });
});

describe("easing", () => {
  it("progress clamps to [0,1]", () => {
    expect(progress(-10, 0, 10)).toBe(0);
    expect(progress(0, 0, 10)).toBe(0);
    expect(progress(10, 0, 10)).toBe(1);
    expect(progress(1000, 0, 10)).toBe(1);
    expect(progress(5, 10, 10, EASE_IN_OUT)).toBe(0);
  });
  it("progress with dur <= 0 is a step", () => {
    expect(progress(4, 5, 0)).toBe(0);
    expect(progress(5, 5, 0)).toBe(1);
  });
  it("ease-out is ahead of linear at the midpoint", () => {
    expect(progress(5, 0, 10, EASE_OUT)).toBeGreaterThan(0.5);
  });
  it("popScale(1) = 1, popScale(0) = 0.92, within 4 % overshoot", () => {
    expect(popScale(1)).toBe(1);
    expect(popScale(2)).toBe(1);
    expect(popScale(0)).toBeCloseTo(0.92);
    for (let i = 0; i <= 100; i++) expect(popScale(i / 100)).toBeLessThanOrEqual(1.04);
  });
  it("lerp interpolates", () => expect(lerp(10, 20, 0.25)).toBe(12.5));
  it("rand is deterministic and in [0,1)", () => {
    expect(rand(7)).toBe(rand(7));
    expect(rand(7)).not.toBe(rand(8));
    for (let i = -50; i < 500; i++) {
      const r = rand(i);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
  });
});
