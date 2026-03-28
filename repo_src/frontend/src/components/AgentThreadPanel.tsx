import type { AgentThreadState, Depth } from '../types';
import { getDepthLabel } from '../utils/risk';
import { formatTokens } from '../utils/formatting';

interface AgentThreadPanelProps {
  thread: AgentThreadState | null;
  isOpen: boolean;
  onClose: () => void;
  onStop?: () => void;
}

function StepIcon({ status }: { status: 'complete' | 'running' | 'pending' }) {
  if (status === 'complete') return <span className="thread-step__icon thread-step__icon--complete">✓</span>;
  if (status === 'running') return <span className="thread-step__icon thread-step__icon--running">⟳</span>;
  return <span className="thread-step__icon thread-step__icon--pending">○</span>;
}

function DepthOneOrTwoThread({ thread }: { thread: AgentThreadState }) {
  return (
    <div className="thread-panel__steps">
      {thread.steps.map((step) => (
        <div key={step.id} className="thread-step">
          <div className="thread-step__row">
            <StepIcon status={step.status} />
            <span className={`thread-step__text thread-step__text--${step.status}`}>
              {step.text}
            </span>
          </div>
          {step.sub_items.length > 0 && (
            <div className="thread-step__sub">
              {step.sub_items.map((item, i) => (
                <div key={i} className="thread-step__sub-item">└ {item}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DepthThreeThread({ thread }: { thread: AgentThreadState }) {
  return (
    <div className="thread-panel__steps">
      <div className="thread-parallel">
        <div className="thread-parallel__label">Parallelized agent threads:</div>
        {thread.steps.map((step) => (
          <div key={step.id} className="thread-parallel__item">
            <StepIcon status={step.status} />
            <span className="thread-parallel__thread-label">{step.id}</span>
            <span
              className={`thread-parallel__thread-name thread-step__text--${step.status}`}
            >
              {step.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TokenBar({
  current,
  estimated,
  depth,
}: {
  current: number;
  estimated: number;
  depth: Depth;
}) {
  const pct = estimated > 0 ? Math.min((current / estimated) * 100, 100) : 0;

  return (
    <div className="thread-token-bar">
      <div className="thread-token-bar__header">
        <span>
          {depth === 3 ? `Tokens so far: ${formatTokens(current)}` : `${formatTokens(current)} / ~${formatTokens(estimated)} tokens`}
        </span>
        {depth === 3 && <span>Est. full run: ~24hr compute</span>}
      </div>
      <div className="thread-token-bar__track">
        <div className="thread-token-bar__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AgentThreadPanel({
  thread,
  isOpen,
  onClose,
  onStop,
}: AgentThreadPanelProps) {
  return (
    <div className={`thread-overlay${isOpen ? ' thread-overlay--open' : ''}`}>
      <div className="thread-panel">
        {thread ? (
          <>
            <div className="thread-panel__header">
              <div className="thread-panel__title-block">
                <div className="thread-panel__label">
                  Agent Thread{thread.depth === 3 ? ' · Deep Run' : ''}
                </div>
                <div className="thread-panel__name">{thread.risk_factor_name}</div>
                <span className="thread-panel__depth-badge">{getDepthLabel(thread.depth)}</span>
              </div>
              <button className="thread-panel__close" onClick={onClose} title="Close panel">
                ×
              </button>
            </div>

            {thread.depth === 3 ? (
              <DepthThreeThread thread={thread} />
            ) : (
              <DepthOneOrTwoThread thread={thread} />
            )}

            <div className="thread-panel__footer">
              <TokenBar
                current={thread.tokens_current}
                estimated={thread.tokens_estimated}
                depth={thread.depth}
              />
              {!thread.is_complete && onStop && (
                <button className="thread-stop-btn" onClick={onStop}>
                  Stop &amp; use partial results
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="thread-panel__header">
            <div className="thread-panel__title-block">
              <div className="thread-panel__label">Agent Thread</div>
              <div className="thread-panel__name" style={{ color: 'var(--thread-muted)' }}>
                No agent running
              </div>
            </div>
            <button className="thread-panel__close" onClick={onClose} title="Close panel">
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
