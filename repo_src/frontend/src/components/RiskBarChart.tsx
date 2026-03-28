import type { RiskFactor, AnalysisResult } from '../types';
import { riskBarColor, riskScoreToColor } from '../utils/risk';
import { formatPct } from '../utils/formatting';

// Prior estimates shown for unanalysed factors (mirrors StepChainOverlay)
const PRIOR_UN = 0.78;
const PRIOR_FR = 0.20;
const PRIOR_SCORE = (PRIOR_UN + PRIOR_FR) / 2;

interface RiskBarChartProps {
  riskFactors: RiskFactor[];
  analysisResults: Record<string, AnalysisResult>;
  runningRiskFactorIds: Set<string>;
  selectedRfId: string | null;
  onSelect: (rfId: string) => void;
}

export default function RiskBarChart({
  riskFactors,
  analysisResults,
  runningRiskFactorIds,
  selectedRfId,
  onSelect,
}: RiskBarChartProps) {
  return (
    <div className="rbc">
      {riskFactors.map((rf) => {
        const result = analysisResults[rf.id];
        const isRunning = runningRiskFactorIds.has(rf.id);
        const isSelected = rf.id === selectedRfId;
        const isPrior = !result && !isRunning;

        const score = result
          ? (result.metrics.failure_rate + result.metrics.uncertainty) / 2
          : PRIOR_SCORE;
        const fr = result ? result.metrics.failure_rate : PRIOR_FR;
        const un = result ? result.metrics.uncertainty : PRIOR_UN;
        const combinedColor = riskScoreToColor(score);

        return (
          <button
            key={rf.id}
            className={`rbc-row${isSelected ? ' rbc-row--selected' : ''}${isPrior ? ' rbc-row--prior' : ''}`}
            onClick={() => onSelect(rf.id)}
          >
            <div className="rbc-label" title={rf.name}>
              {rf.name}
              {isPrior && <span className="rbc-prior-badge">prior</span>}
            </div>

            {isRunning ? (
              <div className="rbc-pending">
                <span className="loading-dots" style={{ color: 'var(--color-accent)' }}>
                  <span /><span /><span />
                </span>
                <span>Analysing…</span>
              </div>
            ) : (
              <div className="rbc-bars">
                {/* Combined score — primary breakdown bar */}
                <div className="rbc-bar-line rbc-bar-line--combined">
                  <span className="rbc-bar-tag rbc-bar-tag--combined" style={{ color: combinedColor }}>
                    {isPrior ? '~' : ''}⬤
                  </span>
                  <div className="rbc-bar-track">
                    <div
                      className="rbc-bar-fill"
                      style={{
                        width: `${score * 100}%`,
                        background: combinedColor,
                        opacity: isPrior ? 0.45 : 1,
                      }}
                    />
                  </div>
                  <span className="rbc-bar-val" style={{ color: combinedColor }}>
                    {isPrior ? '~' : ''}{formatPct(score)}
                  </span>
                </div>
                {/* Sub-bars: FR and UN */}
                <div className="rbc-bar-line rbc-bar-line--sub">
                  <span className="rbc-bar-tag">FR</span>
                  <div className="rbc-bar-track">
                    <div
                      className="rbc-bar-fill"
                      style={{
                        width: `${fr * 100}%`,
                        background: riskBarColor(fr),
                        opacity: isPrior ? 0.35 : 0.85,
                      }}
                    />
                  </div>
                  <span className="rbc-bar-val">{isPrior ? '~' : ''}{formatPct(fr)}</span>
                </div>
                <div className="rbc-bar-line rbc-bar-line--sub">
                  <span className="rbc-bar-tag">UN</span>
                  <div className="rbc-bar-track">
                    <div
                      className="rbc-bar-fill"
                      style={{
                        width: `${un * 100}%`,
                        background: riskBarColor(un),
                        opacity: isPrior ? 0.35 : 0.65,
                      }}
                    />
                  </div>
                  <span className="rbc-bar-val">{isPrior ? '~' : ''}{formatPct(un)}</span>
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
