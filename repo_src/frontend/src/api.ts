import type { Depth, Step, AnalyseStreamEvent } from './types';

const API_BASE = (import.meta as unknown as { env: Record<string, string | undefined> }).env?.VITE_API_URL ?? '';

let _apiKey: string | null = null;
export function setApiKey(key: string | null) { _apiKey = key; }
function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_apiKey) h['X-API-Key'] = _apiKey;
  return h;
}

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
  const response = await fetch(`${API_BASE}/api/decompose`, {
    method: 'POST',
    headers: authHeaders(),
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
  model?: string;
  feedback?: string;
}

export async function* streamAnalyse(params: AnalyseParams): AsyncGenerator<AnalyseStreamEvent> {
  const response = await fetch(`${API_BASE}/api/analyse`, {
    method: 'POST',
    headers: authHeaders(),
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
  const response = await fetch(`${API_BASE}/api/youtube-meta?url=${encodeURIComponent(url)}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export function getMediaUrl(domain: string, filename: string): string {
  const encodedPath = filename.split('/').map(encodeURIComponent).join('/');
  return `${API_BASE}/api/media/${domain}/${encodedPath}`;
}

export async function fetchDocument(domain: string, file: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/document?domain=${encodeURIComponent(domain)}&file=${encodeURIComponent(file)}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

export async function fetchHealth(): Promise<Record<string, unknown>> {
  const r = await fetch(`${API_BASE}/api/health`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function fetchSponsorStatus(): Promise<Record<string, boolean>> {
  const r = await fetch(`${API_BASE}/api/sponsor-status`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function fetchAvailableModels(): Promise<{models: Array<{id: string; tier: string; speed: string; cost: string; strengths: string[]}>}> {
  const r = await fetch(`${API_BASE}/api/models`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function routeModel(prompt: string, systemMessage?: string): Promise<{task_type: string; selected_model: string; reason: string}> {
  const r = await fetch(`${API_BASE}/api/model-route`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ prompt, system_message: systemMessage }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function fetchOrchestratorSystems(): Promise<Record<string, boolean>> {
  const r = await fetch(`${API_BASE}/api/orchestrate/systems`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function ingestSensoDocuments(): Promise<{ingested: number; results: unknown[]}> {
  const r = await fetch(`${API_BASE}/api/senso/ingest-all`, { method: 'POST', headers: authHeaders() });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ── Live data (public APIs: USGS, NASA EONET, NOAA, Open-Meteo, FEMA, World Bank, STAC) ──

export interface LiveRiskSnapshot {
  earthquakes?: { features: unknown[]; ok: boolean };
  natural_events?: { events: unknown[]; ok: boolean };
  weather_alerts?: { features: unknown[]; ok: boolean };
  climate?: { summary: unknown; ok: boolean };
  forecast?: { daily: unknown; ok: boolean };
  fema_disasters?: { results: unknown[]; ok: boolean };
  country_risk?: { indicators: unknown; ok: boolean };
  satellite?: { features: unknown[]; ok: boolean };
  [key: string]: unknown;
}

export async function fetchRiskSnapshot(
  lat: number,
  lng: number,
  countryCode = 'US',
  state?: string,
): Promise<LiveRiskSnapshot> {
  const params = new URLSearchParams({
    lat: String(lat), lng: String(lng), country_code: countryCode,
  });
  if (state) params.set('state', state);
  const r = await fetch(`${API_BASE}/api/live-data/risk-snapshot?${params}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function fetchWeatherAlerts(
  lat: number,
  lng: number,
  severity = 'Extreme,Severe',
): Promise<{ features: unknown[]; ok?: boolean }> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng), severity });
  const r = await fetch(`${API_BASE}/api/live-data/weather-alerts?${params}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function fetchEarthquakes(
  lat: number,
  lng: number,
  radiusKm = 200,
  days = 30,
  minMagnitude = 2.5,
): Promise<{ features: unknown[] }> {
  const params = new URLSearchParams({
    lat: String(lat), lng: String(lng),
    radius_km: String(radiusKm), days: String(days),
    min_magnitude: String(minMagnitude),
  });
  const r = await fetch(`${API_BASE}/api/live-data/earthquakes?${params}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
