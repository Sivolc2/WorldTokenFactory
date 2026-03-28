import { useEffect, useRef, useState } from 'react';
import { formatTokens } from '../utils/formatting';

interface TopBarProps {
  businessName: string;
  totalTokens: number;
  onRunAll: () => void;
  isRunningAll: boolean;
  hasSteps: boolean;
}

export default function TopBar({
  businessName,
  totalTokens,
  onRunAll,
  isRunningAll,
  hasSteps,
}: TopBarProps) {
  const [displayedTokens, setDisplayedTokens] = useState(totalTokens);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = displayedTokens;
    const end = totalTokens;
    if (start === end) return;

    const duration = 400;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayedTokens(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [totalTokens]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="top-bar">
      <div className="top-bar__logo">World Token Factory</div>
      {businessName && <div className="top-bar__name">{businessName}</div>}
      <div className="top-bar__right">
        <div className="top-bar__tokens">
          <span className="top-bar__tokens-label">Tokens</span>
          <span className="top-bar__tokens-value">{formatTokens(displayedTokens)}</span>
        </div>
        {hasSteps && (
          <button
            className="top-bar__run-all"
            onClick={onRunAll}
            disabled={isRunningAll}
          >
            {isRunningAll ? (
              <>
                Running{' '}
                <span className="loading-dots" style={{ fontSize: 10 }}>
                  <span /><span /><span />
                </span>
              </>
            ) : (
              'Run All ▶'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
