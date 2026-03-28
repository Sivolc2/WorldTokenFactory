import { useEffect, useState } from 'react';
import type { Step, AnalysisResult } from '../types';
import { riskScoreToColor, getStepRiskScore } from '../utils/risk';
import { formatPct, formatUSD } from '../utils/formatting';

interface StepBoxProps {
  step: Step;
  analysisResults: Record<string, AnalysisResult>;
  isSelected: boolean;
  isAnyRunning: boolean;
  onClick: () => void;
  animateIn?: boolean;
}

export default function StepBox({
  step,
  analysisResults,
  isSelected,
  isAnyRunning,
  onClick,
  animateIn = true,
}: StepBoxProps) {
  const [visible, setVisible] = useState(!animateIn);

  useEffect(() => {
    if (animateIn) {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
  }, [animateIn]);

  const riskScore = getStepRiskScore(step, analysisResults);
  const bgColor = riskScoreToColor(riskScore);

  // Aggregate metrics across analyzed risk factors for this step
  const analyzed = step.risk_factors.filter((rf) => analysisResults[rf.id]);
  const hasMetrics = analyzed.length > 0;

  let avgFR = 0;
  let avgUN = 0;
  let minLoss = Infinity;
  let maxLoss = -Infinity;

  if (hasMetrics) {
    for (const rf of analyzed) {
      const r = analysisResults[rf.id];
      avgFR += r.metrics.failure_rate;
      avgUN += r.metrics.uncertainty;
      minLoss = Math.min(minLoss, r.metrics.loss_range_low);
      maxLoss = Math.max(maxLoss, r.metrics.loss_range_high);
    }
    avgFR /= analyzed.length;
    avgUN /= analyzed.length;
  }

  const runningCount = step.risk_factors.filter(
    (rf) => isAnyRunning && !analysisResults[rf.id]
  ).length;

  return (
    <div
      className={`step-box${visible ? ' step-box--visible' : ''}${isSelected ? ' step-box--selected' : ''}`}
      style={{ background: bgColor }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="step-box__name">{step.name}</div>

      {hasMetrics ? (
        <>
          <div className="step-box__metrics">
            <div className="step-box__metric">
              <span className="step-box__metric-label">FR</span>
              <span className="step-box__metric-value">{formatPct(avgFR)}</span>
            </div>
            <div className="step-box__metric">
              <span className="step-box__metric-label">UN</span>
              <span className="step-box__metric-value">{formatPct(avgUN)}</span>
            </div>
          </div>
          <div className="step-box__loss">
            {formatUSD(minLoss)} – {formatUSD(maxLoss)}
          </div>
        </>
      ) : runningCount > 0 ? (
        <div className="step-box__analyzing">
          <div className="loading-dots" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <span /><span /><span />
          </div>
          Analysing…
        </div>
      ) : (
        <div className="step-box__analyzing">
          {step.risk_factors.length} risk factor{step.risk_factors.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
