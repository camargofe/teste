// ============================================================
// AI Agent Studio — Agent Manager
// Handles CRUD for agents and AI call routing
// ============================================================

import * as vscode from 'vscode';
import { Agent, AgentSession, ChatMessage, MetricEntry, Metrics, ModelId } from './types';
import { generateId, getModelInfo, MODELS } from './utils';

export class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private sessions: Map<string, AgentSession> = new Map();
  private metrics: Metrics;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.metrics = this.loadMetrics();
    this.loadAgents();
    this.loadSessions();
  }

  // ─── CRUD ────────────────────────────────────────────────

  createAgent(data: Partial<Agent>): Agent {
    const agent: Agent = {
      id: generateId(),
      name: data.name ?? 'Novo Agente',
      role: data.role ?? 'Assistente geral',
      model: data.model ?? 'openai/gpt-4o-mini',
      systemPrompt: data.systemPrompt ?? 'Você é um assistente inteligente e prestativo.',
      temperature: data.temperature ?? 0.7,
      maxTokens: data.maxTokens ?? 2048,
      tags: data.tags ?? [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: data.color ?? this.randomColor(),
      icon: data.icon ?? '🤖',
      isActive: true,
      stats: { totalRequests: 0, totalTokens: 0, totalChars: 0 },
    };
    this.agents.set(agent.id, agent);
    this.saveAgents();
    return agent;
  }

  updateAgent(id: string, data: Partial<Agent>): Agent | null {
    const agent = this.agents.get(id);
    if (!agent) return null;
    const updated = { ...agent, ...data, id, updatedAt: Date.now() };
    this.agents.set(id, updated);
    this.saveAgents();
    return updated;
  }

  deleteAgent(id: string): boolean {
    const deleted = this.agents.delete(id);
    if (deleted) this.saveAgents();
    return deleted;
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // ─── AI Calls ────────────────────────────────────────────

  async callAgent(
    agentId: string,
    userMessage: string,
    sessionId?: string,
    projectContext?: string
  ): Promise<{ response: string; tokens: number; sessionId: string }> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agente não encontrado: ${agentId}`);

    // Resolve or create session
    let session = sessionId ? this.sessions.get(sessionId) : undefined;
    if (!session) {
      session = this.createSession(agentId, userMessage);
    }

    // Build messages array
    const systemContent = projectContext
      ? `${agent.systemPrompt}\n\n## Contexto do Projeto:\n${projectContext}`
      : agent.systemPrompt;

    const messages = [
      ...session.messages.slice(-20), // keep last 20 messages for context
      { role: 'user' as const, content: userMessage, timestamp: Date.now() },
    ];

    // Call AI API
    const apiKey = vscode.workspace.getConfiguration('aiAgentStudio').get<string>('openRouterApiKey', '');
    let response: string;
    let tokens = 0;

    if (!apiKey || agent.model === 'lite-free') {
      // Simulate response for demo / free tier
      ({ response, tokens } = await this.simulateResponse(agent, userMessage, systemContent));
    } else {
      ({ response, tokens } = await this.callOpenRouterAPI(agent, messages, systemContent, apiKey));
    }

    // Update session
    const userMsg: ChatMessage = { role: 'user', content: userMessage, timestamp: Date.now(), agentId };
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
      agentId,
      tokens,
    };
    session.messages.push(userMsg, assistantMsg);
    this.sessions.set(session.id, session);
    this.saveSessions();

    // Update stats
    agent.stats.totalRequests++;
    agent.stats.totalTokens += tokens;
    agent.stats.totalChars += response.length;
    agent.stats.lastUsed = Date.now();
    this.agents.set(agentId, agent);
    this.saveAgents();

    // Update global metrics
    this.recordMetric({ timestamp: Date.now(), tokens, requests: 1, model: agent.model, agentId });

    return { response, tokens, sessionId: session.id };
  }

  // ─── Sessions ────────────────────────────────────────────

  createSession(agentId: string, firstMessage: string): AgentSession {
    const session: AgentSession = {
      id: generateId(),
      agentId,
      messages: [],
      createdAt: Date.now(),
      title: firstMessage.slice(0, 60) + (firstMessage.length > 60 ? '…' : ''),
    };
    this.sessions.set(session.id, session);
    this.saveSessions();
    return session;
  }

  getSession(id: string): AgentSession | undefined {
    return this.sessions.get(id);
  }

  getSessions(agentId?: string): AgentSession[] {
    const all = Array.from(this.sessions.values());
    return agentId ? all.filter(s => s.agentId === agentId) : all;
  }

  deleteSession(id: string): void {
    this.sessions.delete(id);
    this.saveSessions();
  }

  // ─── Metrics ─────────────────────────────────────────────

  getMetrics(): Metrics {
    return this.metrics;
  }

  resetDailyMetrics(): void {
    this.metrics.dailyTokens = 0;
    this.metrics.dailyRequests = 0;
    this.saveMetrics();
  }

  private recordMetric(entry: MetricEntry): void {
    this.metrics.totalTokensUsed += entry.tokens;
    this.metrics.totalRequests += entry.requests;
    this.metrics.dailyTokens += entry.tokens;
    this.metrics.dailyRequests += entry.requests;
    this.metrics.history.push(entry);
    // Keep last 500 entries
    if (this.metrics.history.length > 500) {
      this.metrics.history = this.metrics.history.slice(-500);
    }
    if (entry.model === 'lite-free') {
      this.metrics.freeRequestsUsed++;
    }
    this.saveMetrics();
  }

  // ─── API Call ────────────────────────────────────────────

  private async callOpenRouterAPI(
    agent: Agent,
    messages: ChatMessage[],
    systemContent: string,
    apiKey: string
  ): Promise<{ response: string; tokens: number }> {
    const modelInfo = getModelInfo(agent.model);

    const body = {
      model: agent.model,
      messages: [
        { role: 'system', content: systemContent },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      temperature: agent.temperature,
      max_tokens: Math.min(agent.maxTokens, modelInfo.maxTokens),
    };

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/ai-agent-studio',
        'X-Title': 'AI Agent Studio VS Code',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter API error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage: { total_tokens: number };
    };

    return {
      response: data.choices[0].message.content,
      tokens: data.usage.total_tokens,
    };
  }

  private async simulateResponse(
    agent: Agent,
    userMessage: string,
    systemContent: string
  ): Promise<{ response: string; tokens: number }> {
    // Realistic demo simulation
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));

    const lower = userMessage.toLowerCase();
    let response = '';

    if (lower.includes('email') || lower.includes('e-mail')) {
      response = `**Assunto:** Re: ${userMessage.slice(0, 40)}

Prezado(a),

Espero que este e-mail o(a) encontre bem. Em resposta à sua solicitação, gostaria de informar que estamos trabalhando para atender suas necessidades da melhor forma possível.

Permanecemos à disposição para quaisquer esclarecimentos.

Atenciosamente,
${agent.name}`;
    } else if (lower.includes('lista') || lower.includes('list')) {
      response = `Aqui está a lista solicitada:\n\n1. Primeiro item importante\n2. Segundo item com detalhes relevantes\n3. Terceiro ponto a considerar\n4. Quarto item complementar\n5. Conclusão e próximos passos`;
    } else if (lower.includes('código') || lower.includes('code') || lower.includes('função') || lower.includes('function')) {
      response = `Aqui está o código solicitado:\n\n\`\`\`typescript\n// Implementação para: ${userMessage.slice(0, 50)}\nexport function solution(input: string): string {\n  // Processar o input\n  const processed = input.trim().toLowerCase();\n  \n  // Lógica principal\n  return \`Resultado: \${processed}\`;\n}\n\`\`\`\n\nEsta implementação considera os principais casos de uso. Deseja que eu adicione testes unitários?`;
    } else {
      response = `Olá! Sou o agente **${agent.name}** e estou aqui para ajudar.\n\nSua pergunta: *"${userMessage}"*\n\nCom base no meu papel (${agent.role}), posso oferecer a seguinte análise:\n\nEste é um tópico relevante que merece atenção cuidadosa. Os principais pontos a considerar são:\n\n- **Contexto**: É importante entender o contexto completo antes de tomar decisões.\n- **Análise**: Uma avaliação criteriosa dos dados disponíveis sugere abordagens múltiplas.\n- **Recomendação**: Baseado nas melhores práticas, sugiro iniciar com uma solução incremental.\n\nPosso elaborar mais sobre qualquer um desses pontos. O que gostaria de explorar?`;
    }

    const tokens = Math.floor(response.length / 4) + Math.floor(userMessage.length / 4);
    return { response, tokens };
  }

  // ─── Persistence ─────────────────────────────────────────

  private saveAgents(): void {
    this.context.globalState.update('agents', Array.from(this.agents.values()));
  }

  private loadAgents(): void {
    const stored = this.context.globalState.get<Agent[]>('agents', []);
    stored.forEach(a => this.agents.set(a.id, a));
    // Create default agents if none exist
    if (this.agents.size === 0) {
      this.createDefaultAgents();
    }
  }

  private saveSessions(): void {
    const recent = Array.from(this.sessions.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);
    this.context.globalState.update('sessions', recent);
  }

  private loadSessions(): void {
    const stored = this.context.globalState.get<AgentSession[]>('sessions', []);
    stored.forEach(s => this.sessions.set(s.id, s));
  }

  private saveMetrics(): void {
    this.context.globalState.update('metrics', this.metrics);
  }

  private loadMetrics(): Metrics {
    return this.context.globalState.get<Metrics>('metrics', {
      totalTokensUsed: 0,
      totalRequests: 0,
      totalCharsProcessed: 0,
      freeRequestsUsed: 0,
      freeRequestsLimit: 1000,
      dailyTokens: 0,
      dailyRequests: 0,
      history: [],
    });
  }

  private createDefaultAgents(): void {
    this.createAgent({
      name: 'Dev Assistant',
      role: 'Especialista em código e arquitetura de software',
      model: 'openai/gpt-4o-mini',
      systemPrompt: 'Você é um engenheiro de software sênior especialista em TypeScript, Python e arquitetura de sistemas. Forneça código limpo, bem comentado e seguindo boas práticas.',
      temperature: 0.3,
      maxTokens: 4096,
      tags: ['código', 'dev', 'typescript'],
      color: '#3b82f6',
      icon: '⚡',
    });
    this.createAgent({
      name: 'Doc Writer',
      role: 'Redator técnico e criador de documentação',
      model: 'anthropic/claude-3-haiku',
      systemPrompt: 'Você é um redator técnico especializado em criar documentação clara, estruturada e de fácil compreensão. Use markdown com formatação elegante.',
      temperature: 0.7,
      maxTokens: 2048,
      tags: ['docs', 'escrita', 'markdown'],
      color: '#8b5cf6',
      icon: '📝',
    });
    this.createAgent({
      name: 'Quick Assistant',
      role: 'Assistente leve para tarefas rápidas',
      model: 'lite-free',
      systemPrompt: 'Você é um assistente ágil e conciso. Responda de forma direta e útil para tarefas do dia a dia: emails, listas, anotações.',
      temperature: 0.8,
      maxTokens: 512,
      tags: ['rápido', 'gratuito', 'emails'],
      color: '#10b981',
      icon: '🚀',
    });
  }

  private randomColor(): string {
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}


