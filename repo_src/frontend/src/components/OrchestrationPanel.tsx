/**
 * OrchestrationPanel — Live visualization of the master orchestrator.
 * Shows parallel data gathering, model routing, reasoning chain, and evidence synthesis.
 * Consumes NDJSON from /api/orchestrate/analyse.
 */
import { useState, useCallback, useRef, useEffect } from 'react';

const API_BASE = (import.meta as unknown as { env: Record<string, string | undefined> }).env?.VITE_API_URL ?? '';

// ── Types ────────────────────────────────────────────────────────────

interface OrchestratorEvent {
  event: 'step' | 'signal' | 'file_found' | 'token_update' | 'complete' | 'error';
  text?: string;
  filename?: string;
  domain?: string;
  tokens?: number;
  result?: Record<string, unknown>;
  orchestrator_meta?: {
    model_used: string;
    route_reason: string;
    systems_queried: string[];
    evidence_sources: Array<{ name: string; type: string; contribution: string }>;
    reasoning_chain: Array<{ step: number; action: string; finding: string; source: string }>;
    strongest_signal: string;
  };
}

interface SystemStatus {
  name: string;
  status: 'pending' | 'querying' | 'done' | 'error' | 'timeout';
  result?: string;
}

// ── Sub-components ───────────────────────────────────────────────────

function SystemNode({ system }: { system: SystemStatus }) {
  const colors: Record<string, string> = {
    pending: 'rgba(255,255,255,0.15)',
    querying: '#00ccff',
    done: '#00ff88',
    error: '#ff0066',
    timeout: '#ffaa00',
  };
  const pulseClass = system.status === 'querying' ? ' system-node--pulse' : '';

  return (
    <div className={`system-node${pulseClass}`} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
      borderRadius: 6, border: `1px solid ${colors[system.status]}`,
      background: `${colors[system.status]}11`, transition: 'all 0.3s ease',
      fontSize: 12, fontFamily: 'var(--font-mono, monospace)',
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: colors[system.status],
        boxShadow: system.status === 'querying' ? `0 0 8px ${colors.querying}` : 'none',
        animation: system.status === 'querying' ? 'pulse 1.5s ease-in-out infinite' : 'none',
      }} />
      <span style={{ color: colors[system.status], fontWeight: 600 }}>{system.name}</span>
      {system.result && (
        <span style={{ color: 'var(--color-text-muted, #888)', fontSize: 11 }}>{system.result}</span>
      )}
    </div>
  );
}

function ReasoningStep({ step, index }: { step: { action: string; finding: string; source: string }; index: number }) {
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '8px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      animation: `fadeSlideIn 0.4s ease ${index * 0.1}s both`,
    }}>
      <span style={{
        minWidth: 24, height: 24, borderRadius: '50%',
        background: 'rgba(0, 255, 136, 0.15)', color: '#00ff88',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
      }}>
        {index + 1}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: '#00ccff', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
          {step.action}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-fg)', lineHeight: 1.4, marginTop: 2 }}>
          {step.finding}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
          source: {step.source}
        </div>
      </div>
    </div>
  );
}

function EvidenceChip({ source }: { source: { name: string; type: string; contribution: string } }) {
  const typeColors: Record<string, string> = {
    pdf: '#ff6b35', dem: '#00ccff', satellite: '#00ff88', weather: '#ffaa00',
    regulatory: '#a855f7', video: '#ff0066', document: '#e0ffe0',
  };
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 4, fontSize: 11,
      background: `${typeColors[source.type] || '#888'}15`,
      border: `1px solid ${typeColors[source.type] || '#888'}40`,
      color: typeColors[source.type] || '#888',
      fontFamily: 'var(--font-mono)',
    }} title={source.contribution}>
      <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.05em' }}>
        {source.type}
      </span>
      {source.name}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

export default function OrchestrationPanel() {
  const [events, setEvents] = useState<OrchestratorEvent[]>([]);
  const [systems, setSystems] = useState<SystemStatus[]>([
    { name: 'LOCAL CATALOG', status: 'pending' },
    { name: 'SENSO RAG', status: 'pending' },
    { name: 'OPEN-METEO', status: 'pending' },
    { name: 'NEXLA', status: 'pending' },
    { name: 'MODEL ROUTER', status: 'pending' },
  ]);
  const [modelUsed, setModelUsed] = useState<string>('');
  const [tokens, setTokens] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [meta, setMeta] = useState<OrchestratorEvent['orchestrator_meta'] | null>(null);
  const [phase, setPhase] = useState('idle');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  // Parse streaming events into system status updates
  const processEvent = useCallback((evt: OrchestratorEvent) => {
    setEvents(prev => [...prev, evt]);

    if (evt.event === 'signal' && evt.text) {
      const t = evt.text;
      // System status updates
      if (t.includes('[local]')) {
        setSystems(s => s.map(sys => sys.name === 'LOCAL CATALOG' ? { ...sys, status: 'done', result: t.split('—')[1]?.trim() } : sys));
      } else if (t.includes('[senso]')) {
        setSystems(s => s.map(sys => sys.name === 'SENSO RAG' ? { ...sys, status: t.includes('error') || t.includes('timeout') ? 'error' : 'done', result: t.split('—')[1]?.trim() } : sys));
      } else if (t.includes('[weather]') || t.includes('[open-meteo]')) {
        setSystems(s => s.map(sys => sys.name === 'OPEN-METEO' ? { ...sys, status: 'done', result: t.split('—')[1]?.trim() } : sys));
      } else if (t.includes('[nexla]')) {
        setSystems(s => s.map(sys => sys.name === 'NEXLA' ? { ...sys, status: t.includes('error') || t.includes('timeout') ? 'error' : 'done', result: t.split('—')[1]?.trim() } : sys));
      } else if (t.includes('Model router')) {
        const model = t.match(/→ ([^\s(]+)/)?.[1] || '';
        setModelUsed(model);
        setSystems(s => s.map(sys => sys.name === 'MODEL ROUTER' ? { ...sys, status: 'done', result: model } : sys));
      }
    }

    if (evt.event === 'step' && evt.text) {
      if (evt.text.includes('Phase 1')) {
        setPhase('gathering');
        setSystems(s => s.map(sys => ({ ...sys, status: 'querying' })));
      } else if (evt.text.includes('Phase 2')) setPhase('reading');
      else if (evt.text.includes('Phase 3')) setPhase('routing');
      else if (evt.text.includes('Phase 4')) setPhase('synthesizing');
      else if (evt.text.includes('complete')) setPhase('complete');
    }

    if (evt.event === 'token_update' && evt.tokens) setTokens(evt.tokens);

    if (evt.event === 'complete') {
      setIsComplete(true);
      setIsRunning(false);
      if (evt.orchestrator_meta) setMeta(evt.orchestrator_meta);
    }
  }, []);

  const runOrchestration = useCallback(async (
    businessName: string, stepName: string, rfName: string, rfDesc: string,
    domain: string, lat?: number, lng?: number, depth?: number,
  ) => {
    setEvents([]);
    setIsRunning(true);
    setIsComplete(false);
    setMeta(null);
    setTokens(0);
    setPhase('init');
    setModelUsed('');
    setSystems([
      { name: 'LOCAL CATALOG', status: 'pending' },
      { name: 'SENSO RAG', status: 'pending' },
      { name: 'OPEN-METEO', status: 'pending' },
      { name: 'NEXLA', status: 'pending' },
      { name: 'MODEL ROUTER', status: 'pending' },
    ]);

    try {
      const res = await fetch(`${API_BASE}/api/orchestrate/analyse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName,
          step_name: stepName,
          risk_factor_name: rfName,
          risk_factor_description: rfDesc,
          domain, lat, lng, depth: depth || 2,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            try {
              processEvent(JSON.parse(trimmed));
            } catch { /* skip malformed */ }
          }
        }
      }
    } catch (err) {
      processEvent({ event: 'error', text: `Connection error: ${err}` });
      setIsRunning(false);
    }
  }, [processEvent]);

  // Demo trigger
  const runDemo = useCallback(() => {
    runOrchestration(
      'Gulf Coast Oil Operator (Permian Basin)',
      'Permian Field Operations',
      'ERCOT Grid Failure Risk',
      'Probability and impact of ERCOT grid failure curtailing Permian Basin compressor and pump operations',
      'oil', 31.5, -102.5, 2,
    );
  }, [runOrchestration]);

  const phaseLabels: Record<string, string> = {
    idle: 'IDLE', init: 'INITIALIZING', gathering: 'GATHERING EVIDENCE',
    reading: 'READING DOCUMENTS', routing: 'ROUTING MODEL',
    synthesizing: 'SYNTHESIZING', complete: 'COMPLETE',
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--color-bg, #0a0a0f)', color: 'var(--color-fg, #e0ffe0)',
      fontFamily: 'var(--font-body, Inter, system-ui)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-border, rgba(0,255,136,0.15))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--color-accent, #00ff88)',
          }}>
            ORCHESTRATOR
          </span>
          <span style={{
            padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 700,
            fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
            background: phase === 'complete' ? 'rgba(0,255,136,0.15)' :
                        phase === 'idle' ? 'rgba(255,255,255,0.05)' : 'rgba(0,204,255,0.15)',
            color: phase === 'complete' ? '#00ff88' : phase === 'idle' ? '#888' : '#00ccff',
          }}>
            {phaseLabels[phase]}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {tokens > 0 && (
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
              {tokens.toLocaleString()} tokens
            </span>
          )}
          {modelUsed && (
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 6px',
              borderRadius: 3, background: 'rgba(168,85,247,0.15)', color: '#a855f7',
            }}>
              {modelUsed}
            </span>
          )}
          <button onClick={runDemo} disabled={isRunning} style={{
            padding: '6px 14px', borderRadius: 4, border: 'none', cursor: 'pointer',
            background: isRunning ? 'rgba(255,255,255,0.05)' : 'var(--color-accent, #00ff88)',
            color: isRunning ? '#888' : '#0a0a0f', fontSize: 12, fontWeight: 700,
            fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
          }}>
            {isRunning ? 'RUNNING...' : 'RUN DEMO'}
          </button>
        </div>
      </div>

      {/* Systems bar */}
      <div style={{
        padding: '10px 16px', display: 'flex', gap: 8, flexWrap: 'wrap',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        {systems.map(sys => <SystemNode key={sys.name} system={sys} />)}
      </div>

      {/* Main content — scrollable */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {/* Event log */}
        {events.map((evt, i) => (
          <div key={i} style={{
            padding: '4px 0', fontSize: 12, fontFamily: 'var(--font-mono)',
            animation: `fadeSlideIn 0.3s ease ${Math.min(i * 0.05, 1)}s both`,
            borderLeft: evt.event === 'step' ? '2px solid #00ccff' :
                       evt.event === 'signal' ? '2px solid rgba(255,255,255,0.1)' :
                       evt.event === 'file_found' ? '2px solid #ffaa00' :
                       evt.event === 'error' ? '2px solid #ff0066' : '2px solid transparent',
            paddingLeft: 10,
          }}>
            {evt.event === 'step' && (
              <span style={{ color: '#00ccff', fontWeight: 600 }}>▶ {evt.text}</span>
            )}
            {evt.event === 'signal' && (
              <span style={{ color: evt.text?.includes('[reasoning]') ? '#00ff88' :
                                    evt.text?.includes('[gap]') ? '#ff0066' : 'rgba(224,255,224,0.6)' }}>
                {evt.text?.replace('[reasoning] ', '').replace('[gap] ', '⚠ ')}
              </span>
            )}
            {evt.event === 'file_found' && (
              <span style={{ color: '#ffaa00' }}>📄 {evt.filename} ({evt.domain})</span>
            )}
            {evt.event === 'token_update' && (
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>◊ {evt.tokens?.toLocaleString()} tokens</span>
            )}
            {evt.event === 'error' && (
              <span style={{ color: '#ff0066', fontWeight: 600 }}>✗ {evt.text}</span>
            )}
          </div>
        ))}

        {/* Reasoning chain — appears after completion */}
        {meta?.reasoning_chain && meta.reasoning_chain.length > 0 && (
          <div style={{ marginTop: 16, padding: '12px 0', borderTop: '1px solid rgba(0,255,136,0.15)' }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#00ccff', marginBottom: 8, fontFamily: 'var(--font-display)',
            }}>
              REASONING CHAIN
            </div>
            {meta.reasoning_chain.map((step, i) => (
              <ReasoningStep key={i} step={step} index={i} />
            ))}
          </div>
        )}

        {/* Evidence sources — appears after completion */}
        {meta?.evidence_sources && meta.evidence_sources.length > 0 && (
          <div style={{ marginTop: 16, padding: '12px 0', borderTop: '1px solid rgba(0,255,136,0.15)' }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#00ccff', marginBottom: 8, fontFamily: 'var(--font-display)',
            }}>
              EVIDENCE SOURCES ({meta.evidence_sources.length})
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {meta.evidence_sources.map((src, i) => (
                <EvidenceChip key={i} source={src} />
              ))}
            </div>
            {meta.strongest_signal && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-muted)' }}>
                Strongest signal: <span style={{ color: '#00ff88', fontWeight: 600 }}>{meta.strongest_signal}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
