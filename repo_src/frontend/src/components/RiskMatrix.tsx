import type { Step, AnalysisResult, RiskFactor } from '../types';
import { riskBarColor } from '../utils/risk';
import { formatPct, formatUSD } from '../utils/formatting';

interface RiskMatrixProps {
  step: Step;
  analysisResults: Record<string, AnalysisResult>;
  selectedRiskFactorId: string | null;
  onSelectRiskFactor: (rfId: string) => void;
}

/**
 * Plots all analyzed risk factors for a step on a Failure Rate × Uncertainty matrix.
 * Bubble size represents financial exposure (loss range midpoint).
 */
export default function RiskMatrix({
  step,
  analysisResults,
  selectedRiskFactorId,
  onSelectRiskFactor,
}: RiskMatrixProps) {
  const analyzed = step.risk_factors
    .map((rf) => ({ rf, result: analysisResults[rf.id] }))
    .filter((x): x is { rf: RiskFactor; result: AnalysisResult } => !!x.result);

  if (analyzed.length === 0) {
    return (
      <div className="risk-matrix risk-matrix--empty">
        <span>Analyse risk factors to populate matrix</span>
      </div>
    );
  }

  // Compute max loss midpoint for bubble size scaling
  const maxMid = Math.max(
    ...analyzed.map(
      ({ result }) => (result.metrics.loss_range_low + result.metrics.loss_range_high) / 2
    ),
    1
  );

  return (
    <div className="risk-matrix">
      <div className="risk-matrix__inner">
        {/* Background quadrant shading */}
        <div className="risk-matrix__quadrant risk-matrix__quadrant--low" />
        <div className="risk-matrix__quadrant risk-matrix__quadrant--moderate" />
        <div className="risk-matrix__quadrant risk-matrix__quadrant--elevated" />
        <div className="risk-matrix__quadrant risk-matrix__quadrant--critical" />

        {/* Quadrant labels */}
        <span className="risk-matrix__qlabel risk-matrix__qlabel--tl">HIGH UNCERTAINTY<br />LOW FAILURE</span>
        <span className="risk-matrix__qlabel risk-matrix__qlabel--tr">CRITICAL</span>
        <span className="risk-matrix__qlabel risk-matrix__qlabel--bl">LOW RISK</span>
        <span className="risk-matrix__qlabel risk-matrix__qlabel--br">HIGH FAILURE<br />LOW UNCERTAINTY</span>

        {/* Axis labels */}
        <div className="risk-matrix__x-axis">
          <span>Low</span>
          <span className="risk-matrix__axis-title">Failure Rate →</span>
          <span>High</span>
        </div>
        <div className="risk-matrix__y-axis">
          <span>Low</span>
          <span className="risk-matrix__axis-title">← Uncertainty</span>
          <span>High</span>
        </div>

        {/* Plot bubbles */}
        {analyzed.map(({ rf, result }) => {
          const x = result.metrics.failure_rate; // 0–1 → left–right
          const y = result.metrics.uncertainty; // 0–1 → bottom–top
          const mid =
            (result.metrics.loss_range_low + result.metrics.loss_range_high) / 2;
          const size = 12 + (mid / maxMid) * 22; // 12–34px diameter

          const color = riskBarColor(Math.max(x, y));
          const isSelected = rf.id === selectedRiskFactorId;

          return (
            <button
              key={rf.id}
              className={`risk-matrix__bubble${isSelected ? ' risk-matrix__bubble--selected' : ''}`}
              style={{
                left: `calc(${x * 100}% - ${size / 2}px)`,
                bottom: `calc(${y * 100}% - ${size / 2}px)`,
                width: size,
                height: size,
                background: color,
                boxShadow: isSelected
                  ? `0 0 0 2px white, 0 0 0 4px ${color}`
                  : `0 2px 6px rgba(0,0,0,0.25)`,
              }}
              onClick={() => onSelectRiskFactor(rf.id)}
              title={`${rf.name}\nFR: ${formatPct(x)} · UN: ${formatPct(y)}\nLoss: ${formatUSD(result.metrics.loss_range_low)}–${formatUSD(result.metrics.loss_range_high)}`}
            >
              {isSelected && (
                <span className="risk-matrix__bubble-label">{rf.name}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="risk-matrix__legend">
        <span className="risk-matrix__legend-note">
          Bubble size = financial exposure midpoint
        </span>
        <div className="risk-matrix__legend-dots">
          {[
            { label: 'Low', color: '#1a7f37' },
            { label: 'Moderate', color: '#5a8a00' },
            { label: 'Elevated', color: '#c98a00' },
            { label: 'High', color: '#c95200' },
            { label: 'Critical', color: '#b91c1c' },
          ].map(({ label, color }) => (
            <span key={label} className="risk-matrix__legend-item">
              <span
                className="risk-matrix__legend-dot"
                style={{ background: color }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
