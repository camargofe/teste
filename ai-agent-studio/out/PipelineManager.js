"use strict";
// ============================================================
// AI Agent Studio — Pipeline Manager
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineManager = void 0;
const utils_1 = require("./utils");
class PipelineManager {
    constructor(context, agentManager) {
        this.pipelines = new Map();
        this.runningPipelines = new Set();
        this.context = context;
        this.agentManager = agentManager;
        this.loadPipelines();
    }
    // ─── CRUD ────────────────────────────────────────────────
    createPipeline(data) {
        const pipeline = {
            id: (0, utils_1.generateId)(),
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
    updatePipeline(id, data) {
        const p = this.pipelines.get(id);
        if (!p)
            return null;
        const updated = { ...p, ...data, id, updatedAt: Date.now() };
        this.pipelines.set(id, updated);
        this.savePipelines();
        return updated;
    }
    deletePipeline(id) {
        const deleted = this.pipelines.delete(id);
        if (deleted)
            this.savePipelines();
        return deleted;
    }
    getAllPipelines() {
        return Array.from(this.pipelines.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    }
    getPipeline(id) {
        return this.pipelines.get(id);
    }
    addNode(pipelineId, agentId, type, label, task) {
        const pipeline = this.pipelines.get(pipelineId);
        if (!pipeline)
            return null;
        const node = {
            id: (0, utils_1.generateId)(),
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
    removeNode(pipelineId, nodeId) {
        const pipeline = this.pipelines.get(pipelineId);
        if (!pipeline)
            return false;
        const before = pipeline.nodes.length;
        pipeline.nodes = pipeline.nodes.filter(n => n.id !== nodeId);
        pipeline.nodes.forEach((n, i) => (n.position = i));
        pipeline.updatedAt = Date.now();
        this.savePipelines();
        return pipeline.nodes.length < before;
    }
    // ─── Execution ───────────────────────────────────────────
    async runPipeline(pipelineId, initialInput, projectContext) {
        const pipeline = this.pipelines.get(pipelineId);
        if (!pipeline)
            throw new Error(`Pipeline não encontrado: ${pipelineId}`);
        if (this.runningPipelines.has(pipelineId))
            throw new Error('Pipeline já está em execução');
        this.runningPipelines.add(pipelineId);
        pipeline.isRunning = true;
        this.savePipelines();
        const startTime = Date.now();
        const steps = [];
        let currentInput = initialInput;
        let totalTokens = 0;
        let success = true;
        let error;
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
        }
        catch (err) {
            success = false;
            error = err instanceof Error ? err.message : String(err);
            pipeline.stats.totalRuns++;
            pipeline.stats.failedRuns++;
        }
        finally {
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
    stopPipeline(pipelineId) {
        this.runningPipelines.delete(pipelineId);
        const pipeline = this.pipelines.get(pipelineId);
        if (pipeline) {
            pipeline.isRunning = false;
            this.savePipelines();
        }
    }
    isRunning(pipelineId) {
        return this.runningPipelines.has(pipelineId);
    }
    // ─── Persistence ─────────────────────────────────────────
    savePipelines() {
        this.context.globalState.update('pipelines', Array.from(this.pipelines.values()));
    }
    loadPipelines() {
        const stored = this.context.globalState.get('pipelines', []);
        stored.forEach(p => this.pipelines.set(p.id, { ...p, isRunning: false }));
        if (this.pipelines.size === 0) {
            this.createDefaultPipeline();
        }
    }
    createDefaultPipeline() {
        this.createPipeline({
            name: 'Análise de Código',
            description: 'Analisa código-fonte e gera documentação automática',
            nodes: [],
            continuous: false,
        });
    }
}
exports.PipelineManager = PipelineManager;
//# sourceMappingURL=PipelineManager.js.map