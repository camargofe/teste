// ============================================================
// AI Agent Studio — VS Code Extension Entry Point
// ============================================================

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AgentManager } from './AgentManager';
import { PipelineManager } from './PipelineManager';
import { ContextManager } from './ContextManager';
import { MODELS } from './utils';

let panel: vscode.WebviewPanel | undefined;
let agentManager: AgentManager;
let pipelineManager: PipelineManager;
let contextManager: ContextManager;

// ─── ACTIVATION ───────────────────────────────────────────
export function activate(context: vscode.ExtensionContext) {
  agentManager = new AgentManager(context);
  pipelineManager = new PipelineManager(context, agentManager);
  contextManager = new ContextManager();

  // Register commands
  const cmds: [string, (...args: unknown[]) => unknown][] = [
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
export function deactivate() {
  panel?.dispose();
}

// ─── OPEN DASHBOARD ───────────────────────────────────────
function openDashboard(context: vscode.ExtensionContext) {
  if (panel) {
    panel.reveal(vscode.ViewColumn.One);
    sendInitData();
    return;
  }

  panel = vscode.window.createWebviewPanel(
    'aiAgentStudio',
    'AI Agent Studio',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(context.extensionPath, 'media')),
        vscode.Uri.file(path.join(context.extensionPath, 'out', 'media')),
      ],
    }
  );

  panel.iconPath = getIconPath(context);
  panel.webview.html = getWebviewContent(context, panel.webview);

  // Handle messages from webview
  panel.webview.onDidReceiveMessage(
    async (msg) => handleWebviewMessage(msg, context),
    undefined,
    context.subscriptions
  );

  panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
}

// ─── WEBVIEW CONTENT ──────────────────────────────────────
function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview): string {
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
async function handleWebviewMessage(msg: WebviewMessage, context: vscode.ExtensionContext) {
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
      } catch (err) {
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
      } catch (err) {
        sendToWebview({ type: 'pipelineError', error: err instanceof Error ? err.message : String(err) });
      }
      break;
    }

    case 'indexContext': {
      try {
        const ctx = await contextManager.indexProject();
        sendToWebview({ type: 'contextIndexed', summary: contextManager.getContextSummary() });
      } catch (err) {
        vscode.window.showErrorMessage('Erro ao indexar projeto: ' + (err instanceof Error ? err.message : String(err)));
      }
      break;
    }

    case 'saveSettings': {
      const cfg = vscode.workspace.getConfiguration('aiAgentStudio');
      if (msg.apiKey) await cfg.update('openRouterApiKey', msg.apiKey, vscode.ConfigurationTarget.Global);
      if (msg.defaultModel) await cfg.update('defaultModel', msg.defaultModel, vscode.ConfigurationTarget.Global);
      if (msg.temperature !== undefined) await cfg.update('temperature', msg.temperature, vscode.ConfigurationTarget.Global);
      if (msg.maxTokens !== undefined) await cfg.update('maxTokens', msg.maxTokens, vscode.ConfigurationTarget.Global);
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
function sendToWebview(data: Record<string, unknown>) {
  panel?.webview.postMessage(data);
}

function sendInitData() {
  sendToWebview({
    type: 'init',
    agents: agentManager.getAllAgents(),
    pipelines: pipelineManager.getAllPipelines(),
    metrics: agentManager.getMetrics(),
    sessions: agentManager.getSessions(),
    models: Object.values(MODELS),
  });
}

async function indexProjectContext() {
  try {
    await contextManager.indexProject();
    sendToWebview({ type: 'contextIndexed', summary: contextManager.getContextSummary() });
  } catch (err) {
    vscode.window.showErrorMessage('Erro ao indexar projeto: ' + (err instanceof Error ? err.message : String(err)));
  }
}

function getIconPath(context: vscode.ExtensionContext): vscode.Uri {
  return vscode.Uri.file(path.join(context.extensionPath, 'media', 'icon.png'));
}

// ─── MESSAGE TYPE ─────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WebviewMessage = { type: string } & Record<string, any>;
