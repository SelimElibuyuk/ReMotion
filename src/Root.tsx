import React from "react";
import { Composition } from "remotion";
import demoScene from "../examples/demo-scene/project/scene.json";
import demoWords from "../examples/demo-scene/project/words.json";
import { Explainer, calculateExplainerMetadata } from "./Explainer";
import { ExplainerPropsSchema, type ExplainerProps } from "./schema/scene";

const defaultProps: ExplainerProps = {
  scene: ExplainerPropsSchema.shape.scene.parse(demoScene),
  words: demoWords,
  media: { voice: "media/demo-scene/voice.wav", music: null },
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Explainer"
    component={Explainer}
    schema={ExplainerPropsSchema}
    defaultProps={defaultProps}
    calculateMetadata={calculateExplainerMetadata}
    durationInFrames={300}
    fps={30}
    width={1080}
    height={1920}
  />
);
