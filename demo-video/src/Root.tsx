import React from 'react';
import { Composition, Series } from 'remotion';
import { Scene1Title } from './scenes/Scene1Title';
import { Scene2Problem } from './scenes/Scene2Problem';
import { Scene3Solution } from './scenes/Scene3Solution';
import { Scene4Orchestration } from './scenes/Scene4Orchestration';
import { Scene5RiskMap } from './scenes/Scene5RiskMap';
import { Scene6AgentThread } from './scenes/Scene6AgentThread';
import { Scene7TechStack } from './scenes/Scene7TechStack';
import { Scene8CTA } from './scenes/Scene8CTA';

const FPS = 30;

// Scene durations in seconds → frames
const SCENES = {
  title: 5 * FPS,        // 0–5s    (150 frames)
  problem: 10 * FPS,     // 5–15s   (300 frames)
  solution: 15 * FPS,    // 15–30s  (450 frames)
  orchestration: 30 * FPS, // 30–60s (900 frames)
  riskMap: 30 * FPS,     // 60–90s  (900 frames)
  agentThread: 30 * FPS, // 90–120s (900 frames)
  techStack: 30 * FPS,   // 120–150s(900 frames)
  cta: 30 * FPS,         // 150–180s(900 frames)
};

const TOTAL_FRAMES =
  SCENES.title +
  SCENES.problem +
  SCENES.solution +
  SCENES.orchestration +
  SCENES.riskMap +
  SCENES.agentThread +
  SCENES.techStack +
  SCENES.cta;

// Full 3-minute trailer — all scenes as a Series
const MainVideo: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={SCENES.title}>
        <Scene1Title />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.problem}>
        <Scene2Problem />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.solution}>
        <Scene3Solution />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.orchestration}>
        <Scene4Orchestration />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.riskMap}>
        <Scene5RiskMap />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.agentThread}>
        <Scene6AgentThread />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.techStack}>
        <Scene7TechStack />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.cta}>
        <Scene8CTA />
      </Series.Sequence>
    </Series>
  );
};

// Register compositions
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Full 3-minute trailer */}
      <Composition
        id="Main"
        component={MainVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* Individual scenes for quick iteration */}
      <Composition
        id="Scene1-Title"
        component={Scene1Title}
        durationInFrames={SCENES.title}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene2-Problem"
        component={Scene2Problem}
        durationInFrames={SCENES.problem}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene3-Solution"
        component={Scene3Solution}
        durationInFrames={SCENES.solution}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene4-Orchestration"
        component={Scene4Orchestration}
        durationInFrames={SCENES.orchestration}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene5-RiskMap"
        component={Scene5RiskMap}
        durationInFrames={SCENES.riskMap}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene6-AgentThread"
        component={Scene6AgentThread}
        durationInFrames={SCENES.agentThread}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene7-TechStack"
        component={Scene7TechStack}
        durationInFrames={SCENES.techStack}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene8-CTA"
        component={Scene8CTA}
        durationInFrames={SCENES.cta}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
