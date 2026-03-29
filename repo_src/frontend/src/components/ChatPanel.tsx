/**
 * ChatPanel — assistant-ui powered chat interface for World Token Factory.
 * Uses AssistantRuntimeProvider + useLocalRuntime + Thread from @assistant-ui/react(-ui).
 * makeAssistantToolUI renders inline risk cards for tool calls.
 */

import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  makeAssistantToolUI,
  type ChatModelAdapter,
} from '@assistant-ui/react';
import {
  Thread,
  ThreadConfigProvider,
  type ThreadConfig,
} from '@assistant-ui/react-ui';
import '@assistant-ui/react-ui/styles/index.css';
import { setApiKey } from '../api';

// Expose setApiKey so callers can pass in an Unkey key
export { setApiKey };

const API_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  'http://localhost:8000';

// ── Adapter ───────────────────────────────────────────────────────────────────

// Keywords that trigger the full orchestrator pipeline instead of simple chat
const ORCHESTRATOR_TRIGGERS = /\b(assess|analy[sz]e|risk|exposure|failure rate|uncertainty|loss range|permian|gulf|hurricane|earthquake|pipeline|seismic|flood|wildfire|ercot|subsidence)\b/i;

const wtfAdapter: ChatModelAdapter = {
  async run({ messages, abortSignal }) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const storedKey =
      typeof localStorage !== 'undefined' ? localStorage.getItem('wtf_api_key') : null;
    if (storedKey) headers['X-API-Key'] = storedKey;

    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    const promptText =
      lastUser?.content
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map(p => p.text)
        .join(' ') ?? '';

    // Route to orchestrator for risk-related queries
    if (ORCHESTRATOR_TRIGGERS.test(promptText)) {
      try {
        const orchRes = await fetch(`${API_BASE}/api/orchestrate/analyse`, {
          method: 'POST',
          headers,
          signal: abortSignal,
          body: JSON.stringify({
            business_name: 'User Query',
            step_name: 'Risk Assessment',
            risk_factor_name: promptText.slice(0, 100),
            risk_factor_description: promptText,
            domain: /oil|pipeline|permian|gulf|ercot/i.test(promptText) ? 'oil' :
                    /lemming|arctic|tundra/i.test(promptText) ? 'lemming' : 'general',
            lat: /permian|texas/i.test(promptText) ? 31.5 :
                 /gulf|hurricane/i.test(promptText) ? 28.17 : null,
            lng: /permian|texas/i.test(promptText) ? -102.5 :
                 /gulf|hurricane/i.test(promptText) ? -88.49 : null,
            depth: 2,
          }),
        });

        if (orchRes.ok && orchRes.body) {
          // Parse NDJSON stream — collect all events into a rich response
          const reader = orchRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          const signals: string[] = [];
          let summary = '';
          let evidenceSources: string[] = [];
          let reasoning: string[] = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              try {
                const evt = JSON.parse(trimmed);
                if (evt.event === 'signal' && evt.text) signals.push(evt.text);
                if (evt.event === 'step' && evt.text) signals.push(`▶ ${evt.text}`);
                if (evt.event === 'file_found') signals.push(`📄 ${evt.filename}`);
                if (evt.event === 'complete' && evt.result) {
                  summary = evt.result.summary || '';
                  if (evt.orchestrator_meta?.evidence_sources) {
                    evidenceSources = evt.orchestrator_meta.evidence_sources.map(
                      (s: any) => `[${s.type}] ${s.name}: ${s.contribution}`
                    );
                  }
                  if (evt.orchestrator_meta?.reasoning_chain) {
                    reasoning = evt.orchestrator_meta.reasoning_chain.map(
                      (r: any) => `${r.action} → ${r.finding} (source: ${r.source})`
                    );
                  }
                }
              } catch { /* skip malformed */ }
            }
          }

          // Build rich response with orchestrator data
          let response = '';
          if (summary) response += `## Risk Assessment\n\n${summary}\n\n`;
          if (reasoning.length > 0) {
            response += `### Reasoning Chain\n${reasoning.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\n`;
          }
          if (evidenceSources.length > 0) {
            response += `### Evidence Sources\n${evidenceSources.map(e => `- ${e}`).join('\n')}\n\n`;
          }
          if (signals.length > 0) {
            response += `### Agent Activity\n${signals.slice(-10).map(s => `- ${s}`).join('\n')}`;
          }
          if (!response) response = 'Orchestrator returned no results. Try a more specific query.';

          return { content: [{ type: 'text' as const, text: response }] };
        }
      } catch (e) {
        // Fall through to simple chat on orchestrator failure
      }
    }

    // Simple chat fallback
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers,
      signal: abortSignal,
      body: JSON.stringify({
        prompt: promptText,
        system_message:
          "You are a World Token Factory risk analyst. You have access to multimodal geospatial data including USGS earthquakes, NASA natural events, NOAA weather alerts, FEMA disaster history, Senso regulatory knowledge base, and satellite imagery. Help users understand business risks with specific numbers and evidence.",
        max_tokens: 2048,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      return {
        content: [{ type: 'text', text: `Backend error (${res.status}): ${errText}` }],
      };
    }

    const data = await res.json();
    const text: string = data.response ?? data.message ?? JSON.stringify(data);
    return { content: [{ type: 'text', text }] };
  },
};

// ── makeAssistantToolUI — inline risk card ────────────────────────────────────

const AssessRiskToolUI = makeAssistantToolUI<
  { risk_factor_name: string; business_context?: string },
  { failure_rate: number; uncertainty: number; loss_range_low: number; loss_range_high: number }
>({
  toolName: 'assess_risk',
  render: ({ args, result, status }) => {
    if (status.type === 'running') {
      return (
        <div style={styles.riskCard}>
          <div style={styles.riskCardHeader}>
            <span style={styles.riskPulse}>&#9679;</span>
            <span style={{ fontWeight: 600 }}>
              Analysing {args.risk_factor_name ?? 'risk factor'}…
            </span>
          </div>
        </div>
      );
    }
    if (status.type === 'complete' && result) {
      const fr = (result.failure_rate * 100).toFixed(1);
      const un = (result.uncertainty * 100).toFixed(1);
      const low = result.loss_range_low.toLocaleString();
      const high = result.loss_range_high.toLocaleString();
      return (
        <div style={styles.riskCard}>
          <div style={styles.riskCardHeader}>
            <span style={styles.riskDot}>&#9679;</span>
            <span style={{ fontWeight: 700 }}>{args.risk_factor_name}</span>
          </div>
          <div style={styles.riskMetrics}>
            <span style={styles.riskBadge}>FR {fr}%</span>
            <span style={styles.riskBadgeAlt}>UN {un}%</span>
            <span style={styles.riskRange}>
              ${low} – ${high}
            </span>
          </div>
        </div>
      );
    }
    return null;
  },
});

// ── Thread configuration ──────────────────────────────────────────────────────

const threadConfig: ThreadConfig = {
  assistantAvatar: { fallback: 'WTF' },
  welcome: {
    message: "Describe your business and I'll decompose it into risk factors.",
    suggestions: [
      { prompt: 'Gulf Coast oil pipeline operator' },
      { prompt: 'Arctic lemming farm' },
      { prompt: 'Urban drone delivery service' },
    ],
  },
  tools: [AssessRiskToolUI],
  assistantMessage: {
    allowCopy: true,
    allowReload: true,
  },
  composer: {
    allowAttachments: false,
  },
};

// ── Main component ────────────────────────────────────────────────────────────

export default function ChatPanel() {
  const runtime = useLocalRuntime(wtfAdapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="chat-panel" style={styles.container}>
        <div style={styles.header}>Risk Assessment Chat</div>
        <div style={styles.threadWrapper}>
          <ThreadConfigProvider config={threadConfig}>
            <Thread />
          </ThreadConfigProvider>
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    background: 'var(--color-bg, #0a0a0f)',
    color: 'var(--color-fg, #e0ffe0)',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(0, 255, 136, 0.15)',
    fontSize: '14px',
    fontWeight: 600 as const,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-accent, #00ff88)',
    flexShrink: 0,
  },
  threadWrapper: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    // assistant-ui CSS variable overrides for green-on-black aesthetic
    ['--aui-color-primary' as string]: '#00ff88',
    ['--aui-color-primary-foreground' as string]: '#0a0a0f',
    ['--aui-color-background' as string]: '#0a0a0f',
    ['--aui-color-foreground' as string]: '#e0ffe0',
    ['--aui-color-muted' as string]: 'rgba(255,255,255,0.06)',
    ['--aui-color-muted-foreground' as string]: '#94a3b8',
    ['--aui-color-border' as string]: 'rgba(0,255,136,0.15)',
    ['--aui-border-radius' as string]: '8px',
  },
  riskCard: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(0,255,136,0.25)',
    background: 'rgba(0,255,136,0.04)',
    margin: '6px 0',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '13px',
  },
  riskCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  riskPulse: {
    color: '#00ff88',
    animation: 'pulse 1.5s ease-in-out infinite',
    fontSize: '10px',
  },
  riskDot: {
    color: '#00ff88',
    fontSize: '10px',
  },
  riskMetrics: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  riskBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    background: 'rgba(0,255,136,0.15)',
    color: '#00ff88',
    fontWeight: 600 as const,
    fontSize: '12px',
    fontFamily: 'monospace',
  },
  riskBadgeAlt: {
    padding: '2px 8px',
    borderRadius: '4px',
    background: 'rgba(255,200,0,0.12)',
    color: '#ffc800',
    fontWeight: 600 as const,
    fontSize: '12px',
    fontFamily: 'monospace',
  },
  riskRange: {
    color: '#94a3b8',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
};
