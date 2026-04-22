# AI Agent Studio - OpenRouter Edition

Extensão do VS Code para criação e gerenciamento de agentes de IA usando a API OpenRouter.

## 🎨 Novo Design Moderno

Esta versão inclui um tema visual moderno inspirado em glassmorphism:
- Fundo com gradiente escuro em tons de azul profundo e verde petróleo
- Interface com aparência "glassmorphism" e camadas flutuantes
- Elementos com leve transparência e sombras suaves
- Destaques em verde neon suave (#22c55e) e azul claro (#38bdf8)

## 🚀 Como Gerar o Pacote .VSIX

### Pré-requisitos

1. **Node.js** (versão 16 ou superior)
2. **npm** ou **yarn**
3. **vsce** (Visual Studio Code Extensions)

### Passo a Passo

#### 1. Instalar dependências

```bash
cd ai-agent-studio
npm install
```

#### 2. Instalar o vsce globalmente (se não tiver)

```bash
npm install -g @vscode/vsce
```

#### 3. Compilar o TypeScript

```bash
npm run compile
```

#### 4. Empacotar a extensão

```bash
vsce package
```

Ou, se preferir usar npm script (se configurado no package.json):

```bash
npm run package
```

#### 5. Resultado

O comando acima gerará um arquivo chamado `ai-agent-studio-<versao>.vsix` na raiz do projeto.

## 📦 Instalar a Extensão no VS Code

### Método 1: Via Interface Gráfica

1. Abra o VS Code
2. Vá para a aba de Extensões (Ctrl+Shift+X)
3. Clique nos três pontos `...` no canto superior direito
4. Selecione **"Install from VSIX..."**
5. Navegue até o arquivo `.vsix` gerado e selecione-o

### Método 2: Via Terminal

```bash
code --install-extension ai-agent-studio-<versao>.vsix
```

## 🔑 Configurar API OpenRouter

1. Após instalar a extensão, abra o dashboard (Ctrl+Shift+A)
2. Vá para a página **Configurações**
3. Insira sua API Key do OpenRouter
   - Obtenha em: https://openrouter.ai/keys
4. Selecione o modelo padrão desejado
5. Clique em **Salvar Configurações**

## 🤖 Modelos Suportados

- **OpenAI**: GPT-4o Mini, GPT-4 Turbo
- **Anthropic**: Claude 3 Haiku, Claude 3 Opus
- **Google**: Gemini Pro 1.5
- **Meta**: Llama 3 70B Instruct
- **Mistral**: Mistral Large
- **Alibaba**: Qwen 2 72B Instruct
- **Lite Free**: Modo gratuito (simulado)

## 📁 Estrutura do Projeto

```
ai-agent-studio/
├── src/
│   ├── extension.ts        # Ponto de entrada da extensão
│   ├── AgentManager.ts     # Gerenciamento de agentes e chamadas API
│   ├── PipelineManager.ts  # Gerenciamento de pipelines
│   ├── ContextManager.ts   # Indexação de contexto do projeto
│   ├── types.ts            # Definições de tipo
│   └── utils.ts            # Utilitários e configuração de modelos
├── media/
│   └── dashboard.html      # Interface web do dashboard
├── package.json            # Configuração da extensão
├── tsconfig.json           # Configuração TypeScript
└── README.md               # Este arquivo
```

## 🛠️ Comandos Disponíveis

| Comando | Descrição | Atalho |
|---------|-----------|--------|
| `AI Agent Studio: Abrir Dashboard` | Abre o painel principal | Ctrl+Shift+A |
| `AI Agent Studio: Criar Agente` | Cria um novo agente | - |
| `AI Agent Studio: Usar Contexto do Projeto` | Indexa o projeto atual | - |
| `AI Agent Studio: Executar Pipeline` | Executa um pipeline | - |
| `AI Agent Studio: Ver Métricas` | Visualiza estatísticas de uso | - |

## 🎯 Funcionalidades

- ✅ Criação e gerenciamento de múltiplos agentes
- ✅ Chat interativo com agentes
- ✅ Pipelines de automação
- ✅ Métricas de uso e consumo de tokens
- ✅ Contexto do projeto indexado
- ✅ Múltiplos modelos via OpenRouter
- ✅ Design moderno e responsivo

## 📝 Notas

- A extensão requer uma chave de API válida do OpenRouter para funcionar com modelos reais
- O modo "lite-free" funciona sem API key mas gera respostas simuladas
- Todas as configurações são salvas nas preferências globais do VS Code

## 🔗 Links Úteis

- [OpenRouter](https://openrouter.ai)
- [Documentação VS Code Extensions](https://code.visualstudio.com/api)
- [Marketplace de Extensões](https://marketplace.visualstudio.com/vscode)

## 📄 Licença

MIT
