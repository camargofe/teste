// ============================================================
// AI Agent Studio — Pipeline Manager
// ============================================================

import * as vscode from 'vscode';
import { Pipeline, PipelineNode, PipelineNodeType } from './types';
import { generateId } from './utils';
import { AgentManager } from './AgentManager';

export interface PipelineRunResult {
  pipelineId: string;
  steps: Array<{ nodeId: string; agentId: string; input: string; output: string; durationMs: number; tokens: number }>;
  finalOutput: string;
  totalTokens: number;
  totalDurationMs: number;
  success: boolean;
  error?: string;
}

export class PipelineManager {
  private pipelines: Map<string, Pipeline> = new Map();
  private runningPipelines: Set<string> = new Set();
  private context: vscode.ExtensionContext;
  private agentManager: AgentManager;

  constructor(context: vscode.ExtensionContext, agentManager: AgentManager) {
    this.context = context;
    this.agentManager = agentManager;
    this.loadPipelines();
  }

  // ─── CRUD ────────────────────────────────────────────────

  createPipeline(data: Partial<Pipeline>): Pipeline {
    const pipeline: Pipeline = {
      id: generateId(),
      name: data.name ?? 'Novo Pipeline',
      description: data.description ?? '',
      nodes: data.nodes ?? [],
      isRunning: false,
      continuous: data.continuous ?? false,
      schedule: data.schedule,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: { totalRuns: 0, successRuns: 0, failedRuns: 0 },
    };
    this.pipelines.set(pipeline.id, pipeline);
    this.savePipelines();
    return pipeline;
  }

  updatePipeline(id: string, data: Partial<Pipeline>): Pipeline | null {
    const p = this.pipelines.get(id);
    if (!p) return null;
    const updated = { ...p, ...data, id, updatedAt: Date.now() };
    this.pipelines.set(id, updated);
    this.savePipelines();
    return updated;
  }

  deletePipeline(id: string): boolean {
    const deleted = this.pipelines.delete(id);
    if (deleted) this.savePipelines();
    return deleted;
  }

  getAllPipelines(): Pipeline[] {
    return Array.from(this.pipelines.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getPipeline(id: string): Pipeline | undefined {
    return this.pipelines.get(id);
  }

  addNode(pipelineId: string, agentId: string, type: PipelineNodeType, label: string, task: string): PipelineNode | null {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return null;
    const node: PipelineNode = {
      id: generateId(),
      agentId,
      label,
      type,
      taskDescription: task,
      position: pipeline.nodes.length,
    };
    pipeline.nodes.push(node);
    pipeline.updatedAt = Date.now();
    this.savePipelines();
    return node;
  }

  removeNode(pipelineId: string, nodeId: string): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return false;
    const before = pipeline.nodes.length;
    pipeline.nodes = pipeline.nodes.filter(n => n.id !== nodeId);
    pipeline.nodes.forEach((n, i) => (n.position = i));
    pipeline.updatedAt = Date.now();
    this.savePipelines();
    return pipeline.nodes.length < before;
  }

  // ─── Execution ───────────────────────────────────────────

  async runPipeline(pipelineId: string, initialInput: string, projectContext?: string): Promise<PipelineRunResult> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) throw new Error(`Pipeline não encontrado: ${pipelineId}`);
    if (this.runningPipelines.has(pipelineId)) throw new Error('Pipeline já está em execução');

    this.runningPipelines.add(pipelineId);
    pipeline.isRunning = true;
    this.savePipelines();

    const startTime = Date.now();
    const steps: PipelineRunResult['steps'] = [];
    let currentInput = initialInput;
    let totalTokens = 0;
    let success = true;
    let error: string | undefined;

    try {
      for (const node of pipeline.nodes.sort((a, b) => a.position - b.position)) {
        const stepStart = Date.now();
        const prompt = `${node.taskDescription}\n\nInput recebido:\n${currentInput}`;

        const result = await this.agentManager.callAgent(node.agentId, prompt, undefined, projectContext);

        steps.push({
          nodeId: node.id,
          agentId: node.agentId,
          input: currentInput,
          output: result.response,
          durationMs: Date.now() - stepStart,
          tokens: result.tokens,
        });

        totalTokens += result.tokens;
        currentInput = result.response; // chain output to next input
      }

      // Update stats
      pipeline.stats.totalRuns++;
      pipeline.stats.successRuns++;
      pipeline.stats.lastRunAt = Date.now();
      pipeline.stats.avgDurationMs = Math.round((Date.now() - startTime + (pipeline.stats.avgDurationMs ?? 0)) / 2);
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      pipeline.stats.totalRuns++;
      pipeline.stats.failedRuns++;
    } finally {
      pipeline.isRunning = false;
      this.runningPipelines.delete(pipelineId);
      this.savePipelines();
    }

    return {
      pipelineId,
      steps,
      finalOutput: currentInput,
      totalTokens,
      totalDurationMs: Date.now() - startTime,
      success,
      error,
    };
  }

  stopPipeline(pipelineId: string): void {
    this.runningPipelines.delete(pipelineId);
    const pipeline = this.pipelines.get(pipelineId);
    if (pipeline) {
      pipeline.isRunning = false;
      this.savePipelines();
    }
  }

  isRunning(pipelineId: string): boolean {
    return this.runningPipelines.has(pipelineId);
  }

  // ─── Persistence ─────────────────────────────────────────

  private savePipelines(): void {
    this.context.globalState.update('pipelines', Array.from(this.pipelines.values()));
  }

  private loadPipelines(): void {
    const stored = this.context.globalState.get<Pipeline[]>('pipelines', []);
    stored.forEach(p => this.pipelines.set(p.id, { ...p, isRunning: false }));
    if (this.pipelines.size === 0) {
      this.createDefaultPipeline();
    }
  }

  private createDefaultPipeline(): void {
    this.createPipeline({
      name: 'Análise de Código',
      description: 'Analisa código-fonte e gera documentação automática',
      nodes: [],
      continuous: false,
    });
  }
}
