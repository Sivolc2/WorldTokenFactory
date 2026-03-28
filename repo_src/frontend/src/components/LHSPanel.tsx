import type { Step, RiskFactor, AnalysisResult, Depth } from '../types';
import RiskBarChart from './RiskBarChart';
import ArtifactList from './ArtifactList';
import DepthPicker from './DepthPicker';
import TokenEfficiencyChart, { type ChartPoint } from './TokenEfficiencyChart';

interface LHSPanelProps {
  selectedStep: Step | null;
  selectedRfId: string | null;
  analysisResults: Record<string, AnalysisResult>;
  riskFactorDepths: Record<string, Depth>;
  globalDepth: Depth;
  runningRiskFactorIds: Set<string>;
  onSelectRf: (rfId: string) => void;
  onDepthChange: (rfId: string, depth: Depth) => void;
  onAnalyse: (rfId: string) => void;
  tokenHistory: ChartPoint[];
  forecastCurve: ChartPoint[];
  riskThreshold: number | null;
  onThresholdChange: (v: number) => void;
}

export default function LHSPanel({
  selectedStep,
  selectedRfId,
  analysisResults,
  riskFactorDepths,
  globalDepth,
  runningRiskFactorIds,
  onSelectRf,
  onDepthChange,
  onAnalyse,
  tokenHistory,
  forecastCurve,
  riskThreshold,
  onThresholdChange,
}: LHSPanelProps) {
  const selectedResult = selectedRfId ? analysisResults[selectedRfId] : undefined;
  const selectedRf: RiskFactor | undefined = selectedStep?.risk_factors.find(
    (rf) => rf.id === selectedRfId
  );

  const showChart = tokenHistory.length > 0 || forecastCurve.length > 0;

  return (
    <div className="lhs-panel">
      {/* Token efficiency chart — always shown when data is available */}
      {showChart && (
        <div className="lhs-section lhs-section--chart">
          <TokenEfficiencyChart
            liveCurve={tokenHistory}
            forecastCurve={forecastCurve}
            threshold={riskThreshold}
            onThresholdChange={onThresholdChange}
          />
        </div>
      )}

      {selectedStep ? (
        <>
          {/* Section: risk comparison bars */}
          <div className="lhs-section">
            <div className="lhs-section__title">Risk Factors — {selectedStep.name}</div>
            <RiskBarChart
              riskFactors={selectedStep.risk_factors}
              analysisResults={analysisResults}
              runningRiskFactorIds={runningRiskFactorIds}
              selectedRfId={selectedRfId}
              onSelect={onSelectRf}
            />
          </div>

          {/* Section: depth & quick-run for selected RF */}
          {selectedRf && !analysisResults[selectedRf.id] && !runningRiskFactorIds.has(selectedRf.id) && (
            <div className="lhs-section lhs-section--run">
              <div className="lhs-section__title">Analyse · {selectedRf.name}</div>
              <div className="lhs-run-row">
                <DepthPicker
                  value={riskFactorDepths[selectedRf.id] ?? globalDepth}
                  onChange={(d) => onDepthChange(selectedRf.id, d)}
                  compact
                />
                <button
                  className="lhs-run-btn"
                  onClick={() => onAnalyse(selectedRf.id)}
                >
                  Run ▶
                </button>
              </div>
            </div>
          )}

          {/* Section: artifacts for selected RF */}
          {selectedResult && selectedResult.artifacts.length > 0 && (
            <div className="lhs-section lhs-section--artifacts">
              <ArtifactList artifacts={selectedResult.artifacts} />
            </div>
          )}
        </>
      ) : (
        <div className="lhs-empty">Select a step from the map to see its risk factors</div>
      )}
    </div>
  );
}
