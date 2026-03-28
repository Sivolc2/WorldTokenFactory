import { useState, useCallback, useRef, useMemo } from 'react';
import type {
  Step,
  Depth,
  AnalysisResult,
  AgentThreadState,
  AgentThreadStep,
} from './types';
import { streamDecompose, streamAnalyse } from './api';
import TopBar, { type TopBarKPIs } from './components/TopBar';
import BusinessInput from './components/BusinessInput';
import MapView, { detectMapType, type BusinessMapType } from './components/MapView';
import StepChainOverlay from './components/StepChainOverlay';
import LHSPanel from './components/LHSPanel';
import RHSPanel from './components/RHSPanel';

type AppScreen = 'input' | 'main';

function tokenEstimateNumber(depth: Depth): number {
  switch (depth) {
    case 1: return 350;
    case 2: return 3000;
    case 3: return 200000;
  }
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
  const [totalTokens, setTotalTokens] = useState(0);

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedRfId, setSelectedRfId] = useState<string | null>(null);

  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResult>>({});
  const [riskFactorDepths, setRiskFactorDepths] = useState<Record<string, Depth>>({});
  const [runningRfIds, setRunningRfIds] = useState<Set<string>>(new Set());

  const [agentThread, setAgentThread] = useState<AgentThreadState | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);

  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // ── KPIs ───────────────────────────────────────────────────────────────────

  const kpis = useMemo((): TopBarKPIs | null => {
    const results = Object.values(analysisResults);
    if (results.length === 0) return null;
    let totalLow = 0, totalHigh = 0, criticalCount = 0;
    for (const r of results) {
      totalLow  += r.metrics.loss_range_low;
      totalHigh += r.metrics.loss_range_high;
      if (r.metrics.failure_rate > 0.6 || r.metrics.uncertainty > 0.6) criticalCount++;
    }
    return {
      totalExposureLow: totalLow, totalExposureHigh: totalHigh,
      criticalCount, analyzedCount: results.length,
      totalRiskFactors: steps.reduce((n, s) => n + s.risk_factors.length, 0),
    };
  }, [analysisResults, steps]);

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

  const handleAnalyse = useCallback(async (rfId: string) => {
    let rf = null, step = null;
    for (const s of steps) {
      const found = s.risk_factors.find((r) => r.id === rfId);
      if (found) { rf = found; step = s; break; }
    }
    if (!rf || !step) return;

    const depth = riskFactorDepths[rfId] ?? globalDepth;

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
      })) {
        if (ac.signal.aborted) break;
        switch (event.event) {
          case 'step':
            advanceStep();
            break;
          case 'file_found':
            updateThread((t) => ({
              ...t,
              steps: t.steps.map((s, i) => {
                if (i !== stepIndex - 1) return s;
                const label = event.domain ? `📄 ${event.filename} (/${event.domain}/)` : `📄 ${event.filename}`;
                return { ...s, sub_items: [...s.sub_items, label] };
              }),
            }));
            break;
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
              updateThread((t) => ({
                ...t,
                steps: t.steps.map((s) => ({ ...s, status: 'complete' as const })),
                tokens_current: event.result!.tokens_used,
                is_complete: true,
                result: event.result,
              }));
              setAnalysisResults((prev) => ({ ...prev, [rfId]: event.result! }));
              setTotalTokens((prev) => prev + event.result!.tokens_used);
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
  }, [steps, riskFactorDepths, globalDepth, businessDescription]);

  // ── Run all ────────────────────────────────────────────────────────────────

  const handleRunAll = useCallback(async () => {
    if (isRunningAll) return;
    setIsRunningAll(true);
    const unanalyzed = steps
      .flatMap((s) => s.risk_factors)
      .filter((rf) => !analysisResults[rf.id] && !runningRfIds.has(rf.id));
    for (const rf of unanalyzed) await handleAnalyse(rf.id);
    setIsRunningAll(false);
  }, [isRunningAll, steps, analysisResults, runningRfIds, handleAnalyse]);

  // ── Step selection ─────────────────────────────────────────────────────────

  const handleSelectStep = useCallback((stepId: string) => {
    setSelectedStepId(stepId);
    const step = steps.find((s) => s.id === stepId);
    if (step?.risk_factors.length) setSelectedRfId(step.risk_factors[0].id);
  }, [steps]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? null;
  const selectedRf = selectedStep?.risk_factors.find((rf) => rf.id === selectedRfId) ?? null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <TopBar
        businessName={businessName}
        totalTokens={totalTokens}
        kpis={kpis}
        onRunAll={handleRunAll}
        isRunningAll={isRunningAll}
        hasSteps={steps.length > 0}
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
          {/* LHS: risk charts + artifacts */}
          <LHSPanel
            selectedStep={selectedStep}
            selectedRfId={selectedRfId}
            analysisResults={analysisResults}
            riskFactorDepths={riskFactorDepths}
            globalDepth={globalDepth}
            runningRiskFactorIds={runningRfIds}
            onSelectRf={setSelectedRfId}
            onDepthChange={(rfId, d) => setRiskFactorDepths((prev) => ({ ...prev, [rfId]: d }))}
            onAnalyse={handleAnalyse}
          />

          {/* CENTER: map + step chain overlay */}
          <div className="map-area">
            <MapView mapType={mapType}>
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

          {/* RHS: agent thread + RF detail */}
          <RHSPanel
            selectedRf={selectedRf}
            result={selectedRf ? analysisResults[selectedRf.id] : undefined}
            isRunning={selectedRf ? runningRfIds.has(selectedRf.id) : false}
            agentThread={agentThread}
            depth={selectedRf ? (riskFactorDepths[selectedRf.id] ?? globalDepth) : globalDepth}
            onDepthChange={(rfId, d) => setRiskFactorDepths((prev) => ({ ...prev, [rfId]: d }))}
            onAnalyse={handleAnalyse}
          />
        </div>
      )}
    </>
  );
}
