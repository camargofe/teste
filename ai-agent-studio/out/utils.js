"use strict";
// ============================================================
// AI Agent Studio — Utilities
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.RELEVANT_EXTENSIONS = exports.IGNORED_DIRS = exports.MODELS = void 0;
exports.generateId = generateId;
exports.getModelInfo = getModelInfo;
exports.formatNumber = formatNumber;
exports.formatDate = formatDate;
exports.getLanguageFromPath = getLanguageFromPath;
function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
exports.MODELS = {
    'openai/gpt-4o-mini': {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Modelo rápido e econômico da OpenAI',
        maxTokens: 16384,
        costPer1kTokens: 0.00015,
        isFree: false,
        badge: 'RECOMENDADO',
    },
    'openai/gpt-4-turbo': {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Modelo avançado da OpenAI com raciocínio superior',
        maxTokens: 128000,
        costPer1kTokens: 0.01,
        isFree: false,
        badge: 'POWER',
    },
    'anthropic/claude-3-haiku': {
        id: 'anthropic/claude-3-haiku',
        name: 'Claude 3 Haiku',
        description: 'Modelo rápido e eficiente da Anthropic',
        maxTokens: 200000,
        costPer1kTokens: 0.00025,
        isFree: false,
        badge: 'RÁPIDO',
    },
    'anthropic/claude-3-opus': {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        description: 'Modelo mais poderoso da Anthropic',
        maxTokens: 200000,
        costPer1kTokens: 0.015,
        isFree: false,
        badge: 'PREMIUM',
    },
    'google/gemini-pro-1.5': {
        id: 'google/gemini-pro-1.5',
        name: 'Gemini Pro 1.5',
        description: 'Modelo multimodal do Google',
        maxTokens: 1000000,
        costPer1kTokens: 0.0005,
        isFree: false,
        badge: 'GOOGLE',
    },
    'meta-llama/llama-3-70b-instruct': {
        id: 'meta-llama/llama-3-70b-instruct',
        name: 'Llama 3 70B',
        description: 'Modelo open-source de alta performance',
        maxTokens: 8192,
        costPer1kTokens: 0.0008,
        isFree: false,
        badge: 'OPEN',
    },
    'mistral/mistral-large': {
        id: 'mistral/mistral-large',
        name: 'Mistral Large',
        description: 'Modelo avançado da Mistral AI',
        maxTokens: 32768,
        costPer1kTokens: 0.004,
        isFree: false,
        badge: 'EUROPE',
    },
    'qwen/qwen-2-72b-instruct': {
        id: 'qwen/qwen-2-72b-instruct',
        name: 'Qwen 2 72B',
        description: 'Modelo de grande porte da Alibaba',
        maxTokens: 32768,
        costPer1kTokens: 0.0009,
        isFree: false,
        badge: 'CHINA',
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
function getModelInfo(id) {
    return exports.MODELS[id] ?? exports.MODELS['openai/gpt-4o-mini'];
}
function formatNumber(n) {
    if (n >= 1000000)
        return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000)
        return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
}
function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function getLanguageFromPath(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
    const map = {
        ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
        py: 'python', rs: 'rust', go: 'go', java: 'java', cs: 'csharp',
        cpp: 'cpp', c: 'c', rb: 'ruby', php: 'php', swift: 'swift',
        kt: 'kotlin', md: 'markdown', json: 'json', yaml: 'yaml', yml: 'yaml',
        toml: 'toml', html: 'html', css: 'css', scss: 'scss', sql: 'sql',
        sh: 'bash', dockerfile: 'dockerfile', vue: 'vue', svelte: 'svelte',
    };
    return map[ext] ?? 'text';
}
exports.IGNORED_DIRS = new Set([
    'node_modules', '.git', 'dist', 'out', 'build', '.next', '__pycache__',
    '.venv', 'venv', 'env', 'coverage', '.nyc_output', 'vendor', 'target',
    '.cache', '.parcel-cache', '.turbo', 'tmp', 'temp', 'logs', '.DS_Store',
]);
exports.RELEVANT_EXTENSIONS = new Set([
    'ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'java', 'cs', 'rb', 'php',
    'swift', 'kt', 'md', 'json', 'yaml', 'yml', 'toml', 'html', 'css', 'scss',
    'sql', 'sh', 'vue', 'svelte', 'cpp', 'c', 'h', 'dockerfile', 'env',
]);
//# sourceMappingURL=utils.js.map