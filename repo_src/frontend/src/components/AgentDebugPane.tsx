import { useEffect, useRef } from 'react';
import type { AgentThreadState } from '../types';
import type { LiveRiskSnapshot } from '../api';

interface Props {
  agentThread: AgentThreadState | null;
  liveRiskSnapshot?: LiveRiskSnapshot | null;
}

export default function AgentDebugPane({ agentThread, liveRiskSnapshot }: Props) {
  const bodyRef = useRef<HTMLPreElement>(null);

  const lines: string[] = [];
  if (agentThread) {
    for (const step of agentThread.steps) {
      if (step.status === 'pending') continue;
      const prefix = step.status === 'running' ? '▶' : step.status === 'complete' ? '✓' : '·';
      lines.push(`${prefix} ${step.text}`);
      for (const item of step.sub_items) {
        lines.push(`  └ ${item}`);
      }
    }
    if (agentThread.is_complete && !agentThread.is_error) {
      lines.push(`— complete · ${agentThread.tokens_current.toLocaleString()} tokens`);
    }
    if (agentThread.is_error) {
      lines.push('! analysis error');
    }
  }

  // Live risk signals (from /api/live-data/risk-snapshot)
  const liveLines: string[] = [];
  if (liveRiskSnapshot) {
    const eq = liveRiskSnapshot.earthquakes;
    const wx = liveRiskSnapshot.weather_alerts;
    const ev = liveRiskSnapshot.natural_events;
    const fema = liveRiskSnapshot.fema_disasters;
    if (eq && eq.ok) {
      const count = Array.isArray(eq.features) ? eq.features.length : 0;
      liveLines.push(`⚡ earthquakes nearby: ${count}`);
    }
    if (wx && wx.ok) {
      const count = Array.isArray(wx.features) ? wx.features.length : 0;
      liveLines.push(`⛈  active weather alerts: ${count}`);
    }
    if (ev && ev.ok) {
      const count = Array.isArray(ev.events) ? ev.events.length : 0;
      liveLines.push(`🌋 NASA EONET events (open): ${count}`);
    }
    if (fema && fema.ok) {
      const count = Array.isArray(fema.results) ? fema.results.length : 0;
      liveLines.push(`🏚  FEMA disasters on record: ${count}`);
    }
  }

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [agentThread]);

  return (
    <div className="debug-pane">
      <div className="debug-pane__header">
        <span className="debug-pane__label">agent output</span>
        {agentThread && !agentThread.is_complete && (
          <span className="debug-pane__pulse" />
        )}
      </div>
      <pre className="debug-pane__body" ref={bodyRef}>
        {lines.length > 0
          ? lines.join('\n')
          : agentThread
          ? '> starting…'
          : '> idle — run an analysis to see output'}
        {liveLines.length > 0 && (
          '\n\n— live signals —\n' + liveLines.join('\n')
        )}
      </pre>
    </div>
  );
}
