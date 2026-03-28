/**
 * Scene 4 — The Orchestration (30–60s, frames 900–1800)
 * System nodes lighting up, agents activating
 */
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../types';
import { FadeIn, GridBg, PulseDot, ScanLine, SectionLabel, SlideUp } from '../components/Atoms';

interface Agent {
  id: string;
  label: string;
  role: string;
  color: string;
  activateAt: number;
  x: number;
  y: number;
}

const AGENTS: Agent[] = [
  { id: 'orchestrator', label: 'ORCHESTRATOR', role: 'master coordinator', color: COLORS.accent, activateAt: 0, x: 50, y: 45 },
  { id: 'senso', label: 'SENSO RAG', role: 'knowledge retrieval', color: COLORS.secondary, activateAt: 20, x: 20, y: 20 },
  { id: 'weather', label: 'OPEN-METEO', role: 'live weather feed', color: COLORS.secondary, activateAt: 30, x: 80, y: 20 },
  { id: 'usgs', label: 'USGS', role: 'seismic + geological', color: COLORS.warn, activateAt: 45, x: 10, y: 70 },
  { id: 'nasa', label: 'NASA EARTHDATA', role: 'satellite imagery', color: COLORS.warn, activateAt: 55, x: 90, y: 70 },
  { id: 'eia', label: 'EIA', role: 'energy data', color: COLORS.secondary, activateAt: 65, x: 35, y: 80 },
  { id: 'phmsa', label: 'PHMSA', role: 'regulatory filings', color: COLORS.danger, activateAt: 75, x: 65, y: 80 },
  { id: 'model', label: 'GPT-5.4 Pro', role: 'deep analysis model', color: COLORS.accent, activateAt: 90, x: 50, y: 20 },
];

const AgentNode: React.FC<{ agent: Agent }> = ({ agent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activateProgress = spring({
    frame: frame - agent.activateAt,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const opacity = interpolate(activateProgress, [0, 1], [0, 1]);
  const scale = interpolate(activateProgress, [0, 1], [0.3, 1]);
  const isActive = frame > agent.activateAt;
  const pulse = isActive ? Math.sin((frame - agent.activateAt) * 0.08) * 0.3 + 0.7 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${agent.x}%`,
        top: `${agent.y}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {/* Node circle */}
      <div
        style={{
          width: agent.id === 'orchestrator' ? 70 : 50,
          height: agent.id === 'orchestrator' ? 70 : 50,
          borderRadius: '50%',
          background: `${agent.color}20`,
          border: `2px solid ${agent.color}`,
          boxShadow: `0 0 ${20 * pulse}px ${agent.color}80, 0 0 ${40 * pulse}px ${agent.color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: agent.id === 'orchestrator' ? 20 : 14,
            height: agent.id === 'orchestrator' ? 20 : 14,
            borderRadius: '50%',
            background: agent.color,
            boxShadow: `0 0 10px ${agent.color}`,
          }}
        />
      </div>
      {/* Label */}
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: agent.id === 'orchestrator' ? 13 : 11,
          color: agent.color,
          letterSpacing: '0.1em',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          textShadow: `0 0 8px ${agent.color}60`,
        }}
      >
        {agent.label}
      </div>
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 10,
          color: COLORS.dimText,
          letterSpacing: '0.08em',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        {agent.role}
      </div>
    </div>
  );
};

// Connection line between orchestrator and agent
const ConnectionLine: React.FC<{
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  delay: number;
}> = ({ fromX, fromY, toX, toY, color, delay }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // We calculate the line as SVG
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);

  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
      viewBox="0 0 1920 1080"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id={`grad-${delay}`}
          x1={`${fromX}%`}
          y1={`${fromY}%`}
          x2={`${toX}%`}
          y2={`${toY}%`}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.8" />
          <stop offset="100%" stopColor={color} stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <line
        x1={`${fromX}%`}
        y1={`${fromY}%`}
        x2={`${fromX + (toX - fromX) * progress}%`}
        y2={`${fromY + (toY - fromY) * progress}%`}
        stroke={`url(#grad-${delay})`}
        strokeWidth="1.5"
        strokeDasharray="6 4"
        opacity={0.6}
      />
    </svg>
  );
};

export const Scene4Orchestration: React.FC = () => {
  const frame = useCurrentFrame();

  // Count active agents
  const activeCount = AGENTS.filter((a) => frame > a.activateAt + 10).length;

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: 'hidden' }}>
      <GridBg opacity={0.12} />
      <ScanLine />
      <SectionLabel label="03 / ORCHESTRATION" />

      {/* Header text */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <FadeIn delay={0}>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 52,
              fontWeight: 900,
              color: COLORS.text,
              textAlign: 'center',
            }}
          >
            {activeCount} data sources queried{' '}
            <span style={{ color: COLORS.accent }}>in parallel</span>
          </div>
        </FadeIn>
      </div>

      {/* Connection lines (render before nodes so nodes appear on top) */}
      {AGENTS.filter((a) => a.id !== 'orchestrator').map((agent) => (
        <ConnectionLine
          key={agent.id}
          fromX={50}
          fromY={45}
          toX={agent.x}
          toY={agent.y}
          color={agent.color}
          delay={agent.activateAt - 10}
        />
      ))}

      {/* Agent nodes */}
      {AGENTS.map((agent) => (
        <AgentNode key={agent.id} agent={agent} />
      ))}

      {/* Bottom status cards */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 60,
          right: 60,
          display: 'flex',
          gap: 16,
        }}
      >
        {[
          { label: 'MODEL ROUTER', value: 'GPT-5.4 Pro selected', color: COLORS.accent, delay: 100 },
          { label: 'QUERIES FIRED', value: `${Math.min(activeCount * 3, 18)} requests`, color: COLORS.secondary, delay: 110 },
          { label: 'LATENCY', value: '~2.3 s avg', color: COLORS.warn, delay: 120 },
          { label: 'RISK VECTORS', value: '6 active', color: COLORS.danger, delay: 130 },
        ].map((card) => (
          <FadeIn key={card.label} delay={card.delay} style={{ flex: 1 }}>
            <div
              style={{
                padding: '12px 16px',
                background: COLORS.cardBg,
                border: `1px solid ${card.color}30`,
                borderTop: `2px solid ${card.color}`,
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 11,
                  color: COLORS.dimText,
                  letterSpacing: '0.15em',
                  marginBottom: 6,
                }}
              >
                {card.label}
              </div>
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 16,
                  color: card.color,
                  letterSpacing: '0.05em',
                }}
              >
                {card.value}
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </AbsoluteFill>
  );
};
