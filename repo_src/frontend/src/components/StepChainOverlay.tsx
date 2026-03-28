import type { Step, AnalysisResult } from '../types';
import { riskScoreToColor, getStepRiskScore, riskLabel } from '../utils/risk';
import { formatPct, formatUSD } from '../utils/formatting';

// Before any analysis runs, treat a step as having high epistemic uncertainty.
// UN ≈ 0.78 (we genuinely don't know) and FR ≈ 0.20 (moderate prior).
// Combined score ≈ 0.49 → amber — visually "worth investigating".
const PRIOR_UN = 0.78;
const PRIOR_FR = 0.20;
const PRIOR_SCORE = (PRIOR_UN + PRIOR_FR) / 2; // ≈ 0.49

interface StepChainOverlayProps {
  steps: Step[];
  analysisResults: Record<string, AnalysisResult>;
  selectedStepId: string | null;
  runningRiskFactorIds: Set<string>;
  onSelectStep: (stepId: string) => void;
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

        // ── Real metrics (post-analysis) ──────────────────────────────────
        const riskScore = hasAnalysis ? getStepRiskScore(step, analysisResults)! : null;
        const accentColor = riskScoreToColor(hasAnalysis ? riskScore : PRIOR_SCORE);

        const avgUN = hasAnalysis
          ? analyzed.reduce((s, rf) => s + analysisResults[rf.id].metrics.uncertainty, 0) / analyzed.length
          : null;
        const avgFR = hasAnalysis
          ? analyzed.reduce((s, rf) => s + analysisResults[rf.id].metrics.failure_rate, 0) / analyzed.length
          : null;
        const totalMaxLoss = hasAnalysis
          ? analyzed.reduce((s, rf) => s + analysisResults[rf.id].metrics.loss_range_high, 0)
          : null;
        const totalMinLoss = hasAnalysis
          ? analyzed.reduce((s, rf) => s + analysisResults[rf.id].metrics.loss_range_low, 0)
          : null;

        return (
          <div key={step.id} className="step-chain__item">
            {i > 0 && <div className="step-chain__arrow">→</div>}
            <button
              className={`step-card${isSelected ? ' step-card--selected' : ''}${!hasAnalysis ? ' step-card--prior' : ''}`}
              style={{ '--step-color': accentColor } as React.CSSProperties}
              onClick={() => onSelectStep(step.id)}
            >
              {/* ── Name row ── */}
              <div className="step-card__top">
                <span className="step-card__dot" style={{ background: accentColor }} />
                <span className="step-card__name">{step.name}</span>
                {isRunning && (
                  <span className="step-card__running">
                    <span className="loading-dots"><span /><span /><span /></span>
                  </span>
                )}
              </div>

              {/* ── Metrics row ── */}
              {hasAnalysis ? (
                // Real values
                <div className="step-card__meta">
                  <span className="step-card__tag" style={{ background: accentColor }}>
                    {riskLabel(riskScore!)}
                  </span>
                  <span className="step-card__un">UN {formatPct(avgUN!)}</span>
                  <span className="step-card__un">FR {formatPct(avgFR!)}</span>
                </div>
              ) : (
                // Prior / default estimates — clearly marked with ~
                <div className="step-card__meta">
                  <span className="step-card__tag step-card__tag--prior" style={{ background: accentColor }}>
                    PRIOR
                  </span>
                  <span className="step-card__un step-card__un--prior">
                    ~UN {formatPct(PRIOR_UN)}
                  </span>
                  <span className="step-card__un step-card__un--prior">
                    ~FR {formatPct(PRIOR_FR)}
                  </span>
                </div>
              )}

              {/* ── Exposure row ── */}
              {hasAnalysis && totalMinLoss !== null && totalMaxLoss !== null ? (
                <div className="step-card__exposure">
                  {formatUSD(totalMinLoss)} – {formatUSD(totalMaxLoss)}
                </div>
              ) : (
                <div className="step-card__exposure step-card__exposure--prior">
                  {step.risk_factors.length} factor{step.risk_factors.length !== 1 ? 's' : ''} · exposure TBD
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
