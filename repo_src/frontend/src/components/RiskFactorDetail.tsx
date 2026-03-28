import type { RiskFactor, AnalysisResult, AgentThreadState, Depth } from '../types';
import { getTokenEstimate, getDepthLabel } from '../utils/risk';
import { formatTokens } from '../utils/formatting';
import DepthPicker from './DepthPicker';
import RiskMetricsDisplay from './RiskMetricsDisplay';
import ArtifactList from './ArtifactList';

interface RiskFactorDetailProps {
  riskFactor: RiskFactor;
  result: AnalysisResult | undefined;
  isRunning: boolean;
  agentThread: AgentThreadState | null;
  depth: Depth;
  onDepthChange: (rfId: string, depth: Depth) => void;
  onAnalyse: (rfId: string) => void;
  onOpenThread: () => void;
}

export default function RiskFactorDetail({
  riskFactor,
  result,
  isRunning,
  agentThread,
  depth,
  onDepthChange,
  onAnalyse,
  onOpenThread,
}: RiskFactorDetailProps) {
  const currentThread = agentThread?.risk_factor_id === riskFactor.id ? agentThread : null;
  const runningStatus = currentThread?.steps.find((s) => s.status === 'running')?.text;

  return (
    <div className="rf-detail">
      <div className="rf-detail-card">
        {/* Header — always shown */}
        <div className="rf-detail__header">
          <h2 className="rf-detail__name">{riskFactor.name}</h2>
          <p className="rf-detail__desc">{riskFactor.description}</p>

          {!result && !isRunning && (
            <div className="rf-detail__depth-info">
              <div>
                <DepthPicker
                  value={depth}
                  onChange={(d) => onDepthChange(riskFactor.id, d)}
                />
                <div className="rf-detail__token-est" style={{ marginTop: 8 }}>
                  Est. cost: <strong>{getTokenEstimate(depth)}</strong>
                </div>
              </div>
              <button
                className="rf-detail__analyse-btn"
                onClick={() => onAnalyse(riskFactor.id)}
              >
                Analyse ▶
              </button>
            </div>
          )}

          {(result || isRunning) && (
            <div className="rf-detail__depth-info">
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Depth: <strong>{getDepthLabel(depth)}</strong>
                {result && (
                  <> · Tokens used: <strong>{formatTokens(result.tokens_used)}</strong></>
                )}
              </div>
              {isRunning && (
                <button
                  className="rf-detail__analyse-btn"
                  onClick={onOpenThread}
                  style={{ background: '#374151' }}
                >
                  View Thread ▶
                </button>
              )}
            </div>
          )}
        </div>

        {/* Running state */}
        {isRunning && !result && (
          <div className="rf-detail__running">
            <div className="rf-detail__spinner" />
            <div className="rf-detail__running-info">
              <div className="rf-detail__running-status">
                {runningStatus ?? 'Scanning available data sources…'}
              </div>
              {currentThread && (
                <div className="rf-detail__running-tokens">
                  {formatTokens(currentThread.tokens_current)} tokens so far
                </div>
              )}
            </div>
          </div>
        )}

        {/* Complete state */}
        {result && (
          <>
            <div className="rf-section">
              <div className="rf-section__title">Summary</div>
              <p className="rf-section__summary">{result.summary}</p>
              <div className="rf-section__meta">
                <span>Depth {result.depth}: {getDepthLabel(result.depth)}</span>
                <span>{formatTokens(result.tokens_used)} tokens</span>
              </div>
            </div>

            {result.gaps.length > 0 && (
              <div className="rf-section">
                <div className="rf-section__title">Gaps Identified</div>
                <ul className="rf-section__gaps">
                  {result.gaps.map((gap, i) => (
                    <li key={i}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rf-section">
              <div className="rf-section__title">Risk Metrics</div>
              <RiskMetricsDisplay metrics={result.metrics} />
            </div>

            {result.artifacts.length > 0 && (
              <div className="rf-section">
                <ArtifactList artifacts={result.artifacts} />
              </div>
            )}

            {/* Re-run option */}
            <div className="rf-section" style={{ paddingTop: 12, paddingBottom: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <DepthPicker
                  value={depth}
                  onChange={(d) => onDepthChange(riskFactor.id, d)}
                  compact
                />
                <button
                  className="rf-detail__analyse-btn"
                  onClick={() => onAnalyse(riskFactor.id)}
                  style={{ height: 30, fontSize: 12 }}
                >
                  Re-run at D{depth}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
