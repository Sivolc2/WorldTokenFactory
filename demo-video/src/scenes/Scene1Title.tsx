/**
 * Scene 1 — Title Card (0–5s, frames 0–150)
 * "WORLD TOKEN FACTORY" — big animated title drop
 */
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../types';
import { FadeIn, GridBg, NeonLine, ScanLine, SlideUp } from '../components/Atoms';

export const Scene1Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Main title spring
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80, mass: 1.2 },
  });
  const titleY = interpolate(titleProgress, [0, 1], [-120, 0]);
  const titleOpacity = interpolate(titleProgress, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });

  // Background glow pulse
  const glowPulse = Math.sin(frame * 0.05) * 0.3 + 0.7;

  // Subtitle slides up after title settles
  const subtitleDelay = 30;

  // Corner brackets animate in
  const bracketOpacity = interpolate(frame, [20, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: 'hidden' }}>
      {/* Grid background */}
      <GridBg opacity={0.2} />
      <ScanLine />

      {/* Radial glow behind title */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 900,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${COLORS.accent}${Math.round(glowPulse * 20).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Corner brackets */}
      {([
        { top: 60, left: 60 },
        { top: 60, right: 60 },
        { bottom: 60, left: 60 },
        { bottom: 60, right: 60 },
      ] as React.CSSProperties[]).map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 40,
            height: 40,
            opacity: bracketOpacity,
            borderTopWidth: i < 2 ? 2 : 0,
            borderBottomWidth: i >= 2 ? 2 : 0,
            borderLeftWidth: i % 2 === 0 ? 2 : 0,
            borderRightWidth: i % 2 === 1 ? 2 : 0,
            borderStyle: 'solid',
            borderColor: COLORS.accent,
            ...pos,
          }}
        />
      ))}

      {/* WTF monogram — top left */}
      <FadeIn delay={10} style={{ position: 'absolute', top: 52, left: 120 }}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 13,
            color: COLORS.accent,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
          }}
        >
          WTF / DEMO / 2026
        </div>
      </FadeIn>

      {/* Main content */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
        }}
      >
        {/* Main title */}
        <div
          style={{
            transform: `translateY(${titleY}px)`,
            opacity: titleOpacity,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 110,
              fontWeight: 900,
              color: COLORS.text,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              textShadow: `0 0 40px ${COLORS.accent}60, 0 0 80px ${COLORS.accent}20`,
            }}
          >
            WORLD
          </div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 110,
              fontWeight: 900,
              color: COLORS.accent,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              textShadow: `0 0 40px ${COLORS.accent}80, 0 0 80px ${COLORS.accent}40`,
            }}
          >
            TOKEN
          </div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 110,
              fontWeight: 900,
              color: COLORS.text,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              textShadow: `0 0 40px ${COLORS.accent}60, 0 0 80px ${COLORS.accent}20`,
            }}
          >
            FACTORY
          </div>
        </div>

        {/* Divider line */}
        <NeonLine delay={40} style={{ marginTop: 32, marginBottom: 28 }} width="480px" />

        {/* Subtitle */}
        <SlideUp delay={subtitleDelay}>
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 26,
              color: COLORS.secondary,
              letterSpacing: '0.12em',
              textAlign: 'center',
            }}
          >
            Every business is a token factory.
          </div>
        </SlideUp>

        {/* Tag line */}
        <FadeIn delay={70}>
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 16,
              color: COLORS.dimText,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginTop: 20,
              textAlign: 'center',
            }}
          >
            Multimodal Frontier Hackathon · 2026
          </div>
        </FadeIn>
      </AbsoluteFill>

      {/* Bottom status bar */}
      <FadeIn delay={60} style={{ position: 'absolute', bottom: 40, left: 0, right: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 40,
            fontFamily: FONTS.mono,
            fontSize: 13,
            color: COLORS.dimText,
            letterSpacing: '0.15em',
          }}
        >
          <span>RISK INTELLIGENCE</span>
          <span style={{ color: COLORS.accent }}>●</span>
          <span>MULTI-AGENT ORCHESTRATION</span>
          <span style={{ color: COLORS.accent }}>●</span>
          <span>RAG · SATELLITE · REGULATORY</span>
        </div>
      </FadeIn>
    </AbsoluteFill>
  );
};
