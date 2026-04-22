"use strict";
// ============================================================
// AI Agent Studio — VS Code Extension Entry Point
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const AgentManager_1 = require("./AgentManager");
const PipelineManager_1 = require("./PipelineManager");
const ContextManager_1 = require("./ContextManager");
const utils_1 = require("./utils");
let panel;
let agentManager;
let pipelineManager;
let contextManager;
// ─── ACTIVATION ───────────────────────────────────────────
function activate(context) {
    agentManager = new AgentManager_1.AgentManager(context);
    pipelineManager = new PipelineManager_1.PipelineManager(context, agentManager);
    contextManager = new ContextManager_1.ContextManager();
    // Register commands
    const cmds = [
        ['aiAgentStudio.openDashboard', () => openDashboard(context)],
        ['aiAgentStudio.createAgent', () => { openDashboard(context); setTimeout(() => sendToWebview({ type: 'openCreateAgent' }), 500); }],
        ['aiAgentStudio.useProjectContext', () => indexProjectContext()],
        ['aiAgentStudio.runPipeline', () => { openDashboard(context); setTimeout(() => sendToWebview({ type: 'openRunPipeline' }), 500); }],
        ['aiAgentStudio.openMetrics', () => { openDashboard(context); setTimeout(() => sendToWebview({ type: 'navigateTo', page: 'metrics' }), 500); }],
    ];
    for (const [cmd, handler] of cmds) {
        context.subscriptions.push(vscode.commands.registerCommand(cmd, handler));
    }
    // Status bar button
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBar.text = '$(robot) AI Agents';
    statusBar.tooltip = 'Abrir AI Agent Studio';
    statusBar.command = 'aiAgentStudio.openDashboard';
    statusBar.show();
    context.subscriptions.push(statusBar);
    console.log('AI Agent Studio activated');
}
// ─── DEACTIVATION ─────────────────────────────────────────
function deactivate() {
    panel?.dispose();
}
// ─── OPEN DASHBOARD ───────────────────────────────────────
function openDashboard(context) {
    if (panel) {
        panel.reveal(vscode.ViewColumn.One);
        sendInitData();
        return;
    }
    panel = vscode.window.createWebviewPanel('aiAgentStudio', 'AI Agent Studio', vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, 'media')),
            vscode.Uri.file(path.join(context.extensionPath, 'out', 'media')),
        ],
    });
    panel.iconPath = getIconPath(context);
    panel.webview.html = getWebviewContent(context, panel.webview);
    // Handle messages from webview
    panel.webview.onDidReceiveMessage(async (msg) => handleWebviewMessage(msg, context), undefined, context.subscriptions);
    panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
}
// ─── WEBVIEW CONTENT ──────────────────────────────────────
function getWebviewContent(context, webview) {
    // Try to load from media directory
    const htmlPaths = [
        path.join(context.extensionPath, 'media', 'dashboard.html'),
        path.join(context.extensionPath, 'out', 'media', 'dashboard.html'),
    ];
    let html = '';
    for (const p of htmlPaths) {
        if (fs.existsSync(p)) {
            html = fs.readFileSync(p, 'utf-8');
            break;
        }
    }
    if (!html) {
        return '<html><body style="background:#0d1117;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui"><h2>⚠ dashboard.html não encontrado</h2></body></html>';
    }
    return html;
}
// ─── HANDLE WEBVIEW MESSAGES ──────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleWebviewMessage(msg, context) {
    switch (msg.type) {
        case 'ready':
            sendInitData();
            break;
        case 'createAgent': {
            const agent = agentManager.createAgent(msg.data);
            sendToWebview({ type: 'agentsUpdate', agents: agentManager.getAllAgents() });
            break;
        }
        case 'updateAgent': {
            agentManager.updateAgent(msg.id, msg.data);
            sendToWebview({ type: 'agentsUpdate', agents: agentManager.getAllAgents() });
            break;
        }
        case 'deleteAgent': {
            agentManager.deleteAgent(msg.id);
            sendToWebview({ type: 'agentsUpdate', agents: agentManager.getAllAgents() });
            break;
        }
        case 'callAgent': {
            try {
                const ctx = msg.useContext ? contextManager.buildContextString() : undefined;
                const result = await agentManager.callAgent(msg.agentId, msg.message, msg.sessionId, ctx);
                sendToWebview({ type: 'agentResponse', ...result });
                sendToWebview({ type: 'metricsUpdate', metrics: agentManager.getMetrics() });
                // Update agents (stats changed)
                sendToWebview({ type: 'agentsUpdate', agents: agentManager.getAllAgents() });
            }
            catch (err) {
                sendToWebview({ type: 'agentError', error: err instanceof Error ? err.message : String(err) });
            }
            break;
        }
        case 'createPipeline': {
            pipelineManager.createPipeline(msg.data);
            sendToWebview({ type: 'pipelinesUpdate', pipelines: pipelineManager.getAllPipelines() });
            break;
        }
        case 'deletePipeline': {
            pipelineManager.deletePipeline(msg.id);
            sendToWebview({ type: 'pipelinesUpdate', pipelines: pipelineManager.getAllPipelines() });
            break;
        }
        case 'addNode': {
            pipelineManager.addNode(msg.pipelineId, msg.data.agentId, msg.data.type, msg.data.label, msg.data.task);
            sendToWebview({ type: 'pipelinesUpdate', pipelines: pipelineManager.getAllPipelines() });
            break;
        }
        case 'removeNode': {
            pipelineManager.removeNode(msg.pipelineId, msg.nodeId);
            sendToWebview({ type: 'pipelinesUpdate', pipelines: pipelineManager.getAllPipelines() });
            break;
        }
        case 'runPipeline': {
            try {
                const ctx = msg.useContext ? contextManager.buildContextString() : undefined;
                const result = await pipelineManager.runPipeline(msg.id, msg.input, ctx);
                sendToWebview({ type: 'pipelineResult', result });
                sendToWebview({ type: 'pipelinesUpdate', pipelines: pipelineManager.getAllPipelines() });
                sendToWebview({ type: 'metricsUpdate', metrics: agentManager.getMetrics() });
            }
            catch (err) {
                sendToWebview({ type: 'pipelineError', error: err instanceof Error ? err.message : String(err) });
            }
            break;
        }
        case 'indexContext': {
            try {
                const ctx = await contextManager.indexProject();
                sendToWebview({ type: 'contextIndexed', summary: contextManager.getContextSummary() });
            }
            catch (err) {
                vscode.window.showErrorMessage('Erro ao indexar projeto: ' + (err instanceof Error ? err.message : String(err)));
            }
            break;
        }
        case 'saveSettings': {
            const cfg = vscode.workspace.getConfiguration('aiAgentStudio');
            if (msg.apiKey)
                await cfg.update('openRouterApiKey', msg.apiKey, vscode.ConfigurationTarget.Global);
            if (msg.defaultModel)
                await cfg.update('defaultModel', msg.defaultModel, vscode.ConfigurationTarget.Global);
            if (msg.temperature !== undefined)
                await cfg.update('temperature', msg.temperature, vscode.ConfigurationTarget.Global);
            if (msg.maxTokens !== undefined)
                await cfg.update('maxTokens', msg.maxTokens, vscode.ConfigurationTarget.Global);
            break;
        }
        case 'clearMetrics': {
            agentManager.resetDailyMetrics();
            sendToWebview({ type: 'metricsUpdate', metrics: agentManager.getMetrics() });
            break;
        }
        case 'resetAll': {
            await context.globalState.update('agents', undefined);
            await context.globalState.update('pipelines', undefined);
            await context.globalState.update('metrics', undefined);
            await context.globalState.update('sessions', undefined);
            vscode.window.showInformationMessage('AI Agent Studio: Dados resetados. Reabra a extensão.');
            panel?.dispose();
            break;
        }
    }
}
// ─── HELPERS ──────────────────────────────────────────────
function sendToWebview(data) {
    panel?.webview.postMessage(data);
}
function sendInitData() {
    sendToWebview({
        type: 'init',
        agents: agentManager.getAllAgents(),
        pipelines: pipelineManager.getAllPipelines(),
        metrics: agentManager.getMetrics(),
        sessions: agentManager.getSessions(),
        models: Object.values(utils_1.MODELS),
    });
}
async function indexProjectContext() {
    try {
        await contextManager.indexProject();
        sendToWebview({ type: 'contextIndexed', summary: contextManager.getContextSummary() });
    }
    catch (err) {
        vscode.window.showErrorMessage('Erro ao indexar projeto: ' + (err instanceof Error ? err.message : String(err)));
    }
}
function getIconPath(context) {
    return vscode.Uri.file(path.join(context.extensionPath, 'media', 'icon.png'));
}
//# sourceMappingURL=extension.js.map