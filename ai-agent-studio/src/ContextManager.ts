// ============================================================
// AI Agent Studio — Context Manager
// Reads and indexes project files for AI context
// ============================================================

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectContext, ContextFile } from './types';
import { getLanguageFromPath, IGNORED_DIRS, RELEVANT_EXTENSIONS } from './utils';

const MAX_FILE_SIZE = 100_000; // 100KB per file
const MAX_TOTAL_CHARS = 200_000; // 200K chars total context
const MAX_FILES = 150;

export class ContextManager {
  private currentContext: ProjectContext | null = null;

  async indexProject(): Promise<ProjectContext> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('Nenhum workspace aberto no VS Code.');
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    vscode.window.showInformationMessage(`AI Agent Studio: Indexando projeto em ${rootPath}...`);

    const files: ContextFile[] = [];
    let totalChars = 0;

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Indexando projeto…', cancellable: false },
      async (progress) => {
        progress.report({ increment: 0, message: 'Escaneando arquivos…' });
        await this.walkDirectory(rootPath, rootPath, files);
        progress.report({ increment: 50, message: `${files.length} arquivos encontrados. Lendo conteúdo…` });
        totalChars = files.reduce((sum, f) => sum + f.size, 0);
        progress.report({ increment: 100, message: 'Indexação concluída!' });
      }
    );

    this.currentContext = {
      rootPath,
      files,
      totalChars,
      indexedAt: Date.now(),
    };

    vscode.window.showInformationMessage(
      `✅ Contexto indexado: ${files.length} arquivos, ${Math.round(totalChars / 1000)}K caracteres`
    );

    return this.currentContext;
  }

  private async walkDirectory(dir: string, root: string, files: ContextFile[]): Promise<void> {
    if (files.length >= MAX_FILES) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= MAX_FILES) break;
      if (entry.name.startsWith('.') && entry.name !== '.env') continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        await this.walkDirectory(fullPath, root, files);
      } else if (entry.isFile()) {
        const ext = entry.name.split('.').pop()?.toLowerCase() ?? '';
        if (!RELEVANT_EXTENSIONS.has(ext)) continue;

        try {
          const stat = fs.statSync(fullPath);
          if (stat.size > MAX_FILE_SIZE) continue;

          const content = fs.readFileSync(fullPath, 'utf-8');
          const relativePath = path.relative(root, fullPath);

          files.push({
            path: fullPath,
            relativePath,
            content: content.slice(0, MAX_FILE_SIZE),
            language: getLanguageFromPath(fullPath),
            size: content.length,
          });
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  buildContextString(maxChars: number = MAX_TOTAL_CHARS): string {
    if (!this.currentContext) return '';

    let ctx = `# Contexto do Projeto\nRaiz: ${this.currentContext.rootPath}\nArquivos: ${this.currentContext.files.length}\n\n`;
    let remaining = maxChars - ctx.length;

    for (const file of this.currentContext.files) {
      if (remaining <= 0) break;
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

  getContext(): ProjectContext | null {
    return this.currentContext;
  }

  clearContext(): void {
    this.currentContext = null;
  }

  getContextSummary(): string {
    if (!this.currentContext) return 'Nenhum contexto carregado';
    const age = Math.round((Date.now() - this.currentContext.indexedAt) / 60000);
    return `${this.currentContext.files.length} arquivos · ${Math.round(this.currentContext.totalChars / 1000)}K chars · há ${age}min`;
  }
}
