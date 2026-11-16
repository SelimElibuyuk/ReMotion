// Inline single-colour line-art asset, recoloured to a theme tone; supports stroke draw-on.
import React, { useMemo } from "react";
import { getAsset, hasAsset } from "../assets/registry";
import { toneColor } from "../themes/types";
import { useMotion } from "../timing/motion";
import { Positioned } from "./shared";
import type { Primitive } from "./types";

const SHAPES = "path,line,polyline,polygon,circle,rect,ellipse";
const SHAPE_TAG = /<(path|line|polyline|polygon|circle|rect|ellipse)\b([^>]*?)(\/?)>/gi;

/** Adds pathLength=1 to shapes and marks shapes (or groups) that carry a non-none fill. */
function prepareSvg(raw: string): string {
  let svg = raw.replace(/<svg\b([^>]*)>/i, (_all, attrs: string) => {
    const cleaned = attrs.replace(/\s(width|height)="[^"]*"/gi, "");
    return `<svg${cleaned} width="100%" height="100%">`;
  });
  const hasFill = (attrs: string) => {
    const a = /\sfill="([^"]*)"/i.exec(attrs);
    const s = /style="[^"]*\bfill\s*:\s*([^;"]*)/i.exec(attrs);
    const v = (a?.[1] ?? s?.[1] ?? "").trim().toLowerCase();
    return v !== "" && v !== "none" && v !== "transparent";
  };
  svg = svg.replace(/<g\b([^>]*)>/gi, (all, attrs: string) => (hasFill(attrs) ? `<g${attrs} data-filled="1">` : all));
  svg = svg.replace(SHAPE_TAG, (_all, tag: string, attrs: string, close: string) => {
    const extra = (/\spathLength=/i.test(attrs) ? "" : ' pathLength="1"') + (hasFill(attrs) ? ' data-filled="1"' : "");
    return `<${tag}${attrs}${extra}${close}>`;
  });
  return svg;
}

export const SvgAssetPrim: Primitive<"svg"> = ({ el, theme, enter, exit, seed }) => {
  const m = useMotion(enter, exit);
  const known = hasAsset(el.asset);
  const markup = useMemo(() => (known ? prepareSvg(getAsset(el.asset)) : ""), [known, el.asset]);
  if (!m.visible) return null;
  if (!known) {
    console.warn(`SvgAsset: unknown asset "${el.asset}"`);
    return null;
  }
  const color = toneColor(theme, el.tint, "ink");
  const cls = `svgasset-${String(seed).replace(/[^\w]/g, "_")}`;
  const drawing = enter?.kind === "draw" || exit?.kind === "draw";
  const fillOpacity = Math.min(1, Math.max(0, (m.draw - 0.7) / 0.3));
  // Keep the on-screen stroke at theme.stroke.width regardless of the asset's 1000-unit viewBox.
  const strokeWidth = (theme.stroke.width * 1000) / el.w;
  const css =
    `.${cls} :is(${SHAPES}){fill:none;stroke:${color};stroke-width:${strokeWidth};stroke-linecap:${theme.stroke.cap};stroke-linejoin:${theme.stroke.join}}` +
    `.${cls} :is(${SHAPES})[stroke="none"]{stroke:none}` +
    `.${cls} [data-filled]:is(${SHAPES}),.${cls} [data-filled] :is(${SHAPES}){fill:${color}${drawing ? `;fill-opacity:${fillOpacity}` : ""}}` +
    (drawing
      ? `.${cls} :is(${SHAPES}){stroke-dasharray:1;stroke-dashoffset:${1 - m.draw}${m.draw <= 0 ? ";opacity:0" : ""}}`
      : "");
  return (
    <Positioned x={el.x} y={el.y} m={m} w={el.w} h={el.w}>
      <style>{css}</style>
      <div className={cls} style={{ width: el.w, height: el.w, color }} dangerouslySetInnerHTML={{ __html: markup }} />
    </Positioned>
  );
};
