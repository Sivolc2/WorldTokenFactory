import type { Depth, Step, AnalysisResult } from '../types';

/**
 * Interpolates a risk score (0–1) to an HSL color string.
 * 0.0 → deep green, 0.5 → amber, 1.0 → deep red
 */
export function riskScoreToColor(score: number | null): string {
  if (score === null) return '#94a3b8'; // grey — not yet analyzed

  const clamped = Math.max(0, Math.min(1, score));

  // Piecewise hue interpolation: green (142) → amber (38) → red (0)
  const hue =
    clamped < 0.5
      ? 142 - (clamped / 0.5) * (142 - 38)
      : 38 - ((clamped - 0.5) / 0.5) * 38;

  const sat = 68 + clamped * 12;
  const light = 34;

  return `hsl(${hue.toFixed(0)}, ${sat.toFixed(0)}%, ${light}%)`;
}

/**
 * Returns a color for a risk bar (failure rate or uncertainty bars).
 */
export function riskBarColor(value: number): string {
  if (value < 0.2) return '#1a7f37';
  if (value < 0.4) return '#5a8a00';
  if (value < 0.6) return '#c98a00';
  if (value < 0.8) return '#c95200';
  return '#b91c1c';
}

/**
 * Returns a human-readable label for a risk score.
 */
export function riskLabel(value: number): string {
  if (value < 0.2) return 'LOW';
  if (value < 0.4) return 'MODERATE';
  if (value < 0.6) return 'ELEVATED';
  if (value < 0.8) return 'HIGH';
  return 'VERY HIGH';
}

/**
 * Computes the combined risk score for a step based on analyzed risk factors.
 * Returns null if no risk factors have been analyzed.
 */
export function getStepRiskScore(
  step: Step,
  analysisResults: Record<string, AnalysisResult>
): number | null {
  const analyzed = step.risk_factors.filter((rf) => analysisResults[rf.id]);
  if (analyzed.length === 0) return null;

  const total = analyzed.reduce((sum, rf) => {
    const result = analysisResults[rf.id];
    return sum + (result.metrics.failure_rate + result.metrics.uncertainty) / 2;
  }, 0);

  return total / analyzed.length;
}

/**
 * Returns the estimated token range string for a given depth.
 */
export function getTokenEstimate(depth: Depth): string {
  switch (depth) {
    case 1:
      return '200 – 500 tokens';
    case 2:
      return '1,000 – 5,000 tokens';
    case 3:
      return '100,000 – 1,000,000+ tokens';
  }
}

/**
 * Returns the depth tier label.
 */
export function getDepthLabel(depth: Depth): string {
  switch (depth) {
    case 1:
      return 'Quick Scan';
    case 2:
      return 'Research Brief';
    case 3:
      return 'Deep Run';
  }
}
