import type { Depth, Step, AnalyseStreamEvent } from './types';

async function* readNDJSON(response: Response): AsyncGenerator<unknown> {
  const reader = response.body!.getReader();
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
          yield JSON.parse(trimmed);
        } catch {
          // skip malformed lines
        }
      }
    }
  }
  if (buffer.trim()) {
    try {
      yield JSON.parse(buffer);
    } catch {
      // ignore
    }
  }
}

export type DecomposeEvent =
  | { type: 'step'; step: Step }
  | { type: 'meta'; business_name: string; tokens_used: number };

export async function* streamDecompose(description: string): AsyncGenerator<DecomposeEvent> {
  const response = await fetch('/api/decompose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, max_steps: 5 }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  for await (const obj of readNDJSON(response)) {
    const data = obj as Record<string, unknown>;

    // Handle full response format (all steps at once)
    if (data.steps && Array.isArray(data.steps)) {
      for (const step of data.steps as Step[]) {
        yield { type: 'step', step };
      }
      yield {
        type: 'meta',
        business_name: (data.business_name as string) ?? 'Unknown Business',
        tokens_used: (data.tokens_used as number) ?? 0,
      };
      return;
    }

    // Handle streaming step format (individual steps as they're generated)
    if (data.id && data.name && data.risk_factors) {
      yield { type: 'step', step: data as unknown as Step };
    }

    // Handle meta info sent separately at end
    if (data.business_name && !data.steps) {
      yield {
        type: 'meta',
        business_name: data.business_name as string,
        tokens_used: (data.tokens_used as number) ?? 0,
      };
    }
  }
}

export interface AnalyseParams {
  risk_factor_id: string;
  risk_factor_name: string;
  business_context: string;
  step_context: string;
  depth: Depth;
  data_domains: string[];
}

export async function* streamAnalyse(params: AnalyseParams): AsyncGenerator<AnalyseStreamEvent> {
  const response = await fetch('/api/analyse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  for await (const obj of readNDJSON(response)) {
    yield obj as AnalyseStreamEvent;
  }
}

export async function fetchYoutubeMeta(
  url: string
): Promise<{ title: string; thumbnail_url: string; url: string }> {
  const response = await fetch(`/api/youtube-meta?url=${encodeURIComponent(url)}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export function getMediaUrl(domain: string, filename: string): string {
  return `/api/media/${domain}/${encodeURIComponent(filename)}`;
}
