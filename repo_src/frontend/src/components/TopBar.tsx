import { useEffect, useRef, useState } from 'react';
import { formatTokens, formatUSD } from '../utils/formatting';
import type { Depth } from '../types';

export interface TopBarKPIs {
  totalExposureLow: number;
  totalExposureHigh: number;
  criticalCount: number;
  analyzedCount: number;
  totalRiskFactors: number;
}

export interface AnalystModel {
  id: string;
  label: string;
  sublabel: string;
}

export const ANALYST_MODELS: AnalystModel[] = [
  { id: 'claude-haiku-4-5',   label: 'Haiku',   sublabel: 'Fast' },
  { id: 'claude-sonnet-4-6',  label: 'Sonnet',  sublabel: 'Balanced' },
  { id: 'claude-opus-4-6',    label: 'Opus',    sublabel: 'Deep' },
];

interface TopBarProps {
  businessName: string;
  totalTokens: number;
  kpis: TopBarKPIs | null;
  globalDepth: Depth;
  onGlobalDepthChange: (d: Depth) => void;
  globalModel: string;
  onGlobalModelChange: (m: string) => void;
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

const DEPTHS: Depth[] = [1, 2, 3];
const DEPTH_LABELS: Record<Depth, string> = { 1: 'D1', 2: 'D2', 3: 'D3' };
const DEPTH_TITLES: Record<Depth, string> = {
  1: 'Quick Scan — filename-only, ~350 tokens',
  2: 'Research Brief — reads files, ~3k tokens',
  3: 'Deep Run — parallel agents, ~200k tokens',
};

const SPONSOR_NAMES: Array<{ key: string; label: string }> = [
  { key: 'railtracks', label: 'Railtracks' },
  { key: 'senso', label: 'Senso' },
  { key: 'nexla', label: 'Nexla' },
  { key: 'digitalocean', label: 'DigitalOcean' },
  { key: 'unkey', label: 'Unkey' },
  { key: 'augment', label: 'Augment' },
  { key: 'google_ai', label: 'Google AI' },
];

export default function TopBar({
  businessName,
  totalTokens,
  kpis,
  globalDepth,
  onGlobalDepthChange,
  globalModel,
  onGlobalModelChange,
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
                  {kpis.criticalCount}
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
          <div className="run-all-panel">
            {/* Depth picker */}
            <div className="run-all-panel__group">
              <span className="run-all-panel__group-label">Depth</span>
              <div className="run-all-picker">
                {DEPTHS.map((d) => (
                  <button
                    key={d}
                    className={`run-all-picker__btn${globalDepth === d ? ' run-all-picker__btn--active' : ''}`}
                    onClick={() => onGlobalDepthChange(d)}
                    title={DEPTH_TITLES[d]}
                    disabled={isRunningAll}
                  >
                    {DEPTH_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>

            <div className="run-all-panel__sep" />

            {/* Model picker */}
            <div className="run-all-panel__group">
              <span className="run-all-panel__group-label">Model</span>
              <select
                className="run-all-select"
                value={globalModel}
                onChange={(e) => onGlobalModelChange(e.target.value)}
                disabled={isRunningAll}
              >
                {ANALYST_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label} — {m.sublabel}</option>
                ))}
              </select>
            </div>

            <div className="run-all-panel__sep" />

            {/* Run button */}
            <button
              className="top-bar__run-all"
              onClick={onRunAll}
              disabled={isRunningAll}
            >
              {isRunningAll ? (
                <>
                  Running D{globalDepth}{' '}
                  <span className="loading-dots" style={{ fontSize: 10 }}>
                    <span /><span /><span />
                  </span>
                </>
              ) : (
                'Run ▶'
              )}
            </button>
          </div>
        )}

        <div style={{
          marginLeft: '8px',
          paddingLeft: '12px',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          fontSize: '10px',
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.03em',
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
        }}>
          <span style={{ display: 'block', marginBottom: '3px', fontWeight: 500, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.08em' }}>Built with</span>
          <span style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {SPONSOR_NAMES.map(({ key, label }) => (
              <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <span style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: '#00ff88',
                  boxShadow: '0 0 4px #00ff88',
                  flexShrink: 0,
                }} />
                <span style={{ color: 'rgba(0,255,136,0.7)' }}>{label}</span>
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
