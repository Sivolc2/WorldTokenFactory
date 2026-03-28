import { useState } from 'react';
import type { RiskFactor, AnalysisResult, AgentThreadState, Depth } from '../types';
import { getDepthLabel } from '../utils/risk';
import { formatTokens } from '../utils/formatting';
import DepthPicker from './DepthPicker';
import RiskMetricsDisplay from './RiskMetricsDisplay';

interface RHSPanelProps {
  selectedRf: RiskFactor | null;
  result: AnalysisResult | undefined;
  isRunning: boolean;
  agentThread: AgentThreadState | null;
  depth: Depth;
  onDepthChange: (rfId: string, depth: Depth) => void;
  onAnalyse: (rfId: string, feedback?: string) => void;
}

function ThreadIcon({ status }: { status: 'complete' | 'running' | 'pending' }) {
  if (status === 'complete') return <span className="rhs-step__icon rhs-step__icon--done">✓</span>;
  if (status === 'running')  return <span className="rhs-step__icon rhs-step__icon--run">⟳</span>;
  return <span className="rhs-step__icon rhs-step__icon--wait">○</span>;
}

export default function RHSPanel({
  selectedRf,
  result,
  isRunning,
  agentThread,
  depth,
  onDepthChange,
  onAnalyse,
}: RHSPanelProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const thread = agentThread;

  return (
    <div className="rhs-panel">
      {/* ── RF header card ── */}
      {selectedRf ? (
        <div className="rhs-rf-card">
          <div className="rhs-rf-card__name">{selectedRf.name}</div>
          <p className="rhs-rf-card__desc">{selectedRf.description}</p>
          <div className="rhs-rf-card__controls">
            <DepthPicker
              value={depth}
              onChange={(d) => onDepthChange(selectedRf.id, d)}
              compact
            />
            {!isRunning && (
              <button
                className="rhs-analyse-btn"
                onClick={() => onAnalyse(selectedRf.id)}
              >
                {result ? `Re-run D${depth}` : 'Analyse ▶'}
              </button>
            )}
          </div>
          {result && !isRunning && (
            <div className="rhs-result-meta">
              <span>{getDepthLabel(result.depth)}</span>
              <span>{formatTokens(result.tokens_used)} tokens</span>
            </div>
          )}
        </div>
      ) : (
        <div className="rhs-empty-header">
          Select a risk factor from the left panel
        </div>
      )}

      {/* ── Agent thread / chat ── */}
      <div className="rhs-thread">
        {thread ? (
          <>
            <div className="rhs-thread__label">
              {thread.is_complete ? 'Analysis complete' : 'Agent thread'}
              {' · '}{thread.risk_factor_name}
            </div>
            {thread.is_complete && selectedRf && (
              <div className="rhs-feedback">
                {!feedbackOpen ? (
                  <button className="rhs-feedback__toggle" onClick={() => setFeedbackOpen(true)}>
                    ✏️ Add feedback &amp; rerun
                  </button>
                ) : (
                  <div className="rhs-feedback__panel">
                    <div className="rhs-feedback__label">What's wrong or missing?</div>
                    <textarea
                      className="rhs-feedback__textarea"
                      placeholder="e.g. The loss range seems too low. Focus more on regulatory fines and third-party liability."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      rows={4}
                    />
                    <div className="rhs-feedback__actions">
                      <button
                        className="rhs-feedback__cancel"
                        onClick={() => { setFeedbackOpen(false); setFeedbackText(''); }}
                      >
                        Cancel
                      </button>
                      <button
                        className="rhs-feedback__rerun"
                        disabled={!feedbackText.trim()}
                        onClick={() => {
                          onAnalyse(selectedRf.id, feedbackText.trim());
                          setFeedbackOpen(false);
                          setFeedbackText('');
                        }}
                      >
                        Rerun with feedback ▶
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="rhs-thread__steps">
              {thread.steps.map((step) => (
                <div key={step.id} className="rhs-step">
                  <div className="rhs-step__row">
                    <ThreadIcon status={step.status} />
                    <span className={`rhs-step__text rhs-step__text--${step.status}`}>
                      {step.text}
                    </span>
                  </div>
                  {step.sub_items.map((item, i) => (
                    <div key={i} className="rhs-step__sub">└ {item}</div>
                  ))}
                </div>
              ))}
            </div>

            {/* Token bar */}
            <div className="rhs-token-bar">
              <div className="rhs-token-bar__row">
                <span>{formatTokens(thread.tokens_current)} tokens</span>
                {!thread.is_complete && (
                  <span>est. ~{formatTokens(thread.tokens_estimated)}</span>
                )}
              </div>
              <div className="rhs-token-bar__track">
                <div
                  className="rhs-token-bar__fill"
                  style={{
                    width: thread.tokens_estimated > 0
                      ? `${Math.min((thread.tokens_current / thread.tokens_estimated) * 100, 100)}%`
                      : '0%',
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="rhs-thread__empty">
            Run an analysis to see the agent reasoning here
          </div>
        )}
      </div>

      {/* ── Result metrics (scrollable bottom section) ── */}
      {result && (
        <div className="rhs-result">
          {result.gaps.length > 0 && (
            <div className="rhs-result__section">
              <div className="rhs-result__label">Gaps identified</div>
              <ul className="rhs-gaps">
                {result.gaps.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>
          )}
          <div className="rhs-result__section">
            <div className="rhs-result__label">Risk metrics</div>
            <RiskMetricsDisplay metrics={result.metrics} />
          </div>
        </div>
      )}
    </div>
  );
}
