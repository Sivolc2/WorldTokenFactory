/**
 * Scene 2 — The Problem (5–15s, frames 150–450)
 * "Businesses carry risks they can't see"
 */
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../types';
import { FadeIn, GridBg, NeonLine, ScanLine, SectionLabel, SlideUp } from '../components/Atoms';

const problemLines = [
  { text: 'Scattered across', color: COLORS.text },
  { text: 'satellite images,', color: COLORS.warn },
  { text: 'regulatory filings,', color: COLORS.secondary },
  { text: 'seismic records,', color: COLORS.warn },
  { text: 'climate models.', color: COLORS.danger },
];

const DataSource: React.FC<{
  label: string;
  value: string;
  status: 'unknown' | 'found' | 'critical';
  delay: number;
}> = ({ label, value, status, delay }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const statusColor =
    status === 'unknown' ? COLORS.dimText : status === 'found' ? COLORS.secondary : COLORS.danger;
  const statusLabel =
    status === 'unknown' ? '???' : status === 'found' ? 'FOUND' : 'CRITICAL';

  return (
    <div
      style={{
        opacity,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 20px',
        border: `1px solid ${COLORS.cardBorder}`,
        borderLeft: `3px solid ${statusColor}`,
        background: COLORS.cardBg,
        borderRadius: 4,
        fontFamily: FONTS.mono,
        marginBottom: 12,
      }}
    >
      <span style={{ color: statusColor, fontSize: 11, letterSpacing: '0.15em', width: 70 }}>
        [{statusLabel}]
      </span>
      <span style={{ color: COLORS.dimText, fontSize: 14, flex: 1 }}>{label}</span>
      <span style={{ color: COLORS.text, fontSize: 14 }}>{value}</span>
    </div>
  );
};

export const Scene2Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title zoom
  const titleScale = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 120 },
  });
  const scale = interpolate(titleScale, [0, 1], [1.3, 1]);

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: 'hidden' }}>
      <GridBg opacity={0.15} />
      <ScanLine />
      <SectionLabel label="01 / THE PROBLEM" />

      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 80,
          paddingRight: 80,
          gap: 80,
        }}
      >
        {/* Left: Main headline */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'left center',
            }}
          >
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 72,
                fontWeight: 900,
                color: COLORS.text,
                lineHeight: 1.05,
              }}
            >
              Businesses carry
            </div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 72,
                fontWeight: 900,
                color: COLORS.danger,
                lineHeight: 1.05,
                textShadow: `0 0 30px ${COLORS.danger}60`,
              }}
            >
              risks they
            </div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 72,
                fontWeight: 900,
                color: COLORS.danger,
                lineHeight: 1.05,
                textShadow: `0 0 30px ${COLORS.danger}60`,
              }}
            >
              can't see.
            </div>
          </div>

          <NeonLine delay={20} color={COLORS.danger} style={{ marginTop: 32, marginBottom: 24 }} width="400px" />

          {problemLines.map((line, i) => (
            <FadeIn key={i} delay={30 + i * 20}>
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 22,
                  color: line.color,
                  letterSpacing: '0.05em',
                  lineHeight: 1.8,
                }}
              >
                {line.text}
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Right: Data sources panel */}
        <div style={{ flex: 1 }}>
          <SlideUp delay={10}>
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 13,
                color: COLORS.dimText,
                letterSpacing: '0.2em',
                marginBottom: 20,
              }}
            >
              GULF COAST OIL OPERATOR — RISK SCAN
            </div>
          </SlideUp>

          <DataSource
            label="EIA Drilling Productivity Report"
            value="Q4 2025"
            status="unknown"
            delay={20}
          />
          <DataSource
            label="PHMSA Compliance Database"
            value="47 filings"
            status="found"
            delay={40}
          />
          <DataSource
            label="NOAA Extreme Weather Events"
            value="12 incidents"
            status="critical"
            delay={60}
          />
          <DataSource
            label="Satellite Thermal Anomalies"
            value="Permian Basin"
            status="unknown"
            delay={80}
          />
          <DataSource
            label="ERCOT Grid Reliability Index"
            value="2024–2025"
            status="critical"
            delay={100}
          />
          <DataSource
            label="USGS Seismic Activity"
            value="Induced M3.2+"
            status="found"
            delay={120}
          />

          <FadeIn delay={160}>
            <div
              style={{
                marginTop: 24,
                padding: '14px 20px',
                background: `${COLORS.danger}10`,
                border: `1px solid ${COLORS.danger}40`,
                borderRadius: 4,
                fontFamily: FONTS.mono,
                fontSize: 14,
                color: COLORS.danger,
                letterSpacing: '0.08em',
              }}
            >
              ⚠ 6 risk factors identified — analysis pending
            </div>
          </FadeIn>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
