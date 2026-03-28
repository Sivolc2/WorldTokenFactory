import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
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
import ChatPanel from './components/ChatPanel';
import type { ChartPoint } from './components/TokenEfficiencyChart';

type AppScreen = 'input' | 'main';

/** Sum of (high − low) across all factors, using best available metrics. */
function portfolioUncertainty(steps: Step[], results: Record<string, AnalysisResult>): number {
  return steps.flatMap((s) => s.risk_factors).reduce((sum, rf) => {
    const m = results[rf.id]?.metrics ?? rf.initial_metrics;
    return sum + (m ? m.loss_range_high - m.loss_range_low : 0);
  }, 0);
}

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
  const [showChat, setShowChat] = useState(false);

  const [tokenHistory, setTokenHistory] = useState<ChartPoint[]>([]);
  const [riskThreshold, setRiskThreshold] = useState<number | null>(null);

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
    const unc = portfolioUncertainty(steps, {});
    if (unc > 0) {
      setTokenHistory([{ tokens: 0, uncertainty: unc }]);
      setRiskThreshold(unc * 0.3);
    }
  }, [steps]); // eslint-disable-line react-hooks/exhaustive-deps

  const forecastCurve = useMemo((): ChartPoint[] => {
    if (tokenHistory.length === 0) return [];
    const initialUnc = tokenHistory[0].uncertainty;
    const N = steps.flatMap((s) => s.risk_factors).length;
    if (N === 0 || initialUnc === 0) return [];
    return [
      { tokens: 0,           uncertainty: initialUnc },
      { tokens: N * 350,     uncertainty: initialUnc * 0.55 },
      { tokens: N * 3_000,   uncertainty: initialUnc * 0.25 },
      { tokens: N * 200_000, uncertainty: initialUnc * 0.08 },
    ];
  }, [tokenHistory, steps]);

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

  const handleAnalyse = useCallback(async (rfId: string, feedback?: string) => {
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
        feedback,
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
              const newResult = event.result!;
              const newResults = { ...analysisResultsRef.current, [rfId]: newResult };
              const newTotal   = totalTokensRef.current + newResult.tokens_used;
              const newUnc     = portfolioUncertainty(steps, newResults);
              setTokenHistory((h) => [...h, { tokens: newTotal, uncertainty: newUnc }]);
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
  }, []);

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
            tokenHistory={tokenHistory}
            forecastCurve={forecastCurve}
            riskThreshold={riskThreshold}
            onThresholdChange={setRiskThreshold}
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
            onAnalyse={(rfId, feedback) => handleAnalyse(rfId, feedback)}
          />
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
