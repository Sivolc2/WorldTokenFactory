// Shared types for the World Token Factory demo video
export interface SceneProps {
  durationInFrames: number;
}

export const COLORS = {
  bg: '#0a0a0f',
  text: '#e0ffe0',
  accent: '#00ff88',
  secondary: '#00ccff',
  danger: '#ff0066',
  warn: '#ffaa00',
  dimText: '#4a7a4a',
  cardBg: '#0f1a0f',
  cardBorder: '#1a3a1a',
  gridLine: '#0d1f0d',
} as const;

export const FONTS = {
  display: "'Space Grotesk', 'Courier New', monospace",
  mono: "'Courier New', monospace",
  body: "'Inter', sans-serif",
} as const;
