import { useState, useCallback, useRef } from 'react';
import type {
  Step,
  Depth,
  AnalysisResult,
  AgentThreadState,
} from './types';
import type { AgentThreadStep } from './types';
import { streamDecompose, streamAnalyse } from './api';
import TopBar from './components/TopBar';
import BusinessInput from './components/BusinessInput';
import BusinessFlowChart from './components/BusinessFlowChart';
import RiskFactorList from './components/RiskFactorList';
import RiskFactorDetail from './components/RiskFactorDetail';
import AgentThreadPanel from './components/AgentThreadPanel';

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
  const [steps, setSteps] = useState<Step[]>([]);
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [decomposeError, setDecomposeError] = useState<string | null>(null);

  const [globalDepth, setGlobalDepth] = useState<Depth>(2);
  const [totalTokens, setTotalTokens] = useState(0);

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedRiskFactorId, setSelectedRiskFactorId] = useState<string | null>(null);

  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResult>>({});
  const [riskFactorDepths, setRiskFactorDepths] = useState<Record<string, Depth>>({});
  const [runningRiskFactorIds, setRunningRiskFactorIds] = useState<Set<string>>(new Set());

  const [agentThread, setAgentThread] = useState<AgentThreadState | null>(null);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);

  // Track abort controllers for running analyses
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // ── Decompose ──────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (description: string) => {
    setBusinessDescription(description);
    setIsDecomposing(true);
    setDecomposeError(null);
    setSteps([]);
    setBusinessName('');
    setSelectedStepId(null);
    setSelectedRiskFactorId(null);
    setAnalysisResults({});
    setRiskFactorDepths({});
    setTotalTokens(0);

    try {
      for await (const event of streamDecompose(description)) {
        if (event.type === 'step') {
          setSteps((prev) => {
            // avoid duplicates
            if (prev.find((s) => s.id === event.step.id)) return prev;
            return [...prev, event.step];
          });
          // Auto-select first step
          setSelectedStepId((prev) => prev ?? event.step.id);
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

  // ── Analyse a single risk factor ───────────────────────────────────────────

  const handleAnalyse = useCallback(
    async (rfId: string) => {
      // Find the step and risk factor
      let rf = null;
      let step = null;
      for (const s of steps) {
        const found = s.risk_factors.find((r) => r.id === rfId);
        if (found) {
          rf = found;
          step = s;
          break;
        }
      }
      if (!rf || !step) return;

      const depth = riskFactorDepths[rfId] ?? globalDepth;

      // Abort any existing run for this rf
      abortControllersRef.current.get(rfId)?.abort();
      const ac = new AbortController();
      abortControllersRef.current.set(rfId, ac);

      // Initialise thread state
      const initialSteps: AgentThreadStep[] = [
        { id: 'init', status: 'pending', text: 'Received risk factor', sub_items: [] },
        { id: 'scan', status: 'pending', text: `Scanning data sources`, sub_items: [] },
        { id: 'extract', status: 'pending', text: 'Extracting risk signals', sub_items: [] },
        { id: 'estimate', status: 'pending', text: 'Estimating failure probability', sub_items: [] },
        { id: 'uncertainty', status: 'pending', text: 'Identifying uncertainty sources', sub_items: [] },
        { id: 'loss', status: 'pending', text: 'Generating loss range', sub_items: [] },
      ];

      if (depth === 3) {
        initialSteps.length = 0;
        initialSteps.push(
          { id: 'Thread A', status: 'pending', text: 'Historical incident data', sub_items: [] },
          { id: 'Thread B', status: 'pending', text: 'Regulatory filing scan', sub_items: [] },
          { id: 'Thread C', status: 'pending', text: 'Geospatial / environmental analysis', sub_items: [] },
          { id: 'Thread D', status: 'pending', text: 'Financial loss modelling', sub_items: [] },
          { id: 'Synthesis', status: 'pending', text: 'Synthesis across threads', sub_items: [] },
        );
      }

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
      setIsThreadOpen(true);

      setRunningRiskFactorIds((prev) => {
        const next = new Set(prev);
        next.add(rfId);
        return next;
      });

      // Remove existing result so the UI shows the running state
      setAnalysisResults((prev) => {
        const next = { ...prev };
        delete next[rfId];
        return next;
      });

      let stepIndex = 0;

      const updateThread = (updater: (t: AgentThreadState) => AgentThreadState) => {
        setAgentThread((prev) => {
          if (!prev || prev.risk_factor_id !== rfId) return prev;
          return updater(prev);
        });
      };

      const advanceStep = () => {
        updateThread((t) => {
          const steps = t.steps.map((s, i) => {
            if (i < stepIndex) return { ...s, status: 'complete' as const };
            if (i === stepIndex) return { ...s, status: 'running' as const };
            return s;
          });
          return { ...t, steps };
        });
        stepIndex++;
      };

      // Mark the first step running immediately
      advanceStep();

      try {
        const params = {
          risk_factor_id: rfId,
          risk_factor_name: rf.name,
          business_context: businessDescription,
          step_context: `${step.name} — ${step.description}`,
          depth,
          data_domains: ['oil', 'lemming', 'geo', 'shared'],
        };

        for await (const event of streamAnalyse(params)) {
          if (ac.signal.aborted) break;

          switch (event.event) {
            case 'step':
              advanceStep();
              break;

            case 'file_found':
              updateThread((t) => {
                const steps = t.steps.map((s, i) => {
                  if (i !== stepIndex - 1) return s;
                  const fileLabel = event.domain
                    ? `📄 ${event.filename} (/${event.domain}/)`
                    : `📄 ${event.filename}`;
                  return { ...s, sub_items: [...s.sub_items, fileLabel] };
                });
                return { ...t, steps };
              });
              break;

            case 'signal':
              updateThread((t) => {
                const steps = t.steps.map((s, i) => {
                  if (i !== stepIndex - 1) return s;
                  return { ...s, sub_items: [...s.sub_items, event.text ?? ''] };
                });
                return { ...t, steps };
              });
              break;

            case 'token_update':
              if (event.tokens !== undefined) {
                updateThread((t) => ({ ...t, tokens_current: event.tokens! }));
              }
              break;

            case 'complete':
              if (event.result) {
                // Mark all steps complete
                updateThread((t) => ({
                  ...t,
                  steps: t.steps.map((s) => ({ ...s, status: 'complete' as const })),
                  tokens_current: event.result!.tokens_used,
                  is_complete: true,
                  result: event.result,
                }));

                setAnalysisResults((prev) => ({
                  ...prev,
                  [rfId]: event.result!,
                }));
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
        setRunningRiskFactorIds((prev) => {
          const next = new Set(prev);
          next.delete(rfId);
          return next;
        });
        abortControllersRef.current.delete(rfId);
        setIsRunningAll(false);
      }
    },
    [steps, riskFactorDepths, globalDepth, businessDescription]
  );

  // ── Run all risk factors ───────────────────────────────────────────────────

  const handleRunAll = useCallback(async () => {
    if (isRunningAll) return;
    setIsRunningAll(true);

    const allRFs = steps.flatMap((s) => s.risk_factors);
    const unanalyzed = allRFs.filter(
      (rf) => !analysisResults[rf.id] && !runningRiskFactorIds.has(rf.id)
    );

    for (const rf of unanalyzed) {
      await handleAnalyse(rf.id);
    }

    setIsRunningAll(false);
  }, [isRunningAll, steps, analysisResults, runningRiskFactorIds, handleAnalyse]);

  // ── Step selection ─────────────────────────────────────────────────────────

  const handleSelectStep = useCallback((stepId: string) => {
    setSelectedStepId(stepId);
    const step = steps.find((s) => s.id === stepId);
    if (step?.risk_factors.length) {
      setSelectedRiskFactorId(step.risk_factors[0].id);
    }
  }, [steps]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? null;
  const selectedRiskFactor =
    selectedStep?.risk_factors.find((rf) => rf.id === selectedRiskFactorId) ?? null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <TopBar
        businessName={businessName}
        totalTokens={totalTokens}
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
        <div className="main-view">
          <div className="main-view__body">
            {/* Flow chart */}
            {steps.length > 0 ? (
              <BusinessFlowChart
                steps={steps}
                analysisResults={analysisResults}
                selectedStepId={selectedStepId}
                runningRiskFactorIds={runningRiskFactorIds}
                onSelectStep={handleSelectStep}
              />
            ) : (
              <div className="decomposing-state">
                <div className="loading-dots" style={{ color: 'var(--color-accent)' }}>
                  <span /><span /><span />
                </div>
                <span>Mapping business flow…</span>
              </div>
            )}

            {/* Detail area */}
            <div className="detail-area">
              {selectedStep && selectedRiskFactor ? (
                <>
                  <RiskFactorList
                    step={selectedStep}
                    analysisResults={analysisResults}
                    riskFactorDepths={riskFactorDepths}
                    globalDepth={globalDepth}
                    runningRiskFactorIds={runningRiskFactorIds}
                    selectedRiskFactorId={selectedRiskFactorId}
                    onSelectRiskFactor={setSelectedRiskFactorId}
                  />
                  <RiskFactorDetail
                    riskFactor={selectedRiskFactor}
                    result={analysisResults[selectedRiskFactor.id]}
                    isRunning={runningRiskFactorIds.has(selectedRiskFactor.id)}
                    agentThread={agentThread}
                    depth={riskFactorDepths[selectedRiskFactor.id] ?? globalDepth}
                    onDepthChange={(rfId, d) =>
                      setRiskFactorDepths((prev) => ({ ...prev, [rfId]: d }))
                    }
                    onAnalyse={handleAnalyse}
                    onOpenThread={() => setIsThreadOpen(true)}
                  />
                </>
              ) : (
                <div className="detail-empty">
                  Click a step to explore its risk factors
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Agent thread side panel */}
      <AgentThreadPanel
        thread={agentThread}
        isOpen={isThreadOpen}
        onClose={() => setIsThreadOpen(false)}
        onStop={() => {
          if (agentThread) {
            abortControllersRef.current.get(agentThread.risk_factor_id)?.abort();
          }
        }}
      />
    </>
  );
}
