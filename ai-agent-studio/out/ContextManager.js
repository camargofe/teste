"use strict";
// ============================================================
// AI Agent Studio — Context Manager
// Reads and indexes project files for AI context
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
exports.ContextManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("./utils");
const MAX_FILE_SIZE = 100000; // 100KB per file
const MAX_TOTAL_CHARS = 200000; // 200K chars total context
const MAX_FILES = 150;
class ContextManager {
    constructor() {
        this.currentContext = null;
    }
    async indexProject() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('Nenhum workspace aberto no VS Code.');
        }
        const rootPath = workspaceFolders[0].uri.fsPath;
        vscode.window.showInformationMessage(`AI Agent Studio: Indexando projeto em ${rootPath}...`);
        const files = [];
        let totalChars = 0;
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Indexando projeto…', cancellable: false }, async (progress) => {
            progress.report({ increment: 0, message: 'Escaneando arquivos…' });
            await this.walkDirectory(rootPath, rootPath, files);
            progress.report({ increment: 50, message: `${files.length} arquivos encontrados. Lendo conteúdo…` });
            totalChars = files.reduce((sum, f) => sum + f.size, 0);
            progress.report({ increment: 100, message: 'Indexação concluída!' });
        });
        this.currentContext = {
            rootPath,
            files,
            totalChars,
            indexedAt: Date.now(),
        };
        vscode.window.showInformationMessage(`✅ Contexto indexado: ${files.length} arquivos, ${Math.round(totalChars / 1000)}K caracteres`);
        return this.currentContext;
    }
    async walkDirectory(dir, root, files) {
        if (files.length >= MAX_FILES)
            return;
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (files.length >= MAX_FILES)
                break;
            if (entry.name.startsWith('.') && entry.name !== '.env')
                continue;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (utils_1.IGNORED_DIRS.has(entry.name))
                    continue;
                await this.walkDirectory(fullPath, root, files);
            }
            else if (entry.isFile()) {
                const ext = entry.name.split('.').pop()?.toLowerCase() ?? '';
                if (!utils_1.RELEVANT_EXTENSIONS.has(ext))
                    continue;
                try {
                    const stat = fs.statSync(fullPath);
                    if (stat.size > MAX_FILE_SIZE)
                        continue;
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    const relativePath = path.relative(root, fullPath);
                    files.push({
                        path: fullPath,
                        relativePath,
                        content: content.slice(0, MAX_FILE_SIZE),
                        language: (0, utils_1.getLanguageFromPath)(fullPath),
                        size: content.length,
                    });
                }
                catch {
                    // skip unreadable files
                }
            }
        }
    }
    buildContextString(maxChars = MAX_TOTAL_CHARS) {
        if (!this.currentContext)
            return '';
        let ctx = `# Contexto do Projeto\nRaiz: ${this.currentContext.rootPath}\nArquivos: ${this.currentContext.files.length}\n\n`;
        let remaining = maxChars - ctx.length;
        for (const file of this.currentContext.files) {
            if (remaining <= 0)
                break;
            const snippet = `## ${file.relativePath}\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n\n`;
            if (snippet.length > remaining) {
                // Include partial
                ctx += snippet.slice(0, remaining) + '\n[... truncado]\n';
                break;
            }
            ctx += snippet;
            remaining -= snippet.length;
        }
        return ctx;
    }
    getContext() {
        return this.currentContext;
    }
    clearContext() {
        this.currentContext = null;
    }
    getContextSummary() {
        if (!this.currentContext)
            return 'Nenhum contexto carregado';
        const age = Math.round((Date.now() - this.currentContext.indexedAt) / 60000);
        return `${this.currentContext.files.length} arquivos · ${Math.round(this.currentContext.totalChars / 1000)}K chars · há ${age}min`;
    }
}
exports.ContextManager = ContextManager;
//# sourceMappingURL=ContextManager.js.map