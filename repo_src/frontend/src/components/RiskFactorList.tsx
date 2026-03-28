import type { Step, AnalysisResult, Depth } from '../types';
import { getDepthLabel } from '../utils/risk';
import { formatPct } from '../utils/formatting';

interface RiskFactorListProps {
  step: Step;
  analysisResults: Record<string, AnalysisResult>;
  riskFactorDepths: Record<string, Depth>;
  globalDepth: Depth;
  runningRiskFactorIds: Set<string>;
  selectedRiskFactorId: string | null;
  onSelectRiskFactor: (rfId: string) => void;
}

export default function RiskFactorList({
  step,
  analysisResults,
  riskFactorDepths,
  globalDepth,
  runningRiskFactorIds,
  selectedRiskFactorId,
  onSelectRiskFactor,
}: RiskFactorListProps) {
  return (
    <div className="rf-list">
      <div className="rf-list__header">
        <div className="rf-list__title">Risk Factors</div>
        <div className="rf-list__step-name">{step.name}</div>
      </div>

      {step.risk_factors.map((rf) => {
        const result = analysisResults[rf.id];
        const isRunning = runningRiskFactorIds.has(rf.id);
        const isSelected = selectedRiskFactorId === rf.id;
        const depth = riskFactorDepths[rf.id] ?? globalDepth;

        let dotClass = 'rf-item__dot--idle';
        if (isRunning) dotClass = 'rf-item__dot--running';
        else if (result) dotClass = 'rf-item__dot--done';

        return (
          <div
            key={rf.id}
            className={`rf-item${isSelected ? ' rf-item--selected' : ''}`}
            onClick={() => onSelectRiskFactor(rf.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectRiskFactor(rf.id)}
          >
            <div className={`rf-item__dot ${dotClass}`} />
            <div className="rf-item__body">
              <div className="rf-item__name">{rf.name}</div>
              {result ? (
                <div className="rf-item__metrics">
                  FR {formatPct(result.metrics.failure_rate)} · UN {formatPct(result.metrics.uncertainty)}
                </div>
              ) : isRunning ? (
                <div className="rf-item__metrics">Running…</div>
              ) : null}
            </div>
            <div className="rf-item__depth">{getDepthLabel(depth)[0]}{depth}</div>
          </div>
        );
      })}
    </div>
  );
}
