import { useState } from 'react';
import type { Depth } from '../types';
import DepthPicker from './DepthPicker';

const ACCOUNTS = [
  {
    id: 'lemming',
    name: 'Lemming Farmers Inc.',
    email: 'admin@lemmingfarmers.no',
    avatarBg: '#e8710a',
    initial: 'L',
    description:
      'Small-scale lemming farming operation in the Norwegian Arctic with natural habitat management, seasonal harvesting, and direct-to-consumer distribution.',
  },
  {
    id: 'oil',
    name: 'Gulf Coast Oil Operator',
    email: 'ops@gulfcoastoil.com',
    avatarBg: '#1a73e8',
    initial: 'G',
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState('');

  const handleContinue = () => {
    if (isLoading) return;
    if (showCustom && customText.trim()) {
      onSubmit(customText.trim());
    } else if (selectedId) {
      const account = ACCOUNTS.find((a) => a.id === selectedId);
      if (account) onSubmit(account.description);
    }
  };

  const canContinue = showCustom ? customText.trim().length > 0 : selectedId !== null;

  return (
    <div className="gws-screen">
      <div className="gws-card">
        {/* Google-style logo */}
        <div className="gws-logo">
          <svg width="75" height="24" viewBox="0 0 75 24" aria-label="Google">
            <path d="M29.66 12.22c0-.69-.06-1.35-.17-1.99H16.5v3.77h7.38a6.3 6.3 0 0 1-2.73 4.14v3.44h4.42c2.58-2.38 4.09-5.88 4.09-9.36z" fill="#4285F4"/>
            <path d="M16.5 23.5c3.7 0 6.8-1.23 9.07-3.33l-4.42-3.44c-1.22.82-2.79 1.3-4.65 1.3-3.57 0-6.6-2.41-7.68-5.65H4.28v3.56A13.5 13.5 0 0 0 16.5 23.5z" fill="#34A853"/>
            <path d="M8.82 12.38a8.11 8.11 0 0 1 0-5.16V3.66H4.28A13.5 13.5 0 0 0 3 10.8c0 2.18.52 4.24 1.44 6.07l4.38-3.45z" fill="#FBBC05"/>
            <path d="M16.5 5.57c2.01 0 3.81.69 5.23 2.05l3.92-3.92C23.3 1.48 20.2.5 16.5.5A13.5 13.5 0 0 0 4.28 8.06l4.54 3.56c1.08-3.24 4.11-5.65 7.68-5.65z" fill="#EA4335"/>
            <text x="37" y="18" fontFamily="'Google Sans', Roboto, Arial, sans-serif" fontSize="14" fontWeight="500" fill="#5f6368">Workspace</text>
          </svg>
        </div>

        {!showCustom ? (
          <>
            <h1 className="gws-card__title">Choose an account</h1>
            <p className="gws-card__sub">to continue to World Token Factory</p>

            <div className="gws-accounts">
              {ACCOUNTS.map((account) => (
                <button
                  key={account.id}
                  className={`gws-account${selectedId === account.id ? ' gws-account--selected' : ''}`}
                  onClick={() => setSelectedId(account.id)}
                  disabled={isLoading}
                >
                  <div className="gws-account__avatar" style={{ background: account.avatarBg }}>
                    {account.initial}
                  </div>
                  <div className="gws-account__info">
                    <div className="gws-account__name">{account.name}</div>
                    <div className="gws-account__email">{account.email}</div>
                  </div>
                  {selectedId === account.id && (
                    <span className="gws-account__check">✓</span>
                  )}
                </button>
              ))}

              <button
                className="gws-account gws-account--other"
                onClick={() => { setSelectedId(null); setShowCustom(true); }}
                disabled={isLoading}
              >
                <div className="gws-account__avatar gws-account__avatar--add">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="11" stroke="#5f6368" strokeWidth="1.5"/>
                    <path d="M12 7v10M7 12h10" stroke="#5f6368" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="gws-account__info">
                  <div className="gws-account__name">Use another account</div>
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="gws-card__title">Sign in</h1>
            <p className="gws-card__sub">to continue to World Token Factory</p>

            <textarea
              className="gws-textarea"
              placeholder="Describe your business — e.g. software company selling B2B analytics tools in the healthcare sector"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleContinue(); }}
              rows={4}
              disabled={isLoading}
              autoFocus
            />

            <button
              className="gws-back-link"
              onClick={() => { setShowCustom(false); setCustomText(''); }}
            >
              ← Back to accounts
            </button>
          </>
        )}

        <div className="gws-card__footer">
          <div className="gws-depth-row">
            <span className="gws-depth-label">Analysis depth</span>
            <DepthPicker value={globalDepth} onChange={onGlobalDepthChange} compact />
          </div>
          <button
            className="gws-continue-btn"
            onClick={handleContinue}
            disabled={!canContinue || isLoading}
          >
            {isLoading ? (
              <span className="loading-dots"><span /><span /><span /></span>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </div>

      <p className="gws-screen__legal">
        Not your computer? Use a private browsing window to sign in.{' '}
        <a href="#" onClick={(e) => e.preventDefault()}>Learn more about using Guest mode</a>
      </p>
    </div>
  );
}
