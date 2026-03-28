import { useEffect, useRef, useState } from 'react';
import { formatTokens, formatUSD } from '../utils/formatting';

export interface TopBarKPIs {
  totalExposureLow: number;
  totalExposureHigh: number;
  criticalCount: number; // FR > 0.6 or UN > 0.6
  analyzedCount: number;
  totalRiskFactors: number;
}

interface TopBarProps {
  businessName: string;
  totalTokens: number;
  kpis: TopBarKPIs | null;
  onRunAll: () => void;
  isRunningAll: boolean;
  hasSteps: boolean;
  onBack?: () => void;
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(value);
  const rafRef = useRef<number>(0);
  const prevRef = useRef(value);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    prevRef.current = value;
    if (start === end) return;

    const duration = 400;
    const startTime = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(start + (end - start) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <>{formatTokens(displayed)}</>;
}

export default function TopBar({
  businessName,
  totalTokens,
  kpis,
  onRunAll,
  isRunningAll,
  hasSteps,
  onBack,
}: TopBarProps) {
  return (
    <div className="top-bar">
      <div className="top-bar__left">
        {onBack && (
          <button className="top-bar__back" onClick={onBack} title="New business">
            ← New
          </button>
        )}
        <div className="top-bar__logo">World Token Factory</div>
        {businessName && <div className="top-bar__name">{businessName}</div>}
      </div>
      <div className="top-bar__right">
        {kpis && kpis.analyzedCount > 0 && (
          <>
            <div className="top-bar__kpis">
              <div className="top-bar__kpi">
                <span className="top-bar__kpi-label">Total Exposure</span>
                <span className={`top-bar__kpi-value${kpis.totalExposureHigh > 50_000_000 ? ' top-bar__kpi-value--red' : kpis.totalExposureHigh > 10_000_000 ? ' top-bar__kpi-value--amber' : ''}`}>
                  {formatUSD(kpis.totalExposureLow)}–{formatUSD(kpis.totalExposureHigh)}
                </span>
              </div>
              <div className="top-bar__kpi">
                <span className="top-bar__kpi-label">Critical Risks</span>
                <span className={`top-bar__kpi-value${kpis.criticalCount > 0 ? ' top-bar__kpi-value--red' : ' top-bar__kpi-value--green'}`}>
                  {kpis.criticalCount} / {kpis.analyzedCount}
                </span>
              </div>
            </div>
            <div className="top-bar__divider" />
          </>
        )}

        <div className="top-bar__tokens">
          <span className="top-bar__tokens-label">Tokens</span>
          <span className="top-bar__tokens-value">
            <AnimatedNumber value={totalTokens} />
          </span>
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
