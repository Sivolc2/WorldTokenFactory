import { useState } from 'react';
import type { Step, AnalysisResult, Artifact, RiskMetrics, Depth } from '../types';
import { formatUSD, formatPct } from '../utils/formatting';
import DepthPicker from './DepthPicker';

interface Props {
  businessName: string;
  steps: Step[];
  analysisResults: Record<string, AnalysisResult>;
  selectedRfId: string | null;
  runningRfIds: Set<string>;
  riskFactorDepths: Record<string, Depth>;
  globalDepth: Depth;
  onSelectRf: (rfId: string) => void;
  onAnalyse: (rfId: string) => void;
  onDepthChange: (rfId: string, depth: Depth) => void;
}

function MetricPill({ metrics, faint }: { metrics: RiskMetrics; faint?: boolean }) {
  return (
    <span className={`er-pill ${faint ? 'er-pill--faint' : ''}`}>
      <span className="er-pill__fr">FR {formatPct(metrics.failure_rate)}</span>
      <span className="er-pill__dot">·</span>
      <span className="er-pill__un">Un {formatPct(metrics.uncertainty)}</span>
      <span className="er-pill__dot">·</span>
      <span className="er-pill__range">
        {formatUSD(metrics.loss_range_low)}–{formatUSD(metrics.loss_range_high)}
      </span>
    </span>
  );
}

function ArtifactIcon({ type }: { type: string }) {
  switch (type) {
    case 'video': return <>🎬</>;
    case 'map':   return <>🗺</>;
    case 'url':
    case 'youtube': return <>🔗</>;
    default:      return <>📄</>;
  }
}

export default function ExecutiveReport({
  businessName,
  steps,
  analysisResults,
  selectedRfId,
  runningRfIds,
  riskFactorDepths,
  globalDepth,
  onSelectRf,
  onAnalyse,
  onDepthChange,
}: Props) {
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(new Set());

  // Build global reference index (filename → refNumber), in order of appearance
  const refMap = new Map<string, number>();
  const refArtifacts: Artifact[] = [];
  let refN = 1;
  for (const step of steps) {
    for (const rf of step.risk_factors) {
      for (const art of (analysisResults[rf.id]?.artifacts ?? [])) {
        if (!refMap.has(art.filename)) {
          refMap.set(art.filename, refN++);
          refArtifacts.push(art);
        }
      }
    }
  }

  const toggleGaps = (rfId: string) => {
    setExpandedGaps((prev) => {
      const next = new Set(prev);
      next.has(rfId) ? next.delete(rfId) : next.add(rfId);
      return next;
    });
  };

  const analyzedCount = Object.keys(analysisResults).length;
  const totalRfs = steps.flatMap(s => s.risk_factors).length;

  return (
    <div className="er-wrap">
      {/* Report header */}
      <div className="er-doc-header">
        <div className="er-doc-header__title">Risk Assessment</div>
        <div className="er-doc-header__meta">
          {businessName && <span className="er-doc-header__name">{businessName}</span>}
          <span className="er-doc-header__status">
            {analyzedCount}/{totalRfs} factors analysed
          </span>
        </div>
      </div>

      <div className="er-body">
        {steps.map((step) => (
          <section key={step.id} className="er-section">
            <div className="er-section__step-label">Step {step.position}</div>
            <h2 className="er-section__heading">{step.name}</h2>
            <p className="er-section__desc">{step.description}</p>

            {step.risk_factors.map((rf) => {
              const result = analysisResults[rf.id];
              const isRunning = runningRfIds.has(rf.id);
              const isSelected = rf.id === selectedRfId;
              const metrics = result?.metrics ?? rf.initial_metrics;
              const refs = [...new Set(
                (result?.artifacts ?? []).map(a => refMap.get(a.filename)).filter((n): n is number => n !== undefined)
              )];
              const gapsOpen = expandedGaps.has(rf.id);
              const depth = riskFactorDepths[rf.id] ?? globalDepth;

              return (
                <div
                  key={rf.id}
                  className={`er-rf ${isSelected ? 'er-rf--selected' : ''} ${!result && !isRunning ? 'er-rf--unanalyzed' : ''}`}
                  onClick={() => onSelectRf(rf.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onSelectRf(rf.id)}
                >
                  <div className="er-rf__header">
                    <span className="er-rf__name">{rf.name}</span>
                    {metrics && (
                      <MetricPill metrics={metrics} faint={!result} />
                    )}
                    {refs.length > 0 && (
                      <span className="er-rf__refs">
                        {refs.map((n) => (
                          <span key={n} className="er-ref">[{n}]</span>
                        ))}
                      </span>
                    )}
                  </div>

                  {isRunning && (
                    <div className="er-rf__running">
                      <span className="er-rf__spinner" />
                      Analysing…
                    </div>
                  )}

                  {!isRunning && result && (
                    <>
                      <p className="er-rf__summary">{result.summary}</p>
                      {result.gaps.length > 0 && (
                        <div className="er-rf__gaps">
                          <button
                            className="er-gaps__toggle"
                            onClick={(e) => { e.stopPropagation(); toggleGaps(rf.id); }}
                          >
                            {gapsOpen ? '▾' : '▸'} {result.gaps.length} gap{result.gaps.length !== 1 ? 's' : ''} identified
                          </button>
                          {gapsOpen && (
                            <ul className="er-gaps__list">
                              {result.gaps.map((g, i) => <li key={i}>{g}</li>)}
                            </ul>
                          )}
                        </div>
                      )}
                      <div className="er-rf__rerun" onClick={(e) => e.stopPropagation()}>
                        <DepthPicker
                          value={depth}
                          onChange={(d) => onDepthChange(rf.id, d)}
                          compact
                        />
                        <button className="er-rerun-btn" onClick={() => onAnalyse(rf.id)}>
                          Rerun D{depth}
                        </button>
                      </div>
                    </>
                  )}

                  {!isRunning && !result && (
                    <>
                      <p className="er-rf__desc">{rf.description}</p>
                      {rf.initial_metrics?.loss_range_note && (
                        <p className="er-rf__note">{rf.initial_metrics.loss_range_note}</p>
                      )}
                      <div className="er-rf__actions" onClick={(e) => e.stopPropagation()}>
                        <DepthPicker
                          value={depth}
                          onChange={(d) => onDepthChange(rf.id, d)}
                          compact
                        />
                        <button className="er-analyse-btn" onClick={() => onAnalyse(rf.id)}>
                          Analyse ▶
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </section>
        ))}

        {/* References */}
        {refArtifacts.length > 0 && (
          <section className="er-references">
            <h3 className="er-references__heading">Sources & Artifacts</h3>
            <div className="er-references__list">
              {refArtifacts.map((art) => (
                <div key={art.filename} className="er-reference">
                  <span className="er-ref er-ref--sm">[{refMap.get(art.filename)}]</span>
                  <ArtifactIcon type={art.type} />
                  <span className="er-reference__body">
                    <span className="er-reference__filename">{art.filename}</span>
                    <span className="er-reference__relevance">{art.relevance}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
