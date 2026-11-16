// The one composition: lays out stages, resolves cues to frames, plays voice + ducked music.
import { Audio } from "@remotion/media";
import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions } from "./layout/Captions";
import { Chrome } from "./layout/Chrome";
import { Surface } from "./layout/Surface";
import { RULES } from "./layout/safeArea";
import { PRIMITIVES } from "./primitives";
import type { Box } from "./primitives/types";
import { enterKindOf } from "./schema/validate";
import type { Cue, ExplainerProps, Scene, SceneElement, Stage, Word } from "./schema/scene";
import { loadThemeFonts } from "./themes/fonts";
import { THEMES } from "./themes";
import type { ThemeTokens } from "./themes/types";
import { cueToFrame, totalDurationInFrames } from "./timing/cues";
import { EASE_IN_OUT, lerp, progress } from "./timing/easing";
import type { Motion } from "./timing/motion";

export const Explainer: React.FC<ExplainerProps> = ({ scene, words, media }) => {
  const theme = THEMES[scene.theme];
  const { fps, durationInFrames } = useVideoConfig();
  const [handle] = useState(() => delayRender(`fonts:${theme.name}`));
  useEffect(() => {
    loadThemeFonts(theme)
      .catch((e) => console.error("Font load failed", e))
      .finally(() => continueRender(handle));
  }, [theme, handle]);

  const stages = useMemo(() => layoutStages(scene, words, fps, durationInFrames), [scene, words, fps, durationInFrames]);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.palette.background }}>
      <Surface theme={theme} />
      {stages.map((s, i) => (
        <Sequence key={s.stage.id + i} from={s.from} durationInFrames={s.len} name={`stage:${s.stage.id}`} layout="none">
          <StageView stage={s.stage} theme={theme} words={words} fps={fps} stageFrom={s.from} fadeIn={s.fadeIn} fadeOut={s.fadeOut} visibleLen={s.visibleLen} seedBase={i * 1000} />
        </Sequence>
      ))}
      <Chrome theme={theme} chrome={scene.chrome} durationInFrames={durationInFrames} />
      <Captions theme={theme} words={words} overrides={scene.captions} fps={fps} />
      {media.voice ? <Audio src={staticFile(media.voice)} /> : null}
      {media.music ? <Audio src={staticFile(media.music)} loop volume={(f) => musicVolume(f, words, fps, scene.audio.musicGain ?? 0.12)} /> : null}
    </AbsoluteFill>
  );
};

/** Music gain envelope: ducks to 45 % while words are being spoken, with soft 0.25 s ramps. */
export function musicVolume(frame: number, words: Word[], fps: number, gain: number): number {
  const t = frame / fps;
  const ramp = 0.25;
  let duck = 0;
  for (const w of words) {
    if (t < w.s - ramp) break;
    if (t <= w.e + ramp) {
      const d = t < w.s ? 1 - (w.s - t) / ramp : t > w.e ? 1 - (t - w.e) / ramp : 1;
      duck = Math.max(duck, d);
    }
  }
  const fadeIn = Math.min(1, t / 1.0);
  return gain * fadeIn * lerp(1, 0.45, duck);
}

interface StageLayout {
  stage: Stage;
  from: number;
  len: number;
  visibleLen: number;
  fadeIn: number;
  fadeOut: number;
}

export function layoutStages(scene: Scene, words: Word[], fps: number, total: number): StageLayout[] {
  const xf = Math.round(RULES.maxCrossfade * fps);
  return scene.stages.map((stage, i) => {
    const from = cueToFrame(stage.from, words, fps);
    const isLast = i === scene.stages.length - 1;
    const next = scene.stages[i + 1];
    const to = isLast ? total : cueToFrame(stage.to, words, fps);
    const fadeIn = i === 0 || stage.cut ? 0 : xf;
    const fadeOut = isLast || next?.cut ? 0 : xf;
    const len = Math.max(1, Math.min(total - from, to - from + fadeOut));
    return { stage, from, len, visibleLen: to - from, fadeIn, fadeOut };
  });
}

const StageView: React.FC<{
  stage: Stage;
  theme: ThemeTokens;
  words: Word[];
  fps: number;
  stageFrom: number;
  fadeIn: number;
  fadeOut: number;
  visibleLen: number;
  seedBase: number;
}> = ({ stage, theme, words, fps, stageFrom, fadeIn, fadeOut, visibleLen, seedBase }) => {
  const frame = useCurrentFrame();
  const cue = (c: Cue) => cueToFrame(c, words, fps) - stageFrom;
  let opacity = 1;
  if (fadeIn > 0) opacity *= progress(frame, 0, fadeIn, EASE_IN_OUT);
  if (fadeOut > 0) opacity *= 1 - progress(frame, visibleLen, fadeOut, EASE_IN_OUT);

  const cam = stage.camera;
  const camT = progress(frame, 0, Math.max(1, visibleLen), (t) => t);
  const tx = cam?.pan ? lerp(cam.pan[0], cam.pan[2], camT) : 0;
  const ty = cam?.pan ? lerp(cam.pan[1], cam.pan[3], camT) : 0;
  const sc = cam?.push ? 1 + cam.push * camT : 1;

  const resolve = (m: SceneElement["enter"] | SceneElement["exit"], isDraw: boolean): Motion | null => {
    if (!m) return null;
    const kind = enterKindOf(m);
    const defDur = kind === "draw" || isDraw ? theme.motion.drawDur : theme.motion.enterDur;
    return { kind, start: cue(m[kind] as Cue), dur: Math.round((m.dur ?? defDur) * fps) };
  };

  return (
    <AbsoluteFill style={{ opacity, transform: `translate(${tx}px, ${ty}px) scale(${sc})`, transformOrigin: "50% 45%" }}>
      {stage.elements.map((el, i) => {
        const Comp = PRIMITIVES[el.type] as React.FC<any>;
        let enter = resolve(el.enter, false);
        if (!enter && el.type === "counter") enter = { kind: "fade", start: cue(el.at), dur: Math.round(theme.motion.enterDur * fps) };
        const exit = resolve(el.exit, false);
        let targetBox: Box | undefined;
        if (el.type === "strike") {
          const t = stage.elements.find((o) => o.id === el.target);
          if (t && "x" in t && "y" in t) {
            const tw = "w" in t && typeof t.w === "number" ? t.w : 400;
            const th = "h" in t && typeof t.h === "number" ? t.h : 120;
            targetBox = { x: t.x, y: t.y, w: el.w ?? tw, h: el.h ?? th };
          }
        }
        return <Comp key={el.id ?? i} el={el} theme={theme} enter={enter} exit={exit} cue={cue} fps={fps} targetBox={targetBox} seed={seedBase + i} />;
      })}
    </AbsoluteFill>
  );
};

export const calculateExplainerMetadata = ({ props }: { props: ExplainerProps }) => {
  const fps = props.scene.fps ?? 30;
  return { durationInFrames: totalDurationInFrames(props.words, fps), fps, width: 1080, height: 1920 };
};

// Exposed for tests / tooling.
export { interpolate };
