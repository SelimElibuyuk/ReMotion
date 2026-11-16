// Full-frame background: base colour + theme texture + vignette. Static and deterministic (no animation, no Math.random).
import React from "react";
import { AbsoluteFill } from "remotion";
import { CANVAS } from "../schema/scene";
import type { ThemeTokens } from "../themes/types";

const W = CANVAS.width;
const H = CANVAS.height;

/** "#rrggbb" + alpha -> rgba(). Falls back to the input for non-hex colours. */
function rgba(hex: string, a: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const Paper: React.FC<{ theme: ThemeTokens }> = ({ theme }) => (
  <AbsoluteFill>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id="paper-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.16  0 0 0 0 0.07  0 0 0 0.9 -0.28" />
        </filter>
        <filter id="paper-fibre" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="21" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.38  0 0 0 0 0.15  0 0 0 0.7 -0.22" />
        </filter>
        <radialGradient id="blot1" cx="22%" cy="18%" r="45%">
          <stop offset="0" stopColor="#c9a46a" stopOpacity="0.28" />
          <stop offset="1" stopColor="#c9a46a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="blot2" cx="82%" cy="70%" r="50%">
          <stop offset="0" stopColor="#b88a52" stopOpacity="0.22" />
          <stop offset="1" stopColor="#b88a52" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="blot3" cx="35%" cy="92%" r="35%">
          <stop offset="0" stopColor="#a87a45" stopOpacity="0.18" />
          <stop offset="1" stopColor="#a87a45" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#blot1)" />
      <rect width={W} height={H} fill="url(#blot2)" />
      <rect width={W} height={H} fill="url(#blot3)" />
      <rect width={W} height={H} filter="url(#paper-fibre)" opacity="0.18" />
      <rect width={W} height={H} filter="url(#paper-grain)" opacity="0.55" />
      {/* index-card details: a red head rule and faint ruled lines */}
      <line x1={0} x2={W} y1={196} y2={196} stroke={rgba(theme.palette.accent, 0.35)} strokeWidth={3} />
    </svg>
  </AbsoluteFill>
);

const Grid: React.FC<{ theme: ThemeTokens }> = ({ theme }) => {
  const ink = theme.palette.ink;
  const ticksX: React.ReactNode[] = [];
  const ticksY: React.ReactNode[] = [];
  for (let x = 40; x < W; x += 40) {
    const major = x % 200 === 0;
    const len = major ? 34 : 16;
    ticksX.push(<line key={`t${x}`} x1={x} x2={x} y1={0} y2={len} />);
    ticksX.push(<line key={`b${x}`} x1={x} x2={x} y1={H} y2={H - len} />);
  }
  for (let y = 40; y < H; y += 40) {
    const major = y % 200 === 0;
    const len = major ? 34 : 16;
    ticksY.push(<line key={`l${y}`} x1={0} x2={len} y1={y} y2={y} />);
    ticksY.push(<line key={`r${y}`} x1={W} x2={W - len} y1={y} y2={y} />);
  }
  return (
    <AbsoluteFill>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="grid-minor" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={rgba(ink, 0.07)} strokeWidth="1.5" />
          </pattern>
          <pattern id="grid-major" width="200" height="200" patternUnits="userSpaceOnUse">
            <path d="M 200 0 L 0 0 0 200" fill="none" stroke={rgba(ink, 0.16)} strokeWidth="2.5" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid-minor)" />
        <rect width={W} height={H} fill="url(#grid-major)" />
        <g stroke={rgba(ink, 0.4)} strokeWidth={2}>
          {ticksX}
          {ticksY}
        </g>
        <rect x={20} y={20} width={W - 40} height={H - 40} fill="none" stroke={rgba(ink, 0.18)} strokeWidth={2} />
      </svg>
    </AbsoluteFill>
  );
};

const Scanlines: React.FC<{ theme: ThemeTokens }> = ({ theme }) => (
  <>
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${rgba(theme.palette.ink, 0.09)} 0%, transparent 65%)` }} />
    <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.30) 0px, rgba(0,0,0,0.30) 2px, transparent 2px, transparent 4px)" }} />
  </>
);

const Halftone: React.FC<{ theme: ThemeTokens }> = ({ theme }) => {
  const dot = rgba(theme.palette.ink, 1);
  const mask = "linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.9) 100%)";
  return (
    <>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, ${dot} 0 2.4px, transparent 3px)`,
          backgroundSize: "18px 18px",
          opacity: 0.09,
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, ${dot} 0 1.6px, transparent 2.2px)`,
          backgroundSize: "12px 12px",
          backgroundPosition: "6px 6px",
          opacity: 0.06,
          WebkitMaskImage: "linear-gradient(to top, transparent 55%, black 100%)",
          maskImage: "linear-gradient(to top, transparent 55%, black 100%)",
        }}
      />
    </>
  );
};

export const Surface: React.FC<{ theme: ThemeTokens }> = ({ theme }) => {
  const tex = theme.surface.texture;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.palette.background }}>
      {tex === "paper" ? <Paper theme={theme} /> : null}
      {tex === "grid" ? <Grid theme={theme} /> : null}
      {tex === "scanlines" ? <Scanlines theme={theme} /> : null}
      {tex === "halftone" ? <Halftone theme={theme} /> : null}
      {theme.surface.vignette > 0 ? (
        <AbsoluteFill
          style={{ background: `radial-gradient(ellipse 75% 70% at 50% 48%, transparent 45%, rgba(0,0,0,${(theme.surface.vignette * 0.75).toFixed(3)}) 100%)` }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
