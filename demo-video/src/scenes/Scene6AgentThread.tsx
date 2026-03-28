/**
 * Scene 6 — The Agent Thread (90–120s, frames 2700–3600)
 * Reasoning chain steps animating in
 */
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONTS } from '../types';
import { Chip, FadeIn, GridBg, NeonLine, ScanLine, SectionLabel } from '../components/Atoms';

const REASONING_STEPS = [
  {
    step: 1,
    text: 'Examined EIA Drilling Productivity Report — Permian Basin output up 4.2% YoY, but rig count declining.',
    evidence: ['PDF', 'EIA'],
    color: COLORS.secondary,
    delay: 10,
  },
  {
    step: 2,
    text: 'Cross-referenced live weather from Open-Meteo — 38°C sustained heat stress event, ERCOT demand spike.',
    evidence: ['WEATHER', 'LIVE'],
    color: COLORS.warn,
    delay: 50,
  },
  {
    step: 3,
    text: 'Matched PHMSA pipeline incident database — 3 reportable events within 50km radius in 18 months.',
    evidence: ['REGULATORY', 'PDF'],
    color: COLORS.danger,
    delay: 90,
  },
  {
    step: 4,
    text: 'Queried USGS induced seismicity catalog — 17 M3.2+ events correlated with saltwater injection wells.',
    evidence: ['USGS', 'DEM'],
    color: COLORS.warn,
    delay: 130,
  },
  {
    step: 5,
    text: 'Retrieved NASA MODIS thermal anomaly data — 4 flaring events detected at asset coordinates.',
    evidence: ['SATELLITE', 'NASA'],
    color: COLORS.secondary,
    delay: 170,
  },
  {
    step: 6,
    text: 'Synthesized all vectors via GPT-5.4 Pro — composite risk 8.2/10. Dominant factor: ERCOT grid reliability.',
    evidence: ['MODEL', 'SYNTHESIS'],
    color: COLORS.accent,
    delay: 210,
  },
];

const ReasoningStep: React.FC<{
  step: number;
  text: string;
  evidence: string[];
  color: string;
  delay: number;
}> = ({ step, text, evidence, color, delay }) => {
  const frame = useCurrentFrame();

  const appear = interpolate(frame - delay, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const slideX = interpolate(frame - delay, [0, 20], [-40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Text reveal
  const textProgress = interpolate(frame - delay - 10, [0, 40], [0, text.length], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const visibleText = text.slice(0, Math.floor(textProgress));

  return (
    <div
      style={{
        opacity: appear,
        transform: `translateX(${slideX}px)`,
        display: 'flex',
        gap: 20,
        marginBottom: 20,
        padding: '16px 20px',
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.cardBorder}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 4,
      }}
    >
      {/* Step number */}
      <div
        style={{
          flexShrink: 0,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: `${color}20`,
          border: `1px solid ${color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONTS.mono,
          fontSize: 14,
          color,
          fontWeight: 700,
          marginTop: 2,
        }}
      >
        {step}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 15,
            color: COLORS.text,
            lineHeight: 1.6,
            minHeight: 24,
          }}
        >
          {visibleText}
          {textProgress < text.length && (
            <span style={{ opacity: frame % 16 < 8 ? 1 : 0, color }}>▌</span>
          )}
        </div>

        {/* Evidence chips */}
        {frame > delay + 45 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {evidence.map((e, i) => (
              <span
                key={e}
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 11,
                  color,
                  background: `${color}15`,
                  border: `1px solid ${color}40`,
                  padding: '2px 10px',
                  borderRadius: 3,
                  letterSpacing: '0.12em',
                  opacity: interpolate(frame - delay - 45 - i * 8, [0, 12], [0, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  }),
                }}
              >
                {e}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const Scene6AgentThread: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: 'hidden' }}>
      <GridBg opacity={0.1} />
      <ScanLine />
      <SectionLabel label="05 / AGENT REASONING" />

      <AbsoluteFill
        style={{
          paddingLeft: 80,
          paddingRight: 80,
          paddingTop: 90,
          paddingBottom: 60,
          overflowY: 'hidden',
        }}
      >
        {/* Header */}
        <FadeIn delay={0}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 20,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 42,
                fontWeight: 900,
                color: COLORS.text,
              }}
            >
              Agent Reasoning Chain
            </div>
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 15,
                color: COLORS.accent,
                letterSpacing: '0.1em',
              }}
            >
              GULF COAST OIL OPERATOR
            </div>
          </div>
        </FadeIn>

        <NeonLine delay={5} style={{ marginBottom: 28 }} />

        {/* Reasoning steps */}
        {REASONING_STEPS.map((s) => (
          <ReasoningStep
            key={s.step}
            step={s.step}
            text={s.text}
            evidence={s.evidence}
            color={s.color}
            delay={s.delay}
          />
        ))}

        {/* Final verdict */}
        <FadeIn delay={270}>
          <div
            style={{
              marginTop: 10,
              padding: '20px 24px',
              background: `${COLORS.accent}10`,
              border: `1px solid ${COLORS.accent}50`,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              boxShadow: `0 0 30px ${COLORS.accent}20`,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 28,
                color: COLORS.accent,
                fontWeight: 700,
                textShadow: `0 0 20px ${COLORS.accent}60`,
              }}
            >
              8.2 / 10
            </div>
            <div>
              <div
                style={{
                  fontFamily: FONTS.display,
                  fontSize: 18,
                  color: COLORS.text,
                  fontWeight: 700,
                }}
              >
                Composite Risk Score
              </div>
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 13,
                  color: COLORS.dimText,
                  marginTop: 4,
                }}
              >
                $48M–$360M annualized exposure · ERCOT grid reliability dominant vector
              </div>
            </div>
          </div>
        </FadeIn>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
