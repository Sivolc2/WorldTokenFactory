import type { Depth } from '../types';
import { getDepthLabel } from '../utils/risk';

interface DepthPickerProps {
  value: Depth;
  onChange: (depth: Depth) => void;
  compact?: boolean;
}

const DEPTHS: Depth[] = [1, 2, 3];

export default function DepthPicker({ value, onChange, compact = false }: DepthPickerProps) {
  return (
    <div className={`depth-picker${compact ? ' depth-picker--compact' : ''}`}>
      {DEPTHS.map((d) => (
        <button
          key={d}
          className={`depth-picker__option${value === d ? ' depth-picker__option--active' : ''}`}
          onClick={() => onChange(d)}
          title={getDepthLabel(d)}
        >
          <span className="depth-picker__num">{d}</span>
          <span className="depth-picker__label">{getDepthLabel(d)}</span>
        </button>
      ))}
    </div>
  );
}
