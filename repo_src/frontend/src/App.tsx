import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type {
  Step,
  Depth,
  AnalysisResult,
  AgentThreadState,
  AgentThreadStep,
  Artifact,
  ArtifactType,
} from './types';
import { streamDecompose, streamAnalyse, fetchDocument, fetchHealth, fetchRiskSnapshot, type LiveRiskSnapshot } from './api';
import TopBar, { type TopBarKPIs } from './components/TopBar';
import BusinessInput from './components/BusinessInput';
import MapView, { detectMapType, type BusinessMapType, type MapFocus } from './components/MapView';
import StepChainOverlay from './components/StepChainOverlay';
import TokenEfficiencyChart, { type ChartPoint } from './components/TokenEfficiencyChart';
import ExecutiveReport from './components/ExecutiveReport';
import AgentDebugPane from './components/AgentDebugPane';
import ChatPanel from './components/ChatPanel';
import OrchestrationPanel from './components/OrchestrationPanel';
import DocumentViewer, { type SectionMetric } from './components/DocumentViewer';

type AppScreen = 'input' | 'main';

/** Sum of loss_range_low and loss_range_high across all factors, using best available metrics. */
function portfolioExposure(steps: Step[], results: Record<string, AnalysisResult>): { low: number; high: number } {
  let low = 0, high = 0;
  for (const rf of steps.flatMap((s) => s.risk_factors)) {
    const m = results[rf.id]?.metrics ?? rf.initial_metrics;
    if (m) { low += m.loss_range_low; high += m.loss_range_high; }
  }
  return { low, high };
}

function tokenEstimateNumber(depth: Depth): number {
  switch (depth) {
    case 1: return 350;
    case 2: return 3000;
    case 3: return 200000;
  }
}

// ── Map overlay regions (coloured rectangles highlighting key geographic zones) ──

const OIL_STEP_FOCUSES: MapFocus[] = [
  // Permian fields — Delaware Basin well pad grid, Reeves/Loving Co.
  {
    center: [31.47, -103.74], zoom: 11,
    overlays: [
      { bounds: [[31.35, -104.05], [31.60, -103.45]], color: '#ff4444', label: 'Delaware Basin — dense well pad cluster (highest ERCOT exposure)', fillOpacity: 0.30 },
      { bounds: [[31.15, -103.60], [31.38, -103.10]], color: '#ffcc00', label: 'Secondary drilling block — active completions', fillOpacity: 0.22 },
      { bounds: [[31.55, -103.85], [31.75, -103.40]], color: '#ffcc00', label: 'Gathering pipeline corridor', fillOpacity: 0.18 },
    ],
  },
  // Midstream egress — Waha Hub, Pecos County TX
  {
    center: [30.92, -102.47], zoom: 10,
    overlays: [
      { bounds: [[30.85, -102.62], [30.99, -102.33]], color: '#ff4444', label: 'Waha Hub — compressor/processing cluster (bottleneck epicentre)', fillOpacity: 0.30 },
      { bounds: [[30.65, -102.90], [31.15, -102.05]], color: '#ffcc00', label: 'Pipeline convergence zone — capacity constraint area', fillOpacity: 0.20 },
      { bounds: [[30.35, -102.10], [30.72, -101.45]], color: '#44dd88', label: 'Downstream takeaway capacity — partially relieved', fillOpacity: 0.16 },
    ],
  },
  // GOM offshore buffer — Thunder Horse PDQ, Mississippi Canyon 778/822
  {
    center: [28.17, -88.49], zoom: 9,
    overlays: [
      { bounds: [[28.10, -88.58], [28.24, -88.40]], color: '#ff4444', label: 'Thunder Horse PDQ — 60–80 Kbbl/day deepwater semi-submersible', fillOpacity: 0.35 },
      { bounds: [[27.70, -89.30], [28.60, -87.70]], color: '#ffcc00', label: 'Mississippi Canyon production field — Cat 3+ hurricane track zone', fillOpacity: 0.18 },
      { bounds: [[26.80, -90.80], [29.50, -86.50]], color: '#44dd88', label: 'GOM offshore buffer — 847 platform-day downtime exposure 2010–2023', fillOpacity: 0.10 },
    ],
  },
];

const LEMMING_STEP_FOCUSES: MapFocus[] = [
  {
    center: [70.3, 28.0], zoom: 5,
    overlays: [
      { bounds: [[69.2, 25.5], [70.8, 30.0]], color: '#ff4444', label: 'Peak crash zone — Finnmark plateau, highest population collapse risk', fillOpacity: 0.25 },
      { bounds: [[70.5, 22.0], [71.8, 27.0]], color: '#ffcc00', label: 'Secondary habitat stress — snow crust formation area', fillOpacity: 0.18 },
    ],
  },
  {
    center: [70.1, 27.5], zoom: 5,
    overlays: [
      { bounds: [[69.5, 24.0], [70.5, 29.0]], color: '#ff4444', label: 'Core lemming habitat — high density breeding grounds', fillOpacity: 0.25 },
      { bounds: [[69.0, 27.0], [70.0, 31.0]], color: '#44dd88', label: 'Migration corridor — eastward dispersal route', fillOpacity: 0.18 },
    ],
  },
  {
    center: [70.5, 26.0], zoom: 5,
    overlays: [
      { bounds: [[70.0, 23.0], [71.5, 27.5]], color: '#ffcc00', label: 'Predator range overlap — arctic fox & rough-legged buzzard pressure', fillOpacity: 0.22 },
      { bounds: [[69.5, 25.0], [70.2, 28.5]], color: '#ff4444', label: 'Climate sensitivity zone — warming trend impact area', fillOpacity: 0.25 },
    ],
  },
  { center: [70.0, 25.0], zoom: 5 },
  { center: [69.8, 26.5], zoom: 5 },
];

const OIL_SECTION_LOCATIONS: Record<string, MapFocus> = {
  'permian-field-operations': { center: [31.47, -103.74], zoom: 10 },
  'midstream-egress':         { center: [30.92, -102.47], zoom: 8  },
  'gom-offshore-buffer':      { center: [28.17, -88.49],  zoom: 8  },
  'compounding-risk-assessment': { center: [31.1,  -103.0],  zoom: 7  },
  'production-impact-scenarios': { center: [31.1,  -103.0],  zoom: 6  },
  'data-sources':                { center: [30.0,  -97.0],   zoom: 6  },
};

function getStepFocus(mapType: BusinessMapType, stepPosition: number): MapFocus | null {
  const focuses = mapType === 'oil' ? OIL_STEP_FOCUSES
    : mapType === 'lemming' ? LEMMING_STEP_FOCUSES
    : null;
  return focuses?.[stepPosition - 1] ?? null;
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('input');
  const [businessDescription, setBusinessDescription] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [mapType, setMapType] = useState<BusinessMapType>('general');
  const [steps, setSteps] = useState<Step[]>([]);
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [decomposeError, setDecomposeError] = useState<string | null>(null);

  const [globalDepth, setGlobalDepth] = useState<Depth>(2);
  const [globalModel, setGlobalModel] = useState('claude-sonnet-4-6');
  const [totalTokens, setTotalTokens] = useState(0);

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedRfId, setSelectedRfId] = useState<string | null>(null);

  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResult>>({});
  const [riskFactorDepths, setRiskFactorDepths] = useState<Record<string, Depth>>({});
  const [runningRfIds, setRunningRfIds] = useState<Set<string>>(new Set());

  const [agentThread, setAgentThread] = useState<AgentThreadState | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showOrchestrator, setShowOrchestrator] = useState(false);

  const [tokenHistory, setTokenHistory] = useState<ChartPoint[]>([]);
  const [riskThreshold, setRiskThreshold] = useState<number | null>(null);
  const [mapFocus, setMapFocus] = useState<MapFocus | null>(null);
  const [docMarkdown, setDocMarkdown] = useState('');
  const [activeDocSection, setActiveDocSection] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [liveRiskSnapshot, setLiveRiskSnapshot] = useState<LiveRiskSnapshot | null>(null);

  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  // Refs so handleAnalyse always sees current values without stale closures
  const analysisResultsRef = useRef<Record<string, AnalysisResult>>({});
  const totalTokensRef = useRef(0);
  useEffect(() => { analysisResultsRef.current = analysisResults; }, [analysisResults]);
  useEffect(() => { totalTokensRef.current = totalTokens; }, [totalTokens]);

  // ── KPIs ───────────────────────────────────────────────────────────────────

  const kpis = useMemo((): TopBarKPIs | null => {
    const allRfs = steps.flatMap((s) => s.risk_factors);
    if (allRfs.length === 0) return null;
    let totalLow = 0, totalHigh = 0, criticalCount = 0, analyzedCount = 0, hasAny = false;
    for (const rf of allRfs) {
      const metrics = analysisResults[rf.id]?.metrics ?? rf.initial_metrics;
      if (!metrics) continue;
      hasAny = true;
      totalLow  += metrics.loss_range_low;
      totalHigh += metrics.loss_range_high;
      if (metrics.failure_rate > 0.6 || metrics.uncertainty > 0.6) criticalCount++;
      if (analysisResults[rf.id]) analyzedCount++;
    }
    if (!hasAny) return null;
    return {
      totalExposureLow: totalLow, totalExposureHigh: totalHigh,
      criticalCount, analyzedCount,
      totalRiskFactors: allRfs.length,
    };
  }, [analysisResults, steps]);

  // ── Token efficiency history + forecast ────────────────────────────────────

  // Seed the live curve once steps arrive (uses initial_metrics as baseline)
  useEffect(() => {
    if (steps.length === 0 || tokenHistory.length > 0) return;
    const { low, high } = portfolioExposure(steps, {});
    if (high > 0) {
      setTokenHistory([{ tokens: 0, low, high }]);
      setRiskThreshold(high * 0.6);
    }
  }, [steps]); // eslint-disable-line react-hooks/exhaustive-deps

  // Backend health check on mount
  useEffect(() => {
    fetchHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  // Fetch the primary document when the map type is known
  useEffect(() => {
    if (mapType !== 'oil') return;
    fetchDocument('oil', 'permian_basin_risk_brief.md')
      .then(setDocMarkdown)
      .catch(() => {/* silent */});
  }, [mapType]);

  // Fetch live risk snapshot when map focus changes (best-effort, non-blocking)
  useEffect(() => {
    if (!mapFocus) return;
    const [lat, lng] = mapFocus.center;
    const stateCode = mapType === 'oil' ? 'TX' : undefined;
    fetchRiskSnapshot(lat, lng, 'US', stateCode)
      .then(setLiveRiskSnapshot)
      .catch(() => {/* silent — live data is supplementary */});
  }, [mapFocus, mapType]);

  const forecastCurve = useMemo((): ChartPoint[] => {
    if (tokenHistory.length === 0) return [];
    const { low: initLow, high: initHigh } = tokenHistory[0];
    const mid   = (initLow + initHigh) / 2;
    const halfW = (initHigh - initLow) / 2;
    const N = steps.flatMap((s) => s.risk_factors).length;
    if (N === 0 || halfW === 0) return [];
    return [
      { tokens: 0,           low: initLow,              high: initHigh },
      { tokens: N * 350,     low: mid - halfW * 0.55,   high: mid + halfW * 0.55 },
      { tokens: N * 3_000,   low: mid - halfW * 0.25,   high: mid + halfW * 0.25 },
      { tokens: N * 200_000, low: mid - halfW * 0.08,   high: mid + halfW * 0.08 },
    ];
  }, [tokenHistory, steps]);

  // Section slug → step index for the oil scenario
  const OIL_SECTION_STEP_IDX: Record<string, number> = {
    'permian-field-operations': 0,
    'midstream-egress': 1,
    'gom-offshore-buffer': 2,
  };

  // Step index → section slug (reverse lookup for chart point metadata)
  const OIL_STEP_IDX_SECTION: Record<number, string> = {
    0: 'permian-field-operations',
    1: 'midstream-egress',
    2: 'gom-offshore-buffer',
  };

  const sectionMetrics = useMemo((): Record<string, SectionMetric> => {
    if (mapType !== 'oil' || steps.length === 0) return {};
    const result: Record<string, SectionMetric> = {};
    for (const [slug, idx] of Object.entries(OIL_SECTION_STEP_IDX)) {
      const step = steps[idx];
      if (!step) continue;
      const analyzedRfs = step.risk_factors.filter((rf) => analysisResults[rf.id]);
      const isAnalyzed = analyzedRfs.length > 0;
      const metrics = isAnalyzed
        ? analyzedRfs.map((rf) => analysisResults[rf.id].metrics)
        : step.risk_factors.filter((rf) => rf.initial_metrics).map((rf) => rf.initial_metrics!);
      if (metrics.length === 0) continue;
      result[slug] = {
        failureRate: metrics.reduce((s, m) => s + m.failure_rate, 0) / metrics.length,
        lossLow:     metrics.reduce((s, m) => s + m.loss_range_low,  0),
        lossHigh:    metrics.reduce((s, m) => s + m.loss_range_high, 0),
        isAnalyzed,
      };
    }
    return result;
  }, [mapType, steps, analysisResults]); // eslint-disable-line react-hooks/exhaustive-deps

  const achievedDepth = useMemo(
    () => Object.values(analysisResults).reduce((m, r) => Math.max(m, r.depth), 0),
    [analysisResults]
  );

  // ── Decompose ──────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (description: string) => {
    setBusinessDescription(description);
    setMapType(detectMapType(description));
    setIsDecomposing(true);
    setDecomposeError(null);
    setSteps([]);
    setBusinessName('');
    setSelectedStepId(null);
    setSelectedRfId(null);
    setAnalysisResults({});
    setRiskFactorDepths({});
    setTotalTokens(0);
    setAgentThread(null);

    try {
      for await (const event of streamDecompose(description)) {
        if (event.type === 'step') {
          setSteps((prev) => {
            if (prev.find((s) => s.id === event.step.id)) return prev;
            return [...prev, event.step];
          });
          setSelectedStepId((prev) => prev ?? event.step.id);
          if (event.step.risk_factors?.length) {
            setSelectedRfId((prev) => prev ?? event.step.risk_factors[0].id);
          }
        } else if (event.type === 'meta') {
          setBusinessName(event.business_name);
          setTotalTokens((prev) => prev + event.tokens_used);
        }
      }
      setScreen('main');
    } catch (err) {
      setDecomposeError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsDecomposing(false);
    }
  }, []);

  // ── Analyse ────────────────────────────────────────────────────────────────

  const handleAnalyse = useCallback(async (rfId: string, feedback?: string, depthOverride?: Depth) => {
    let rf = null, step = null;
    for (const s of steps) {
      const found = s.risk_factors.find((r) => r.id === rfId);
      if (found) { rf = found; step = s; break; }
    }
    if (!rf || !step) return;

    const depth = depthOverride ?? riskFactorDepths[rfId] ?? globalDepth;
    const stepIdx = steps.findIndex((s) => s.id === step.id);
    const sectionId = mapType === 'oil' ? OIL_STEP_IDX_SECTION[stepIdx] : undefined;

    abortControllersRef.current.get(rfId)?.abort();
    const ac = new AbortController();
    abortControllersRef.current.set(rfId, ac);

    const initialSteps: AgentThreadStep[] =
      depth === 3
        ? [
            { id: 'Thread A',   status: 'pending', text: 'Historical incident data',             sub_items: [] },
            { id: 'Thread B',   status: 'pending', text: 'Regulatory filing scan',               sub_items: [] },
            { id: 'Thread C',   status: 'pending', text: 'Geospatial / environmental analysis',  sub_items: [] },
            { id: 'Thread D',   status: 'pending', text: 'Financial loss modelling',              sub_items: [] },
            { id: 'Synthesis',  status: 'pending', text: 'Synthesis across threads',             sub_items: [] },
          ]
        : [
            { id: 'init',       status: 'pending', text: 'Received risk factor',                 sub_items: [] },
            { id: 'scan',       status: 'pending', text: 'Scanning data sources',                sub_items: [] },
            { id: 'extract',    status: 'pending', text: 'Extracting risk signals',              sub_items: [] },
            { id: 'estimate',   status: 'pending', text: 'Estimating failure probability',       sub_items: [] },
            { id: 'uncertainty',status: 'pending', text: 'Identifying uncertainty sources',      sub_items: [] },
            { id: 'loss',       status: 'pending', text: 'Generating loss range',                sub_items: [] },
          ];

    const threadState: AgentThreadState = {
      risk_factor_id: rfId,
      risk_factor_name: rf.name,
      depth,
      steps: initialSteps,
      tokens_current: 0,
      tokens_estimated: tokenEstimateNumber(depth),
      is_complete: false,
      is_error: false,
      liveArtifacts: [],
    };

    setAgentThread(threadState);
    setSelectedRfId(rfId);
    setRunningRfIds((prev) => { const n = new Set(prev); n.add(rfId); return n; });
    setAnalysisResults((prev) => { const n = { ...prev }; delete n[rfId]; return n; });

    let stepIndex = 0;

    const updateThread = (updater: (t: AgentThreadState) => AgentThreadState) => {
      setAgentThread((prev) => {
        if (!prev || prev.risk_factor_id !== rfId) return prev;
        return updater(prev);
      });
    };

    const advanceStep = () => {
      updateThread((t) => ({
        ...t,
        steps: t.steps.map((s, i) => {
          if (i < stepIndex)  return { ...s, status: 'complete' as const };
          if (i === stepIndex) return { ...s, status: 'running'  as const };
          return s;
        }),
      }));
      stepIndex++;
    };

    advanceStep();

    try {
      for await (const event of streamAnalyse({
        risk_factor_id: rfId,
        risk_factor_name: rf.name,
        business_context: businessDescription,
        step_context: `${step.name} — ${step.description}`,
        depth,
        data_domains: ['oil', 'lemming', 'geo', 'shared'],
        model: globalModel,
        feedback,
      })) {
        if (ac.signal.aborted) break;
        switch (event.event) {
          case 'step':
            advanceStep();
            break;
          case 'file_found': {
            const fn = event.filename ?? '';
            const ext = fn.split('.').pop()?.toLowerCase() ?? '';
            const artifactType: ArtifactType =
              ['mp4', 'mkv', 'mov', 'webm'].includes(ext) ? 'video' :
              ['png', 'jpg', 'jpeg', 'tif', 'tiff', 'gif'].includes(ext) ? 'image' :
              ['mp3', 'wav', 'ogg'].includes(ext) ? 'audio' :
              ['csv', 'json', 'xlsx', 'parquet'].includes(ext) ? 'data' :
              'document';
            const liveArtifact: Artifact = {
              filename: fn,
              domain: event.domain ?? '',
              type: artifactType,
              relevance: '',
            };
            updateThread((t) => ({
              ...t,
              liveArtifacts: t.liveArtifacts.some((a) => a.filename === fn)
                ? t.liveArtifacts
                : [...t.liveArtifacts, liveArtifact],
              steps: t.steps.map((s, i) => {
                if (i !== stepIndex - 1) return s;
                const label = event.domain ? `📄 ${fn} (/${event.domain}/)` : `📄 ${fn}`;
                return { ...s, sub_items: [...s.sub_items, label] };
              }),
            }));
            break;
          }
          case 'signal':
            updateThread((t) => ({
              ...t,
              steps: t.steps.map((s, i) => {
                if (i !== stepIndex - 1) return s;
                return { ...s, sub_items: [...s.sub_items, event.text ?? ''] };
              }),
            }));
            break;
          case 'token_update':
            if (event.tokens !== undefined) {
              updateThread((t) => ({ ...t, tokens_current: event.tokens! }));
            }
            break;
          case 'complete':
            if (event.result) {
              const newResult = event.result!;
              // Update refs synchronously so any concurrent analysis that completes
              // in the same event-loop tick reads the already-accumulated values,
              // rather than a stale snapshot from the previous React render cycle.
              const newResults = { ...analysisResultsRef.current, [rfId]: newResult };
              analysisResultsRef.current = newResults;
              const newTotal = totalTokensRef.current + newResult.tokens_used;
              totalTokensRef.current = newTotal;
              const { low: newLow, high: newHigh } = portfolioExposure(steps, newResults);
              setTokenHistory((h) => [...h, {
                tokens: newTotal,
                low: newLow,
                high: newHigh,
                label: rf!.name,
                sectionId,
                depth: newResult.depth,
                summary: newResult.summary,
                gaps: newResult.gaps.slice(0, 3),
              }]);
              updateThread((t) => ({
                ...t,
                steps: t.steps.map((s) => ({ ...s, status: 'complete' as const })),
                tokens_current: newResult.tokens_used,
                is_complete: true,
                result: newResult,
              }));
              setAnalysisResults(newResults);
              setTotalTokens(newTotal);
            }
            break;
          case 'error':
            updateThread((t) => ({ ...t, is_error: true, is_complete: true }));
            break;
        }
      }
    } catch (err) {
      if (!ac.signal.aborted) {
        updateThread((t) => ({ ...t, is_error: true, is_complete: true }));
        console.error('Analysis error:', err);
      }
    } finally {
      setRunningRfIds((prev) => { const n = new Set(prev); n.delete(rfId); return n; });
      abortControllersRef.current.delete(rfId);
    }
  }, [steps, riskFactorDepths, globalDepth, globalModel, businessDescription]);

  // ── Run all ────────────────────────────────────────────────────────────────

  const handleRunAll = useCallback(async () => {
    if (isRunningAll) return;
    setIsRunningAll(true);
    const allRfs = steps
      .flatMap((s) => s.risk_factors)
      .filter((rf) => !runningRfIds.has(rf.id));
    // Cascade through depths 1→globalDepth so the chart shows full progression
    const depths: Depth[] = globalDepth === 3 ? [1, 2, 3] : globalDepth === 2 ? [1, 2] : [1];
    for (const d of depths) {
      for (const rf of allRfs) await handleAnalyse(rf.id, undefined, d);
    }
    setIsRunningAll(false);
  }, [isRunningAll, steps, runningRfIds, handleAnalyse]);

  // ── Step / RF selection ────────────────────────────────────────────────────

  const handleSelectStep = useCallback((stepId: string) => {
    setSelectedStepId(stepId);
    const step = steps.find((s) => s.id === stepId);
    if (!step) return;
    if (step.risk_factors.length) setSelectedRfId(step.risk_factors[0].id);
    setMapFocus(getStepFocus(mapType, step.position));
  }, [steps, mapType]);

  const handleSelectRf = useCallback((rfId: string) => {
    setSelectedRfId(rfId);
    for (const step of steps) {
      if (step.risk_factors.some((rf) => rf.id === rfId)) {
        setSelectedStepId(step.id);
        setMapFocus(getStepFocus(mapType, step.position));
        break;
      }
    }
  }, [steps, mapType]);

  // ── Back / reset ──────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    abortControllersRef.current.forEach((ac) => ac.abort());
    abortControllersRef.current.clear();
    setScreen('input');
    setSteps([]);
    setBusinessName('');
    setBusinessDescription('');
    setSelectedStepId(null);
    setSelectedRfId(null);
    setAnalysisResults({});
    setRiskFactorDepths({});
    setRunningRfIds(new Set());
    setAgentThread(null);
    setTotalTokens(0);
    setDecomposeError(null);
    setTokenHistory([]);
    setRiskThreshold(null);
    setMapFocus(null);
  }, []);

  const handleViewChange = useCallback((center: [number, number]) => {
    if (mapType !== 'oil') return;
    const sectionLocations = OIL_SECTION_LOCATIONS;
    // Find nearest section to the current map center
    let nearest: string | null = null;
    let minDist = Infinity;
    for (const [id, focus] of Object.entries(sectionLocations)) {
      const dlat = center[0] - focus.center[0];
      const dlon = center[1] - focus.center[1];
      const dist = Math.sqrt(dlat * dlat + dlon * dlon);
      if (dist < minDist) {
        minDist = dist;
        nearest = id;
      }
    }
    // Only highlight if reasonably close (within ~5 degrees)
    if (minDist < 5) setActiveDocSection(nearest);
  }, [mapType]);

  const handleSectionFocus = useCallback((sectionId: string, location: MapFocus | null) => {
    setActiveDocSection(sectionId);
    if (location) setMapFocus(location);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {backendOnline === false && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000,
          background: '#ff0066', color: '#fff', padding: '6px 16px',
          fontSize: '12px', fontFamily: 'monospace', textAlign: 'center',
          letterSpacing: '0.05em',
        }}>
          Backend offline — check that the API server is running
        </div>
      )}
      <TopBar
        businessName={businessName}
        totalTokens={totalTokens}
        kpis={kpis}
        globalDepth={globalDepth}
        onGlobalDepthChange={setGlobalDepth}
        globalModel={globalModel}
        onGlobalModelChange={setGlobalModel}
        onRunAll={handleRunAll}
        isRunningAll={isRunningAll}
        hasSteps={steps.length > 0}
        onBack={screen === 'main' ? handleBack : undefined}
      />

      {screen === 'input' || (steps.length === 0 && !isDecomposing) ? (
        <>
          <BusinessInput
            globalDepth={globalDepth}
            onGlobalDepthChange={setGlobalDepth}
            onSubmit={handleSubmit}
            isLoading={isDecomposing}
          />
          {decomposeError && (
            <div style={{ padding: '0 24px 24px' }}>
              <div className="error-banner">Error: {decomposeError}</div>
            </div>
          )}
        </>
      ) : (
        <div className="workspace">
          {/* LEFT: chart + executive report */}
          <div className="left-col">
            <div className="left-col__chart">
              <TokenEfficiencyChart
                liveCurve={tokenHistory}
                forecastCurve={forecastCurve}
                threshold={riskThreshold}
                onThresholdChange={setRiskThreshold}
                onPointClick={(secId) => handleSectionFocus(secId, OIL_SECTION_LOCATIONS[secId] ?? null)}
              />
            </div>
            <div className="left-col__report">
              {docMarkdown ? (
                <DocumentViewer
                  markdown={docMarkdown}
                  activeSectionId={activeDocSection}
                  sectionLocations={mapType === 'oil' ? OIL_SECTION_LOCATIONS : {}}
                  sectionMetrics={sectionMetrics}
                  achievedDepth={achievedDepth}
                  onSectionFocus={handleSectionFocus}
                />
              ) : (
                <ExecutiveReport
                  businessName={businessName}
                  steps={steps}
                  analysisResults={analysisResults}
                  selectedRfId={selectedRfId}
                  runningRfIds={runningRfIds}
                  riskFactorDepths={riskFactorDepths}
                  globalDepth={globalDepth}
                  onSelectRf={handleSelectRf}
                  onAnalyse={handleAnalyse}
                  onDepthChange={(rfId, d) => setRiskFactorDepths((prev) => ({ ...prev, [rfId]: d }))}
                />
              )}
            </div>
          </div>

          {/* RIGHT: map + debug pane */}
          <div className="right-col">
            <div className="map-area">
              <MapView mapType={mapType} focusLocation={mapFocus} onViewChange={handleViewChange}>
                <StepChainOverlay
                  steps={steps}
                  analysisResults={analysisResults}
                  selectedStepId={selectedStepId}
                  runningRiskFactorIds={runningRfIds}
                  onSelectStep={handleSelectStep}
                />
                {isDecomposing && (
                  <div className="decomposing-state">
                    <div className="loading-dots" style={{ color: 'var(--color-accent)' }}>
                      <span /><span /><span />
                    </div>
                    <span>Mapping business flow…</span>
                  </div>
                )}
              </MapView>
            </div>
            <AgentDebugPane agentThread={agentThread} liveRiskSnapshot={liveRiskSnapshot} />
          </div>
        </div>
      )}

      {/* ── Floating orchestrator toggle button ─────────────────────────── */}
      <button
        onClick={() => setShowOrchestrator(prev => !prev)}
        title={showOrchestrator ? 'Close orchestrator' : 'Open orchestrator'}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '84px',
          zIndex: 1000,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: showOrchestrator ? 'rgba(0, 204, 255, 0.15)' : '#00ccff',
          border: showOrchestrator ? '1px solid rgba(0, 204, 255, 0.4)' : 'none',
          color: showOrchestrator ? '#00ccff' : '#0a0a0f',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: showOrchestrator
            ? '0 0 16px rgba(0, 204, 255, 0.3)'
            : '0 4px 20px rgba(0, 204, 255, 0.35)',
          transition: 'all 0.2s ease',
        }}
      >
        {showOrchestrator ? '✕' : '⚡'}
      </button>

      {/* ── Orchestrator panel ─────────────────────────────────────────── */}
      {showOrchestrator && (
        <div
          style={{
            position: 'fixed',
            top: '60px',
            right: '24px',
            bottom: '84px',
            zIndex: 999,
            width: '480px',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 204, 255, 0.2)',
          }}
        >
          <OrchestrationPanel onResult={(result) => {
            // Shape guard: only accept results that have the minimum required AnalysisResult fields
            if (
              result &&
              result.risk_factor_id &&
              result.metrics &&
              typeof result.summary !== 'undefined' &&
              Array.isArray(result.recommendations) &&
              Array.isArray(result.gaps)
            ) {
              setAnalysisResults(prev => ({
                ...prev,
                [result.risk_factor_id as string]: result as unknown as AnalysisResult,
              }));
            }
          }} />
        </div>
      )}

      {/* ── Floating chat toggle button ─────────────────────────────────── */}
      <button
        onClick={() => setShowChat(prev => !prev)}
        title={showChat ? 'Close chat' : 'Open risk chat'}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: showChat ? 'rgba(0, 255, 136, 0.15)' : 'var(--color-accent, #00ff88)',
          border: showChat ? '1px solid rgba(0, 255, 136, 0.4)' : 'none',
          color: showChat ? 'var(--color-accent, #00ff88)' : '#0a0a0f',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: showChat
            ? '0 0 16px rgba(0, 255, 136, 0.3)'
            : '0 4px 20px rgba(0, 255, 136, 0.35)',
          transition: 'all 0.2s ease',
        }}
      >
        {showChat ? '✕' : '💬'}
      </button>

      {/* ── Sliding chat panel ──────────────────────────────────────────── */}
      {showChat && (
        <div
          style={{
            position: 'fixed',
            bottom: '84px',
            right: '24px',
            zIndex: 999,
            width: '380px',
            height: '520px',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 255, 136, 0.15)',
          }}
        >
          <ChatPanel />
        </div>
      )}
    </>
  );
}
