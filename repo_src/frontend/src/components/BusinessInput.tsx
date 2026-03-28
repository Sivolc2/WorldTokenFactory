import { useState } from 'react';
import type { Depth } from '../types';
import DepthPicker from './DepthPicker';

const EXAMPLES = [
  {
    emoji: '🐭',
    label: 'Lemming Farmers Inc.',
    description:
      'Small-scale lemming farming operation in the Norwegian Arctic with natural habitat management, seasonal harvesting, and direct-to-consumer distribution.',
  },
  {
    emoji: '🛢️',
    label: 'Gulf Coast Oil Operator',
    description:
      'Oil company with offshore drilling operations in the Gulf of Mexico, pipeline infrastructure across Texas and Louisiana, and refining capacity in Galveston.',
  },
];

interface BusinessInputProps {
  globalDepth: Depth;
  onGlobalDepthChange: (depth: Depth) => void;
  onSubmit: (description: string) => void;
  isLoading: boolean;
}

export default function BusinessInput({
  globalDepth,
  onGlobalDepthChange,
  onSubmit,
  isLoading,
}: BusinessInputProps) {
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    const trimmed = description.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
  };

  return (
    <div className="input-screen">
      <div className="input-card">
        <h1 className="input-card__heading">What business are we analysing?</h1>
        <p className="input-card__sub">
          Describe your business, and we'll map its risk factors and show the token cost to close
          each knowledge gap.
        </p>

        <textarea
          className="input-card__textarea"
          placeholder="e.g. Oil company with offshore drilling in the Gulf of Mexico and pipeline infrastructure across Texas and Louisiana"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
          disabled={isLoading}
        />

        <div className="input-card__examples">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              className="input-card__example-btn"
              onClick={() => setDescription(ex.description)}
              disabled={isLoading}
            >
              {ex.emoji} {ex.label}
            </button>
          ))}
        </div>

        <div className="input-card__depth-section">
          <div className="input-card__depth-label">Default analysis depth</div>
          <DepthPicker value={globalDepth} onChange={onGlobalDepthChange} />
        </div>

        <div className="input-card__footer">
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!description.trim() || isLoading}
          >
            {isLoading ? (
              <>
                Analysing{' '}
                <span className="loading-dots">
                  <span /><span /><span />
                </span>
              </>
            ) : (
              'Analyse Business →'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
