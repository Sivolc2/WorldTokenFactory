/**
 * Scene 5 — The Risk Map (60–90s, frames 1800–2700)
 * Satellite-style map with risk overlays
 */
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../types';
import { FadeIn, GridBg, NeonLine, ScanLine, SectionLabel, SlideUp } from '../components/Atoms';

// Simulated geographic grid cells for the risk map
const RISK_CELLS = [
  // [col, row, risk 0-1, label?]
  [2, 1, 0.9, 'PIPELINE CORRIDOR'],
  [3, 1, 0.7, null],
  [4, 1, 0.5, null],
  [1, 2, 0.6, null],
  [2, 2, 0.8, 'REFINERY CLUSTER'],
  [3, 2, 0.9, null],
  [4, 2, 0.4, null],
  [5, 2, 0.3, null],
  [1, 3, 0.3, null],
  [2, 3, 0.5, null],
  [3, 3, 0.7, 'PERMIAN BASIN'],
  [4, 3, 0.8, null],
  [5, 3, 0.6, null],
  [6, 3, 0.2, null],
  [2, 4, 0.2, null],
  [3, 4, 0.4, null],
  [4, 4, 0.6, 'ERCOT ZONE'],
  [5, 4, 0.7, null],
  [6, 4, 0.5, null],
  [3, 5, 0.2, null],
  [4, 5, 0.3, null],
  [5, 5, 0.4, null],
];

const RiskCell: React.FC<{
  col: number;
  row: number;
  risk: number;
  label: string | null;
  delay: number;
}> = ({ col, row, risk, label, delay }) => {
  const frame = useCurrentFrame();
  const cellW = 130;
  const cellH = 90;
  const x = 80 + col * cellW;
  const y = 130 + row * cellH;

  const opacity = interpolate(frame - delay, [0, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const color =
    risk > 0.75
      ? COLORS.danger
      : risk > 0.5
      ? COLORS.warn
      : risk > 0.3
      ? COLORS.secondary
      : COLORS.accent;

  const pulse = Math.sin(frame * 0.06 + col + row) * 0.15 + 0.85;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: cellW - 4,
        height: cellH - 4,
        opacity,
        background: `${color}${Math.round(risk * 35).toString(16).padStart(2, '0')}`,
        border: `1px solid ${color}${Math.round(risk * 80).toString(16).padStart(2, '0')}`,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `inset 0 0 ${risk * 20 * pulse}px ${color}40`,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 11,
          color,
          opacity: 0.8,
          letterSpacing: '0.05em',
        }}
      >
        {Math.round(risk * 100)}%
      </div>
      {label && (
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 9,
            color,
            opacity: 0.6,
            letterSpacing: '0.05em',
            textAlign: 'center',
            marginTop: 2,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string;
  sub?: string;
  color: string;
  delay: number;
}> = ({ title, value, sub, color, delay }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const slideX = interpolate(frame - delay, [0, 20], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${slideX}px)`,
        padding: '16px 20px',
        background: COLORS.cardBg,
        border: `1px solid ${color}30`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 4,
        marginBottom: 14,
        boxShadow: `0 0 20px ${color}10`,
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
        {title}
      </div>
      <div
        style={{
          fontFamily: FONTS.display,
          fontSize: 22,
          color,
          fontWeight: 700,
          textShadow: `0 0 15px ${color}50`,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 12,
            color: COLORS.dimText,
            marginTop: 4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
};

export const Scene5RiskMap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mapReveal = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: 'hidden' }}>
      <GridBg opacity={0.1} />
      <ScanLine />
      <SectionLabel label="04 / RISK MAP" />

      {/* Map title */}
      <FadeIn delay={0}>
        <div
          style={{
            position: 'absolute',
            top: 50,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: FONTS.display,
            fontSize: 42,
            fontWeight: 900,
            color: COLORS.text,
          }}
        >
          Permian Basin —{' '}
          <span style={{ color: COLORS.warn }}>Geo-spatial Risk Analysis</span>
        </div>
      </FadeIn>

      {/* Map area */}
      <div
        style={{
          position: 'absolute',
          top: 120,
          left: 60,
          right: 380,
          bottom: 100,
          background: '#050f08',
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        {/* Faint terrain grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(${COLORS.accent}08 1px, transparent 1px),
              linear-gradient(90deg, ${COLORS.accent}08 1px, transparent 1px)
            `,
            backgroundSize: '130px 90px',
          }}
        />

        {/* Coordinate labels */}
        {[31.5, 31.0, 30.5, 30.0].map((lat, i) => (
          <div
            key={lat}
            style={{
              position: 'absolute',
              top: 130 + i * 90,
              left: 6,
              fontFamily: FONTS.mono,
              fontSize: 9,
              color: COLORS.dimText,
              opacity: 0.5,
            }}
          >
            {lat}°N
          </div>
        ))}

        {/* Risk cells */}
        {RISK_CELLS.map(([col, row, risk, label], i) => (
          <RiskCell
            key={i}
            col={col as number - 1}
            row={row as number - 1}
            risk={risk as number}
            label={label as string | null}
            delay={i * 5}
          />
        ))}

        {/* Map label overlay */}
        <FadeIn delay={80}>
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              fontFamily: FONTS.mono,
              fontSize: 11,
              color: COLORS.accent,
              letterSpacing: '0.1em',
            }}
          >
            WEST TEXAS — PERMIAN BASIN
          </div>
        </FadeIn>

        {/* Legend */}
        <FadeIn delay={90}>
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
            }}
          >
            {[
              { color: COLORS.accent, label: 'LOW' },
              { color: COLORS.secondary, label: 'MED' },
              { color: COLORS.warn, label: 'HIGH' },
              { color: COLORS.danger, label: 'CRIT' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontFamily: FONTS.mono,
                  fontSize: 10,
                  color: item.color,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    background: item.color,
                    borderRadius: 2,
                    opacity: 0.7,
                  }}
                />
                {item.label}
              </div>
            ))}
          </div>
        </FadeIn>
      </div>

      {/* Right panel — metrics */}
      <div
        style={{
          position: 'absolute',
          top: 120,
          right: 40,
          width: 320,
          bottom: 100,
        }}
      >
        <MetricCard
          title="ERCOT GRID FAILURE RISK"
          value="FR 22% | UN 76%"
          sub="Frequency Regulation / Unplanned Outage"
          color={COLORS.danger}
          delay={30}
        />
        <MetricCard
          title="ESTIMATED EXPOSURE RANGE"
          value="$48M – $360M"
          sub="Annualized, P10–P90 scenario"
          color={COLORS.warn}
          delay={50}
        />
        <MetricCard
          title="HURRICANE LANDFALL PROB"
          value="34% (next 24mo)"
          sub="Cat 3+ within 150mi of assets"
          color={COLORS.danger}
          delay={70}
        />
        <MetricCard
          title="SEISMIC M3.2+ EVENTS"
          value="17 in 90 days"
          sub="Induced seismicity — injection wells"
          color={COLORS.warn}
          delay={90}
        />
        <MetricCard
          title="OVERALL RISK SCORE"
          value="8.2 / 10"
          sub="Composite — 6 vectors weighted"
          color={COLORS.accent}
          delay={110}
        />
      </div>
    </AbsoluteFill>
  );
};
