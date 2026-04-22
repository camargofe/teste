# AI Agent Studio

**Estúdio de Agentes de IA para VS Code** — Interface profissional dark com suporte a pipelines inteligentes, múltiplos modelos Qwen e contexto de projeto.

## ✨ Funcionalidades

### 🤖 Agentes de IA
- Criar, editar e remover agentes personalizados
- Configurar nome, papel, prompt do sistema, temperatura e tokens
- Múltiplos modelos: Qwen Max, Plus, Turbo, Lite, Coder Plus, Grátis
- Cores e ícones customizáveis por agente

### ⛓ Pipelines
- Interface visual node-flow para criar pipelines
- Conectar agentes em sequência
- Execução com passagem de output entre nós
- Suporte a execução contínua

### 💬 Chat
- Interface de chat completa com cada agente
- Formatação markdown nas respostas
- Histórico de sessões
- Suporte a contexto do projeto

### 📁 Contexto do Projeto
- Indexa automaticamente os arquivos do workspace
- Injeta contexto relevante nas chamadas dos agentes
- Suporte a +20 linguagens de programação

### 📊 Métricas
- Tokens utilizados (total e diário)
- Número de requisições
- Uso por agente com gráficos
- Controle de limite gratuito (1000 req/dia)

## 🚀 Como Usar

1. Abra o VS Code
2. `Ctrl+Shift+A` ou `Ctrl+Shift+P` → "AI Agent Studio: Abrir Dashboard"
3. Configure sua API Key em Configurações
4. Crie seu primeiro agente e comece a conversar!

## 🔑 Configuração da API

1. Acesse [dashscope.aliyuncs.com](https://dashscope.aliyuncs.com)
2. Crie uma conta gratuita (1000 requisições grátis)
3. Gere sua API Key
4. Cole em **AI Agent Studio → Configurações → Chave da API**

Sem API Key, a extensão usa o **Agente Leve (Grátis)** com respostas simuladas.

## ⌨️ Atalhos

| Atalho | Ação |
|--------|------|
| `Ctrl+Shift+A` | Abrir Dashboard |

## 🏗️ Compilar do Fonte

```bash
npm install
npx tsc -p ./
node scripts/copy-media.js
npx @vscode/vsce package --no-dependencies
```

## 📦 Modelos Disponíveis

| Modelo | Descrição | Tokens |
|--------|-----------|--------|
| Qwen Max | Máximo poder de raciocínio | 8K |
| Qwen Plus ⭐ | Melhor custo-benefício | 32K |
| Qwen Turbo | Rápido e econômico | 8K |
| Qwen Lite | Levíssimo | 4K |
| Qwen Coder+ | Especializado em código | 32K |
| Grátis | Simulado, sem custo | 512 |

## 📄 Licença

MIT © AI Agent Studio
