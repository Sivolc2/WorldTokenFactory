import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../types';

// ──────────────────────────────────────────────
// Fade-in wrapper
// ──────────────────────────────────────────────
export const FadeIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, duration = 20, style }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <div style={{ opacity, ...style }}>{children}</div>;
};

// ──────────────────────────────────────────────
// Slide-up wrapper
// ──────────────────────────────────────────────
export const SlideUp: React.FC<{
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.8 },
  });
  const translateY = interpolate(progress, [0, 1], [60, 0]);
  const opacity = interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ transform: `translateY(${translateY}px)`, opacity, ...style }}>
      {children}
    </div>
  );
};

// ──────────────────────────────────────────────
// Scale-in wrapper
// ──────────────────────────────────────────────
export const ScaleIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 100, mass: 1 },
  });
  const scale = interpolate(progress, [0, 1], [0.6, 1]);
  const opacity = interpolate(progress, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ transform: `scale(${scale})`, opacity, transformOrigin: 'center', ...style }}>
      {children}
    </div>
  );
};

// ──────────────────────────────────────────────
// Typewriter text
// ──────────────────────────────────────────────
export const Typewriter: React.FC<{
  text: string;
  delay?: number;
  framesPerChar?: number;
  style?: React.CSSProperties;
}> = ({ text, delay = 0, framesPerChar = 2, style }) => {
  const frame = useCurrentFrame();
  const charsVisible = Math.floor(Math.max(0, frame - delay) / framesPerChar);
  const visible = text.slice(0, charsVisible);
  const showCursor = charsVisible < text.length;
  return (
    <span style={{ fontFamily: FONTS.mono, ...style }}>
      {visible}
      {showCursor && <span style={{ opacity: frame % 20 < 10 ? 1 : 0 }}>_</span>}
    </span>
  );
};

// ──────────────────────────────────────────────
// Neon accent line
// ──────────────────────────────────────────────
export const NeonLine: React.FC<{
  delay?: number;
  color?: string;
  width?: string;
  style?: React.CSSProperties;
}> = ({ delay = 0, color = COLORS.accent, width = '100%', style }) => {
  const frame = useCurrentFrame();
  const scaleX = interpolate(frame - delay, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        height: 2,
        width,
        background: color,
        boxShadow: `0 0 12px ${color}, 0 0 24px ${color}40`,
        transform: `scaleX(${scaleX})`,
        transformOrigin: 'left',
        ...style,
      }}
    />
  );
};

// ──────────────────────────────────────────────
// Glowing badge / chip
// ──────────────────────────────────────────────
export const Chip: React.FC<{
  label: string;
  color?: string;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ label, color = COLORS.accent, delay = 0 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <span
      style={{
        opacity,
        display: 'inline-block',
        border: `1px solid ${color}`,
        color,
        fontFamily: FONTS.mono,
        fontSize: 18,
        padding: '4px 14px',
        borderRadius: 4,
        background: `${color}15`,
        boxShadow: `0 0 8px ${color}40`,
        margin: '0 8px',
        letterSpacing: '0.08em',
      }}
    >
      {label}
    </span>
  );
};

// ──────────────────────────────────────────────
// Pulsing dot
// ──────────────────────────────────────────────
export const PulseDot: React.FC<{
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({ color = COLORS.accent, size = 10, style }) => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.15) * 0.4 + 0.6;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 ${size * pulse}px ${color}`,
        opacity: pulse,
        ...style,
      }}
    />
  );
};

// ──────────────────────────────────────────────
// Grid background
// ──────────────────────────────────────────────
export const GridBg: React.FC<{ opacity?: number }> = ({ opacity = 0.15 }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      backgroundImage: `
        linear-gradient(${COLORS.gridLine} 1px, transparent 1px),
        linear-gradient(90deg, ${COLORS.gridLine} 1px, transparent 1px)
      `,
      backgroundSize: '80px 80px',
      opacity,
    }}
  />
);

// ──────────────────────────────────────────────
// Scan line effect
// ──────────────────────────────────────────────
export const ScanLine: React.FC = () => {
  const frame = useCurrentFrame();
  const y = (frame * 4) % 1080;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: y,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${COLORS.accent}30, transparent)`,
        pointerEvents: 'none',
      }}
    />
  );
};

// ──────────────────────────────────────────────
// Section label (top-left corner)
// ──────────────────────────────────────────────
export const SectionLabel: React.FC<{ label: string; delay?: number }> = ({
  label,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        top: 40,
        left: 60,
        opacity,
        fontFamily: FONTS.mono,
        fontSize: 14,
        color: COLORS.dimText,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
  );
};
