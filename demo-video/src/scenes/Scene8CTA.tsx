/**
 * Scene 8 — Call to Action (150–180s, frames 4500–5400)
 * Final screen — repo URL, deployed URL, closing message
 */
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../types';
import { FadeIn, GridBg, NeonLine, ScanLine, ScaleIn, SlideUp, Typewriter } from '../components/Atoms';

const LinkCard: React.FC<{
  label: string;
  url: string;
  color: string;
  delay: number;
}> = ({ label, url, color, delay }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        opacity,
        padding: '16px 28px',
        background: COLORS.cardBg,
        border: `1px solid ${color}40`,
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        boxShadow: `0 0 24px ${color}15`,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 11,
          color: COLORS.dimText,
          letterSpacing: '0.2em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 18,
          color,
          letterSpacing: '0.02em',
          textShadow: `0 0 15px ${color}50`,
        }}
      >
        {url}
      </div>
    </div>
  );
};

export const Scene8CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Big title spring
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 90 },
  });
  const titleScale = interpolate(titleProgress, [0, 1], [0.7, 1]);
  const titleOpacity = interpolate(titleProgress, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' });

  // Background pulse
  const glowPulse = Math.sin(frame * 0.04) * 0.4 + 0.6;

  // Late-frame "end card" elements
  const isLate = frame > 100;

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: 'hidden' }}>
      <GridBg opacity={0.2} />
      <ScanLine />

      {/* Radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 1200,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${COLORS.accent}${Math.round(glowPulse * 18).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

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
            transform: `scale(${titleScale})`,
            opacity: titleOpacity,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 100,
              fontWeight: 900,
              color: COLORS.text,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              textShadow: `0 0 60px ${COLORS.accent}30`,
            }}
          >
            WORLD TOKEN
          </div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 100,
              fontWeight: 900,
              color: COLORS.accent,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              textShadow: `0 0 60px ${COLORS.accent}80, 0 0 120px ${COLORS.accent}30`,
            }}
          >
            FACTORY
          </div>
        </div>

        <NeonLine delay={20} style={{ marginTop: 32, marginBottom: 28 }} width="600px" />

        {/* Tagline */}
        <SlideUp delay={30}>
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 24,
              color: COLORS.secondary,
              letterSpacing: '0.08em',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            What does it cost to know what you don't know?
          </div>
        </SlideUp>

        {/* Links */}
        <FadeIn delay={60}>
          <div
            style={{
              display: 'flex',
              gap: 20,
              marginTop: 36,
              marginBottom: 36,
            }}
          >
            <LinkCard
              label="LIVE APP"
              url="worldtokenfactory.com"
              color={COLORS.accent}
              delay={70}
            />
            <LinkCard
              label="SOURCE CODE"
              url="github.com/worldtokenfactory"
              color={COLORS.secondary}
              delay={85}
            />
          </div>
        </FadeIn>

        {/* Hackathon badge */}
        <ScaleIn delay={100}>
          <div
            style={{
              padding: '12px 32px',
              border: `1px solid ${COLORS.accent}50`,
              borderRadius: 6,
              background: `${COLORS.accent}10`,
              fontFamily: FONTS.mono,
              fontSize: 14,
              color: COLORS.accent,
              letterSpacing: '0.15em',
              textAlign: 'center',
            }}
          >
            MULTIMODAL FRONTIER HACKATHON · 2026
          </div>
        </ScaleIn>

        {/* Final message */}
        <FadeIn delay={140}>
          <div
            style={{
              marginTop: 30,
              fontFamily: FONTS.mono,
              fontSize: 15,
              color: COLORS.dimText,
              letterSpacing: '0.12em',
              textAlign: 'center',
            }}
          >
            Every business is a token factory.
            <br />
            <span style={{ color: COLORS.accent }}>Now we can prove it.</span>
          </div>
        </FadeIn>
      </AbsoluteFill>

      {/* Corner decoration */}
      {([
        { top: 40, left: 40 },
        { top: 40, right: 40 },
        { bottom: 40, left: 40 },
        { bottom: 40, right: 40 },
      ] as React.CSSProperties[]).map((pos, i) => {
        const cornerOpacity = interpolate(frame - 20, [0, 30], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 32,
              height: 32,
              opacity: cornerOpacity,
              borderTopWidth: i < 2 ? 2 : 0,
              borderBottomWidth: i >= 2 ? 2 : 0,
              borderLeftWidth: i % 2 === 0 ? 2 : 0,
              borderRightWidth: i % 2 === 1 ? 2 : 0,
              borderStyle: 'solid',
              borderColor: COLORS.accent,
              ...pos,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
