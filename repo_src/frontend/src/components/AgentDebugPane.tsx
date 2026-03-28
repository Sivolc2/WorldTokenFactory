import { useEffect, useRef } from 'react';
import type { AgentThreadState } from '../types';

interface Props {
  agentThread: AgentThreadState | null;
}

export default function AgentDebugPane({ agentThread }: Props) {
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
      </pre>
    </div>
  );
}
