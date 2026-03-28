export type Depth = 1 | 2 | 3;

export interface RiskMetrics {
  failure_rate: number; // 0.0 – 1.0
  uncertainty: number; // 0.0 – 1.0
  loss_range_low: number; // USD
  loss_range_high: number; // USD
  loss_range_note: string;
}

export interface RiskFactor {
  id: string;
  name: string;
  description: string;
  step_id?: string;
  initial_metrics?: RiskMetrics; // rough bounds from the decompose step
}

export interface Step {
  id: string;
  name: string;
  description: string;
  position: number;
  risk_factors: RiskFactor[];
}

export type ArtifactType = 'document' | 'image' | 'youtube' | 'audio' | 'video' | 'data';

export interface Artifact {
  filename: string;
  domain: string;
  type: ArtifactType;
  relevance: string;
  url?: string;
}

export interface AnalysisResult {
  risk_factor_id: string;
  summary: string;
  gaps: string[];
  metrics: RiskMetrics;
  artifacts: Artifact[];
  tokens_used: number;
  depth: Depth;
}

export interface AgentThreadStep {
  id: string;
  status: 'complete' | 'running' | 'pending';
  text: string;
  sub_items: string[];
}

export interface AgentThreadState {
  risk_factor_id: string;
  risk_factor_name: string;
  depth: Depth;
  steps: AgentThreadStep[];
  tokens_current: number;
  tokens_estimated: number;
  is_complete: boolean;
  is_error: boolean;
  result?: AnalysisResult;
}

export interface AnalyseStreamEvent {
  event: 'step' | 'file_found' | 'signal' | 'complete' | 'error' | 'token_update';
  text?: string;
  filename?: string;
  domain?: string;
  result?: AnalysisResult;
  tokens?: number;
}
