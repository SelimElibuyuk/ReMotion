import { describe, expect, it } from "vitest";
import { CueError, END_TAIL_S, cueToFrame, cueToSeconds, totalDurationInFrames, wordsByLine } from "../src/timing/cues";
import { synthWords } from "./helpers";

const W = synthWords();

describe("cueToSeconds", () => {
  it("plain numbers are seconds", () => expect(cueToSeconds(2.5, W)).toBe(2.5));
  it("@w:N is the start of word N", () => {
    expect(cueToSeconds("@w:0", W)).toBe(1);
    expect(cueToSeconds("@w:3", W)).toBe(3.6);
  });
  it("@w:N+x / -x apply offsets", () => {
    expect(cueToSeconds("@w:2+0.4", W)).toBeCloseTo(3.4);
    expect(cueToSeconds("@w:2-0.2", W)).toBeCloseTo(2.8);
  });
  it("clamps at 0", () => {
    expect(cueToSeconds("@w:0-5", W)).toBe(0);
    expect(cueToSeconds("@line:0-5", W)).toBe(0);
    expect(cueToSeconds("@end-100", W)).toBe(0);
  });
  it("@line:N is the first word of line N", () => {
    expect(cueToSeconds("@line:0", W)).toBe(1);
    expect(cueToSeconds("@line:1", W)).toBe(3);
    expect(cueToSeconds("@line:2", W)).toBe(5);
    expect(cueToSeconds("@line:1+0.5", W)).toBe(3.5);
  });
  it("@end is the end of the last word, with offsets", () => {
    expect(cueToSeconds("@end", W)).toBe(6);
    expect(cueToSeconds("@end-1", W)).toBe(5);
    expect(cueToSeconds("@end+0.5", W)).toBe(6.5);
  });
  it("throws CueError past the last word", () => {
    expect(() => cueToSeconds("@w:6", W)).toThrow(CueError);
    expect(() => cueToSeconds("@w:999", W)).toThrow(/past the last word/);
  });
  it("throws CueError past the last line", () => {
    expect(() => cueToSeconds("@line:3", W)).toThrow(CueError);
    expect(() => cueToSeconds("@line:3", W)).toThrow(/last narration line/);
  });
  it("throws CueError on malformed strings", () => {
    expect(() => cueToSeconds("@word:3", W)).toThrow(CueError);
  });
  it("throws CueError for symbolic cues with empty words", () => {
    expect(() => cueToSeconds("@end", [])).toThrow(CueError);
  });
});

describe("cueToFrame", () => {
  it("rounds seconds*fps to nearest frame", () => {
    expect(cueToFrame(1, W, 30)).toBe(30);
    expect(cueToFrame(1.016, W, 30)).toBe(30); // 30.48
    expect(cueToFrame(1.02, W, 30)).toBe(31); // 30.6
    expect(cueToFrame("@w:3", W, 30)).toBe(108);
    expect(cueToFrame("@w:3", W, 15)).toBe(54);
  });
});

describe("totalDurationInFrames", () => {
  it("is ceil((last.e + END_TAIL_S) * fps)", () => {
    expect(totalDurationInFrames(W, 30)).toBe(Math.ceil((6 + END_TAIL_S) * 30));
    expect(totalDurationInFrames(W, 24)).toBe(Math.ceil((6 + END_TAIL_S) * 24));
    const odd = [{ ...W[0]!, e: 29.615 }];
    expect(totalDurationInFrames(odd, 30)).toBe(Math.ceil((29.615 + END_TAIL_S) * 30));
  });
  it("is at least 1 for empty words", () => expect(totalDurationInFrames([], 30)).toBeGreaterThanOrEqual(1));
});

describe("wordsByLine", () => {
  it("groups words by line in order", () => {
    const g = wordsByLine(W);
    expect(g.map((l) => l.map((w) => w.w))).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e", "f"],
    ]);
  });
  it("skips missing line numbers", () => {
    expect(wordsByLine([{ ...W[0]!, line: 0 }, { ...W[1]!, line: 2 }])).toHaveLength(2);
  });
  it("returns [] for no words", () => expect(wordsByLine([])).toEqual([]));
});
