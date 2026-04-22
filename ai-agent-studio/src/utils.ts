// ============================================================
// AI Agent Studio — Utilities
// ============================================================

import { ModelId, ModelInfo } from './types';

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const MODELS: Record<ModelId, ModelInfo> = {
  'qwen-max': {
    id: 'qwen-max',
    name: 'Qwen Max',
    description: 'Modelo mais poderoso — raciocínio avançado',
    maxTokens: 8192,
    costPer1kTokens: 0.04,
    isFree: false,
    badge: 'POWER',
  },
  'qwen-plus': {
    id: 'qwen-plus',
    name: 'Qwen Plus',
    description: 'Equilibrio ideal entre qualidade e custo',
    maxTokens: 32768,
    costPer1kTokens: 0.004,
    isFree: false,
    badge: 'RECOMENDADO',
  },
  'qwen-turbo': {
    id: 'qwen-turbo',
    name: 'Qwen Turbo',
    description: 'Rápido e econômico para tarefas gerais',
    maxTokens: 8192,
    costPer1kTokens: 0.0008,
    isFree: false,
    badge: 'RÁPIDO',
  },
  'qwen-lite': {
    id: 'qwen-lite',
    name: 'Qwen Lite',
    description: 'Modelo leve — alta velocidade, baixo custo',
    maxTokens: 4096,
    costPer1kTokens: 0.0002,
    isFree: false,
  },
  'qwen-coder-plus': {
    id: 'qwen-coder-plus',
    name: 'Qwen Coder Plus',
    description: 'Especializado em código e programação',
    maxTokens: 32768,
    costPer1kTokens: 0.0035,
    isFree: false,
    badge: 'DEV',
  },
  'lite-free': {
    id: 'lite-free',
    name: 'Agente Leve (Grátis)',
    description: 'Simulado — sem custo para tarefas simples',
    maxTokens: 512,
    costPer1kTokens: 0,
    isFree: true,
    badge: 'GRÁTIS',
  },
};

export function getModelInfo(id: ModelId): ModelInfo {
  return MODELS[id] ?? MODELS['qwen-plus'];
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go', java: 'java', cs: 'csharp',
    cpp: 'cpp', c: 'c', rb: 'ruby', php: 'php', swift: 'swift',
    kt: 'kotlin', md: 'markdown', json: 'json', yaml: 'yaml', yml: 'yaml',
    toml: 'toml', html: 'html', css: 'css', scss: 'scss', sql: 'sql',
    sh: 'bash', dockerfile: 'dockerfile', vue: 'vue', svelte: 'svelte',
  };
  return map[ext] ?? 'text';
}

export const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'out', 'build', '.next', '__pycache__',
  '.venv', 'venv', 'env', 'coverage', '.nyc_output', 'vendor', 'target',
  '.cache', '.parcel-cache', '.turbo', 'tmp', 'temp', 'logs', '.DS_Store',
]);

export const RELEVANT_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'java', 'cs', 'rb', 'php',
  'swift', 'kt', 'md', 'json', 'yaml', 'yml', 'toml', 'html', 'css', 'scss',
  'sql', 'sh', 'vue', 'svelte', 'cpp', 'c', 'h', 'dockerfile', 'env',
]);
