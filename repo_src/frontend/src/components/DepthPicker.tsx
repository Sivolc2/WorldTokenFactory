import type { Depth } from '../types';
import { getDepthLabel } from '../utils/risk';

interface DepthPickerProps {
  value: Depth;
  onChange: (depth: Depth) => void;
  compact?: boolean;
}

const STAR_CONFIGS: Record<Depth, { filled: number; color: string; title: string }> = {
  1: { filled: 1, color: '#94a3b8', title: 'Quick Scan — fast, filename-only, ~200–500 tokens' },
  2: { filled: 2, color: '#3b82f6', title: 'Research Brief — reads files, synthesises, ~1k–5k tokens' },
  3: { filled: 3, color: '#f59e0b', title: 'Deep Run — parallel agents, full corpus, ~100k–1M+ tokens' },
};

function Stars({ count, filled, color }: { count: number; filled: number; color: string }) {
  return (
    <span className="depth-stars">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="depth-star"
          style={{ color: i < filled ? color : 'var(--color-border-strong)' }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

const DEPTHS: Depth[] = [1, 2, 3];

export default function DepthPicker({ value, onChange, compact = false }: DepthPickerProps) {
  return (
    <div className={`depth-picker${compact ? ' depth-picker--compact' : ''}`}>
      {DEPTHS.map((d) => {
        const cfg = STAR_CONFIGS[d];
        const isActive = value === d;
        return (
          <button
            key={d}
            className={`depth-picker__option${isActive ? ' depth-picker__option--active' : ''}`}
            onClick={() => onChange(d)}
            title={cfg.title}
          >
            <Stars count={3} filled={cfg.filled} color={isActive ? cfg.color : cfg.color} />
            {!compact && (
              <span className="depth-picker__label">{getDepthLabel(d)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
