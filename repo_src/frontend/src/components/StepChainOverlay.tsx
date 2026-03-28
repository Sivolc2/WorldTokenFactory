import type { Step, AnalysisResult, RiskMetrics } from '../types';
import { riskScoreToColor, getStepRiskScore, riskLabel } from '../utils/risk';
import { formatPct, formatUSD } from '../utils/formatting';

interface StepChainOverlayProps {
  steps: Step[];
  analysisResults: Record<string, AnalysisResult>;
  selectedStepId: string | null;
  runningRiskFactorIds: Set<string>;
  onSelectStep: (stepId: string) => void;
}

/** Aggregate initial_metrics across all risk factors in a step. */
function stepInitialMetrics(step: Step): RiskMetrics | null {
  const factors = step.risk_factors.filter((rf) => rf.initial_metrics);
  if (factors.length === 0) return null;
  return {
    failure_rate:    factors.reduce((s, rf) => s + rf.initial_metrics!.failure_rate, 0)    / factors.length,
    uncertainty:     factors.reduce((s, rf) => s + rf.initial_metrics!.uncertainty,  0)    / factors.length,
    loss_range_low:  factors.reduce((s, rf) => s + rf.initial_metrics!.loss_range_low,  0),
    loss_range_high: factors.reduce((s, rf) => s + rf.initial_metrics!.loss_range_high, 0),
    loss_range_note: '',
  };
}

export default function StepChainOverlay({
  steps,
  analysisResults,
  selectedStepId,
  runningRiskFactorIds,
  onSelectStep,
}: StepChainOverlayProps) {
  if (steps.length === 0) return null;

  return (
    <div className="step-chain">
      {steps.map((step, i) => {
        const isSelected  = step.id === selectedStepId;
        const isRunning   = step.risk_factors.some((rf) => runningRiskFactorIds.has(rf.id));
        const analyzed    = step.risk_factors.filter((rf) => analysisResults[rf.id]);
        const hasAnalysis = analyzed.length > 0;

        // Post-analysis aggregates
        const riskScore    = hasAnalysis ? getStepRiskScore(step, analysisResults)! : null;
        const avgUN        = hasAnalysis ? analyzed.reduce((s, rf) => s + analysisResults[rf.id].metrics.uncertainty,  0) / analyzed.length : null;
        const avgFR        = hasAnalysis ? analyzed.reduce((s, rf) => s + analysisResults[rf.id].metrics.failure_rate, 0) / analyzed.length : null;
        const totalMinLoss = hasAnalysis ? analyzed.reduce((s, rf) => s + analysisResults[rf.id].metrics.loss_range_low,  0) : null;
        const totalMaxLoss = hasAnalysis ? analyzed.reduce((s, rf) => s + analysisResults[rf.id].metrics.loss_range_high, 0) : null;

        // Initial-estimate aggregates (from decompose)
        const initial    = !hasAnalysis ? stepInitialMetrics(step) : null;
        const initScore  = initial ? (initial.failure_rate + initial.uncertainty) / 2 : null;

        const accentColor = riskScoreToColor(hasAnalysis ? riskScore : initScore);
        const isInitial   = !hasAnalysis && !!initial;

        return (
          <div key={step.id} className="step-chain__item">
            {i > 0 && (
              <div className="step-chain__cascade">
                <div className="step-chain__cascade-line" />
                <span className="step-chain__cascade-label">cascades</span>
                <div className="step-chain__cascade-head">▶</div>
              </div>
            )}
            <button
              className={`step-card${isSelected ? ' step-card--selected' : ''}${isInitial ? ' step-card--initial' : ''}`}
              style={{ '--step-color': accentColor } as React.CSSProperties}
              onClick={() => onSelectStep(step.id)}
            >
              {/* Name row */}
              <div className="step-card__top">
                <span className="step-card__dot" style={{ background: accentColor }} />
                <span className="step-card__name">{step.name}</span>
                {isRunning && (
                  <span className="step-card__running">
                    <span className="loading-dots"><span /><span /><span /></span>
                  </span>
                )}
              </div>

              {/* Metrics row */}
              {hasAnalysis ? (
                <div className="step-card__meta">
                  <span className="step-card__tag" style={{ background: accentColor }}>
                    {riskLabel(riskScore!)}
                  </span>
                  <span className="step-card__un">UN {formatPct(avgUN!)}</span>
                  <span className="step-card__un">FR {formatPct(avgFR!)}</span>
                </div>
              ) : initial ? (
                <div className="step-card__meta">
                  <span className="step-card__tag step-card__tag--initial" style={{ background: accentColor }}>
                    {riskLabel(initScore!)}
                  </span>
                  <span className="step-card__un step-card__un--initial">~FR {formatPct(initial.failure_rate)}</span>
                </div>
              ) : (
                <div className="step-card__meta">
                  <span className="step-card__tag step-card__tag--empty">
                    {step.risk_factors.length} factor{step.risk_factors.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Exposure row */}
              {hasAnalysis && totalMinLoss !== null && totalMaxLoss !== null ? (
                <div className="step-card__exposure">
                  {formatUSD(totalMinLoss)} – {formatUSD(totalMaxLoss)}
                </div>
              ) : initial ? (
                <div className="step-card__exposure step-card__exposure--initial">
                  ~{formatUSD(initial.loss_range_low)} – {formatUSD(initial.loss_range_high)}
                </div>
              ) : (
                <div className="step-card__exposure step-card__exposure--empty">
                  exposure TBD
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
