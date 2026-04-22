// ============================================================
// AI Agent Studio — Type Definitions
// ============================================================

export type ModelId =
  | 'qwen-plus'
  | 'qwen-max'
  | 'qwen-turbo'
  | 'qwen-lite'
  | 'qwen-coder-plus'
  | 'lite-free';

export interface ModelInfo {
  id: ModelId;
  name: string;
  description: string;
  maxTokens: number;
  costPer1kTokens: number;
  isFree: boolean;
  badge?: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  model: ModelId;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  color: string;
  icon: string;
  isActive: boolean;
  stats: {
    totalRequests: number;
    totalTokens: number;
    totalChars: number;
    lastUsed?: number;
  };
}

export type PipelineNodeType =
  | 'input'
  | 'transform'
  | 'output'
  | 'filter'
  | 'branch'
  | 'merge';

export interface PipelineNode {
  id: string;
  agentId: string;
  label: string;
  type: PipelineNodeType;
  taskDescription: string;
  position: number;
  outputVariable?: string;
  conditions?: string[];
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  nodes: PipelineNode[];
  isRunning: boolean;
  schedule?: string; // cron expression
  continuous: boolean;
  createdAt: number;
  updatedAt: number;
  stats: {
    totalRuns: number;
    successRuns: number;
    failedRuns: number;
    lastRunAt?: number;
    avgDurationMs?: number;
  };
}

export interface Metrics {
  totalTokensUsed: number;
  totalRequests: number;
  totalCharsProcessed: number;
  freeRequestsUsed: number;
  freeRequestsLimit: number;
  dailyTokens: number;
  dailyRequests: number;
  history: MetricEntry[];
}

export interface MetricEntry {
  timestamp: number;
  tokens: number;
  requests: number;
  model: ModelId;
  agentId?: string;
}

export interface ProjectContext {
  rootPath: string;
  files: ContextFile[];
  totalChars: number;
  indexedAt: number;
  summary?: string;
}

export interface ContextFile {
  path: string;
  relativePath: string;
  content: string;
  language: string;
  size: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  agentId?: string;
  tokens?: number;
}

export interface AgentSession {
  id: string;
  agentId: string;
  messages: ChatMessage[];
  createdAt: number;
  title: string;
}

export interface StudioState {
  agents: Agent[];
  pipelines: Pipeline[];
  metrics: Metrics;
  sessions: AgentSession[];
  activeSessionId?: string;
  projectContext?: ProjectContext;
}
