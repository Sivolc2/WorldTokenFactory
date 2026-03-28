/**
 * Scene 7 — Tech Stack (120–150s, frames 3600–4500)
 * Sponsor/tech logos flying in with descriptions
 */
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../types';
import { FadeIn, GridBg, NeonLine, ScanLine, SectionLabel } from '../components/Atoms';

const STACK = [
  {
    name: 'Railtracks',
    role: 'Multi-agent orchestration framework',
    tag: 'ORCHESTRATION',
    color: COLORS.accent,
    delay: 10,
  },
  {
    name: 'Senso',
    role: 'RAG knowledge base & semantic retrieval',
    tag: 'RAG / MEMORY',
    color: COLORS.secondary,
    delay: 30,
  },
  {
    name: 'DigitalOcean Gradient',
    role: 'AI inference — 39 models including GPT-5.4 Pro',
    tag: 'AI INFERENCE',
    color: '#0080ff',
    delay: 50,
  },
  {
    name: 'Unkey',
    role: 'API key management & rate limiting',
    tag: 'API SECURITY',
    color: COLORS.warn,
    delay: 70,
  },
  {
    name: 'NASA EarthData',
    role: 'MODIS satellite thermal anomaly data',
    tag: 'SATELLITE',
    color: '#ff6600',
    delay: 90,
  },
  {
    name: 'USGS API',
    role: 'Seismic catalog & induced earthquake data',
    tag: 'GEOLOGICAL',
    color: COLORS.warn,
    delay: 110,
  },
  {
    name: 'Open-Meteo',
    role: 'Live weather feed — no API key required',
    tag: 'WEATHER',
    color: COLORS.secondary,
    delay: 130,
  },
  {
    name: 'EIA / PHMSA',
    role: 'Energy & pipeline regulatory filings',
    tag: 'REGULATORY',
    color: COLORS.danger,
    delay: 150,
  },
  {
    name: 'Next.js 15',
    role: 'App framework — React Server Components',
    tag: 'FRONTEND',
    color: COLORS.text,
    delay: 170,
  },
  {
    name: 'PostgreSQL + pgvector',
    role: 'Persistent storage + vector similarity search',
    tag: 'DATABASE',
    color: '#336791',
    delay: 190,
  },
];

const StackCard: React.FC<{
  name: string;
  role: string;
  tag: string;
  color: string;
  delay: number;
  index: number;
}> = ({ name, role, tag, color, delay, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 16, stiffness: 120 },
  });

  // Alternate: odd fly from right, even from left
  const fromX = index % 2 === 0 ? -80 : 80;
  const slideX = interpolate(progress, [0, 1], [fromX, 0]);
  const opacity = interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${slideX}px)`,
        padding: '14px 20px',
        background: COLORS.cardBg,
        border: `1px solid ${color}25`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      {/* Tag */}
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 10,
          color,
          letterSpacing: '0.15em',
          background: `${color}15`,
          padding: '3px 10px',
          borderRadius: 3,
          border: `1px solid ${color}30`,
          whiteSpace: 'nowrap',
          minWidth: 110,
          textAlign: 'center',
        }}
      >
        {tag}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 16,
            color: COLORS.text,
            fontWeight: 700,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 12,
            color: COLORS.dimText,
            marginTop: 2,
          }}
        >
          {role}
        </div>
      </div>

      {/* Status dot */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}`,
          opacity: 0.7 + Math.sin(frame * 0.1 + index) * 0.3,
        }}
      />
    </div>
  );
};

export const Scene7TechStack: React.FC = () => {
  const frame = useCurrentFrame();

  // Split stack into two columns
  const left = STACK.filter((_, i) => i % 2 === 0);
  const right = STACK.filter((_, i) => i % 2 !== 0);

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: 'hidden' }}>
      <GridBg opacity={0.1} />
      <ScanLine />
      <SectionLabel label="06 / TECHNOLOGY STACK" />

      <AbsoluteFill style={{ paddingLeft: 60, paddingRight: 60, paddingTop: 80 }}>
        {/* Header */}
        <FadeIn delay={0}>
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 48,
                fontWeight: 900,
                color: COLORS.text,
              }}
            >
              Built on the{' '}
              <span style={{ color: COLORS.accent, textShadow: `0 0 30px ${COLORS.accent}50` }}>
                best tools
              </span>{' '}
              for the job.
            </div>
          </div>
        </FadeIn>

        <NeonLine delay={10} style={{ marginBottom: 28 }} />

        {/* Two-column grid */}
        <div style={{ display: 'flex', gap: 24 }}>
          {/* Left column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {left.map((item, i) => (
              <StackCard
                key={item.name}
                name={item.name}
                role={item.role}
                tag={item.tag}
                color={item.color}
                delay={item.delay}
                index={i * 2}
              />
            ))}
          </div>

          {/* Right column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {right.map((item, i) => (
              <StackCard
                key={item.name}
                name={item.name}
                role={item.role}
                tag={item.tag}
                color={item.color}
                delay={item.delay}
                index={i * 2 + 1}
              />
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
