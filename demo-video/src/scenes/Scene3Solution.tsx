/**
 * Scene 3 — The Solution (15–30s, frames 450–900)
 * Account picker + decomposition UI
 */
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../types';
import { FadeIn, GridBg, NeonLine, ScanLine, ScaleIn, SectionLabel, SlideUp, Typewriter } from '../components/Atoms';

const BusinessCard: React.FC<{
  name: string;
  sector: string;
  selected?: boolean;
  delay: number;
}> = ({ name, sector, selected, delay }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        opacity,
        padding: '16px 20px',
        background: selected ? `${COLORS.accent}15` : COLORS.cardBg,
        border: `1px solid ${selected ? COLORS.accent : COLORS.cardBorder}`,
        borderRadius: 6,
        marginBottom: 10,
        cursor: 'default',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: selected ? `0 0 20px ${COLORS.accent}30` : 'none',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 6,
          background: selected ? COLORS.accent : COLORS.cardBorder,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONTS.mono,
          fontSize: 16,
          color: selected ? COLORS.bg : COLORS.dimText,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {name[0]}
      </div>
      <div>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 16,
            color: selected ? COLORS.accent : COLORS.text,
            fontWeight: 600,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 12,
            color: COLORS.dimText,
            letterSpacing: '0.1em',
            marginTop: 2,
          }}
        >
          {sector}
        </div>
      </div>
      {selected && (
        <div
          style={{
            marginLeft: 'auto',
            fontFamily: FONTS.mono,
            fontSize: 11,
            color: COLORS.accent,
            letterSpacing: '0.15em',
          }}
        >
          SELECTED ●
        </div>
      )}
    </div>
  );
};

const RiskFactor: React.FC<{ label: string; delay: number; weight: number }> = ({
  label,
  delay,
  weight,
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, 40], [0, weight], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const color = weight > 0.7 ? COLORS.danger : weight > 0.4 ? COLORS.warn : COLORS.accent;

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: FONTS.mono,
          fontSize: 13,
          color: COLORS.text,
          marginBottom: 6,
        }}
      >
        <span>{label}</span>
        <span style={{ color }}>{Math.round(progress * 100)}%</span>
      </div>
      <div
        style={{
          height: 4,
          background: COLORS.cardBorder,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: color,
            boxShadow: `0 0 8px ${color}60`,
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
};

export const Scene3Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: 'hidden' }}>
      <GridBg opacity={0.15} />
      <ScanLine />
      <SectionLabel label="02 / THE SOLUTION" />

      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 80,
          paddingRight: 80,
          paddingTop: 60,
          gap: 60,
        }}
      >
        {/* Left: Account picker / input */}
        <div style={{ flex: 1 }}>
          <SlideUp delay={0}>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 48,
                fontWeight: 900,
                color: COLORS.text,
                lineHeight: 1.1,
              }}
            >
              Describe your
            </div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 48,
                fontWeight: 900,
                color: COLORS.accent,
                lineHeight: 1.1,
                textShadow: `0 0 30px ${COLORS.accent}50`,
              }}
            >
              business.
            </div>
          </SlideUp>

          <FadeIn delay={20}>
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 18,
                color: COLORS.dimText,
                marginTop: 16,
                marginBottom: 32,
                lineHeight: 1.6,
              }}
            >
              We decompose it into risk factors,
              <br />
              then query every relevant source.
            </div>
          </FadeIn>

          {/* Search / input box */}
          <FadeIn delay={30}>
            <div
              style={{
                padding: '14px 20px',
                background: COLORS.cardBg,
                border: `1px solid ${COLORS.accent}`,
                borderRadius: 6,
                fontFamily: FONTS.mono,
                fontSize: 16,
                color: COLORS.text,
                marginBottom: 20,
                boxShadow: `0 0 20px ${COLORS.accent}20`,
              }}
            >
              <Typewriter
                text="Gulf Coast Oil Operator — upstream E&P"
                delay={40}
                framesPerChar={2}
                style={{ color: COLORS.text }}
              />
            </div>
          </FadeIn>

          {/* Business cards */}
          <BusinessCard
            name="Gulf Coast Oil Operator"
            sector="ENERGY · UPSTREAM E&P · PERMIAN BASIN"
            selected
            delay={60}
          />
          <BusinessCard
            name="Midwest Agricultural Coop"
            sector="AGRICULTURE · GRAIN · ILLINOIS"
            delay={75}
          />
          <BusinessCard
            name="Southeast Utility Grid"
            sector="UTILITIES · TRANSMISSION · FLORIDA"
            delay={90}
          />
        </div>

        {/* Right: Risk factor decomposition */}
        <div style={{ flex: 1 }}>
          <ScaleIn delay={50}>
            <div
              style={{
                padding: '28px 32px',
                background: COLORS.cardBg,
                border: `1px solid ${COLORS.cardBorder}`,
                borderRadius: 8,
                boxShadow: `0 0 40px ${COLORS.accent}10`,
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 12,
                  color: COLORS.accent,
                  letterSpacing: '0.2em',
                  marginBottom: 20,
                }}
              >
                RISK DECOMPOSITION — GULF COAST OIL
              </div>

              <NeonLine delay={60} style={{ marginBottom: 24 }} />

              <RiskFactor label="Hurricane / Extreme Weather" delay={70} weight={0.82} />
              <RiskFactor label="ERCOT Grid Reliability" delay={85} weight={0.76} />
              <RiskFactor label="Induced Seismicity (USGS)" delay={100} weight={0.54} />
              <RiskFactor label="PHMSA Compliance Gaps" delay={115} weight={0.48} />
              <RiskFactor label="Commodity Price Exposure" delay={130} weight={0.63} />
              <RiskFactor label="Water Scarcity / Drought" delay={145} weight={0.39} />

              <FadeIn delay={180}>
                <div
                  style={{
                    marginTop: 20,
                    padding: '12px 16px',
                    background: `${COLORS.accent}10`,
                    border: `1px solid ${COLORS.accent}30`,
                    borderRadius: 4,
                    fontFamily: FONTS.mono,
                    fontSize: 13,
                    color: COLORS.accent,
                  }}
                >
                  ✓ 6 risk vectors identified · querying 7 data sources
                </div>
              </FadeIn>
            </div>
          </ScaleIn>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
