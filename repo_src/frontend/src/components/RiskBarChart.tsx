import type { RiskFactor, AnalysisResult, RiskMetrics } from '../types';
import { riskScoreToColor } from '../utils/risk';
import { formatUSD, formatTokens } from '../utils/formatting';

interface RiskBarChartProps {
  riskFactors: RiskFactor[];
  analysisResults: Record<string, AnalysisResult>;
  runningRiskFactorIds: Set<string>;
  selectedRfId: string | null;
  onSelect: (rfId: string) => void;
}

/** Derives a failure-rate range [low, high] from a point estimate + uncertainty. */
function frRange(fr: number, un: number): [number, number] {
  const low  = Math.max(0,    fr * (1 - un));
  const high = Math.min(1, fr + (1 - fr) * un * 0.6);
  return [low, high];
}

function fmtPct(v: number) { return `${Math.round(v * 100)}%`; }

function ExposureBar({
  metrics,
  maxLoss,
  isInitial = false,
}: {
  metrics: RiskMetrics;
  maxLoss: number;
  isInitial?: boolean;
}) {
  const scale   = maxLoss > 0 ? maxLoss : 1;
  const lowPct  = (metrics.loss_range_low  / scale) * 100;
  const highPct = (metrics.loss_range_high / scale) * 100;
  const midPct  = (lowPct + highPct) / 2;
  const score   = (metrics.failure_rate + metrics.uncertainty) / 2;
  const color   = riskScoreToColor(score);
  const [frLow, frHigh] = frRange(metrics.failure_rate, metrics.uncertainty);

  return (
    <div className={`rbc-exposure-row${isInitial ? ' rbc-exposure-row--initial' : ''}`}>
      <div className="rbc-bar-track">
        <div className="rbc-bar-fill rbc-bar-fill--floor"
          style={{ width: `${lowPct}%`, background: color }} />
        <div className="rbc-bar-fill rbc-bar-fill--range"
          style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%`, background: color }} />
        <div className="rbc-bar-marker"
          style={{ left: `${midPct}%`, background: color }} />
      </div>
      <div className="rbc-side-labels">
        <span className={`rbc-exposure-val${isInitial ? ' rbc-exposure-val--initial' : ''}`}>
          {isInitial && '~'}{formatUSD(metrics.loss_range_low)}–{formatUSD(metrics.loss_range_high)}
        </span>
        <span className={`rbc-fr-range${isInitial ? ' rbc-fr-range--initial' : ''}`}>
          {isInitial && '~'}{fmtPct(frLow)}–{fmtPct(frHigh)} FR
        </span>
      </div>
    </div>
  );
}

export default function RiskBarChart({
  riskFactors,
  analysisResults,
  runningRiskFactorIds,
  selectedRfId,
  onSelect,
}: RiskBarChartProps) {
  // Shared scale: max loss_range_high across all factors with any metrics
  const maxLoss = riskFactors.reduce((m, rf) => {
    const r = analysisResults[rf.id];
    const hi = r?.metrics.loss_range_high ?? rf.initial_metrics?.loss_range_high ?? 0;
    return Math.max(m, hi);
  }, 0);

  return (
    <div className="rbc">
      {riskFactors.map((rf) => {
        const result     = analysisResults[rf.id];
        const isRunning  = runningRiskFactorIds.has(rf.id);
        const isSelected = rf.id === selectedRfId;
        const metrics    = result?.metrics ?? rf.initial_metrics;
        const isInitial  = !result && !!rf.initial_metrics;

        return (
          <button
            key={rf.id}
            className={`rbc-row${isSelected ? ' rbc-row--selected' : ''}${isInitial ? ' rbc-row--initial' : ''}`}
            onClick={() => onSelect(rf.id)}
          >
            <div className="rbc-header">
              <span className="rbc-label" title={rf.name}>{rf.name}</span>
              {result && (
                <span className="rbc-token-badge">
                  {formatTokens(result.tokens_used)} tok
                </span>
              )}
            </div>

            {isRunning ? (
              <div className="rbc-pending">
                <span className="loading-dots" style={{ color: 'var(--color-accent)' }}>
                  <span /><span /><span />
                </span>
                <span>Analysing…</span>
              </div>
            ) : metrics ? (
              <ExposureBar metrics={metrics} maxLoss={maxLoss} isInitial={isInitial} />
            ) : (
              <div className="rbc-pending rbc-pending--idle">Not analysed</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
