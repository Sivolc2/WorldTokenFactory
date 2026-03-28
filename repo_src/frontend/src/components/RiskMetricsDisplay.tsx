import type { RiskMetrics } from '../types';
import { riskBarColor, riskLabel } from '../utils/risk';
import { formatPct, formatUSD } from '../utils/formatting';

interface RiskMetricsDisplayProps {
  metrics: RiskMetrics;
}

function RiskBar({ label, value }: { label: string; value: number }) {
  const color = riskBarColor(value);
  const tag = riskLabel(value);

  return (
    <div className="risk-bar-row">
      <div className="risk-bar-header">
        <span className="risk-bar-label">{label}</span>
        <div className="risk-bar-values">
          <span className="risk-bar-pct">{formatPct(value)}</span>
          <span className="risk-bar-tag" style={{ background: color }}>
            {tag}
          </span>
        </div>
      </div>
      <div className="risk-bar-track">
        <div
          className="risk-bar-fill"
          style={{ width: `${value * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function RiskMetricsDisplay({ metrics }: RiskMetricsDisplayProps) {
  const { failure_rate, uncertainty, loss_range_low, loss_range_high, loss_range_note } = metrics;

  // Position the range bar relative to a log scale or just linear within range
  const totalRange = loss_range_high - loss_range_low;
  const barLeft = totalRange > 0 ? 0 : 0; // always starts at left edge
  const barWidth = 100; // the whole bar represents the range

  return (
    <div className="risk-metrics">
      <RiskBar label="Failure Rate" value={failure_rate} />
      <RiskBar label="Uncertainty" value={uncertainty} />

      <div className="risk-loss-range">
        <div className="risk-loss-header">Potential Loss</div>
        <div className="risk-loss-bar-container">
          <div
            className="risk-loss-bar-fill"
            style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
          />
        </div>
        <div className="risk-loss-labels">
          <span>{formatUSD(loss_range_low)}</span>
          <span>{formatUSD(loss_range_high)}</span>
        </div>
        {loss_range_note && (
          <div className="risk-loss-note">
            ⚠ {loss_range_note}
          </div>
        )}
      </div>
    </div>
  );
}
