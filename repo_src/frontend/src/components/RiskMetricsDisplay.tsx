import type { RiskMetrics } from '../types';
import { riskBarColor, riskLabel } from '../utils/risk';
import { formatPct, formatUSD } from '../utils/formatting';

interface RiskMetricsDisplayProps {
  metrics: RiskMetrics;
  dark?: boolean;
}

function RiskBar({ label, value }: { label: string; value: number; dark?: boolean }) {
  const color = riskBarColor(value);
  return (
    <div className="risk-bar-row">
      <div className="risk-bar-header">
        <span className="risk-bar-label">{label}</span>
        <div className="risk-bar-values">
          <span className="risk-bar-pct">{formatPct(value)}</span>
          <span className="risk-bar-tag" style={{ background: color }}>{riskLabel(value)}</span>
        </div>
      </div>
      <div className="risk-bar-track">
        <div className="risk-bar-fill" style={{ width: `${value * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export default function RiskMetricsDisplay({ metrics, dark = false }: RiskMetricsDisplayProps) {
  const { failure_rate, uncertainty, loss_range_low, loss_range_high, loss_range_note } = metrics;
  return (
    <div className={`risk-metrics${dark ? ' risk-metrics--dark' : ''}`}>
      <RiskBar label="Failure Rate" value={failure_rate} dark={dark} />
      <RiskBar label="Uncertainty"  value={uncertainty}  dark={dark} />
      <div className="risk-loss-range">
        <div className="risk-loss-header">Potential Loss</div>
        <div className="risk-loss-bar-container">
          <div className="risk-loss-bar-fill" style={{ left: '0%', width: '100%' }} />
        </div>
        <div className="risk-loss-labels">
          <span>{formatUSD(loss_range_low)}</span>
          <span>{formatUSD(loss_range_high)}</span>
        </div>
        {loss_range_note && <div className="risk-loss-note">⚠ {loss_range_note}</div>}
      </div>
    </div>
  );
}
