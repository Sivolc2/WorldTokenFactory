import type { Step, AnalysisResult } from '../types';
import StepBox from './StepBox';

interface BusinessFlowChartProps {
  steps: Step[];
  analysisResults: Record<string, AnalysisResult>;
  selectedStepId: string | null;
  runningRiskFactorIds: Set<string>;
  onSelectStep: (stepId: string) => void;
}

export default function BusinessFlowChart({
  steps,
  analysisResults,
  selectedStepId,
  runningRiskFactorIds,
  onSelectStep,
}: BusinessFlowChartProps) {
  return (
    <div className="flow-chart">
      <div className="flow-chart__row">
        {steps.map((step, i) => {
          const isAnyRunning = step.risk_factors.some((rf) =>
            runningRiskFactorIds.has(rf.id)
          );

          return (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && (
                <div
                  className={`flow-arrow${
                    analysisResults[step.risk_factors[0]?.id] ? ' flow-arrow--active' : ''
                  }`}
                >
                  →
                </div>
              )}
              <StepBox
                step={step}
                analysisResults={analysisResults}
                isSelected={selectedStepId === step.id}
                isAnyRunning={isAnyRunning}
                onClick={() => onSelectStep(step.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
