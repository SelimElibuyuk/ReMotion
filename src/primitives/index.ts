// type -> component map. One file per primitive.
import type { ElementType } from "../schema/scene";
import { ArrowPrim } from "./Arrow";
import { BarChartPrim } from "./BarChart";
import { CounterPrim } from "./Counter";
import { DotsPrim } from "./Dots";
import { DrawPathPrim } from "./DrawPath";
import { MeterPrim } from "./Meter";
import { PanelPrim } from "./Panel";
import { StrikeCheckPrim } from "./StrikeCheck";
import { SvgAssetPrim } from "./SvgAsset";
import { TagPrim } from "./Tag";
import { TextTypePrim } from "./TextType";
import { TimelinePrim } from "./Timeline";
import type { Primitive } from "./types";

export const PRIMITIVES: { [T in ElementType]: Primitive<T> } = {
  svg: SvgAssetPrim,
  tag: TagPrim,
  counter: CounterPrim,
  text: TextTypePrim,
  path: DrawPathPrim,
  panel: PanelPrim,
  arrow: ArrowPrim,
  strike: StrikeCheckPrim,
  barchart: BarChartPrim,
  timeline: TimelinePrim,
  meter: MeterPrim,
  dots: DotsPrim,
};
