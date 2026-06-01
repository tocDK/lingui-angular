#!/usr/bin/env node
import chokidar from 'chokidar';
import { join } from 'node:path';
import { cleanExtracted, extractTemplates } from './extract-templates';

const cwd = process.cwd();
const cmd = process.argv[2] ?? 'extract';

function loadConfig(): { include: string[]; outDir: string } {
  // Minimal: sensible defaults covering both standalone apps and Angular workspaces.
  return { include: ['src/**/*.html', 'projects/**/src/**/*.html'], outDir: '.lingui-extracted' };
}

async function main(): Promise<void> {
  const cfg = loadConfig();

  if (cmd === 'clean') {
    cleanExtracted(cwd, cfg.outDir);
    console.log(`[lingui-angular] cleaned ${join(cwd, cfg.outDir)}`);
    return;
  }

  const watch = process.argv.includes('--watch');

  const run = (): void => {
    const result = extractTemplates({ cwd, include: cfg.include, outDir: cfg.outDir });
    for (const w of result.warnings) {
      console.warn(`[lingui-angular] ${w.file}:${w.line}:${w.column} — ${w.reason}`);
    }
    console.log(`[lingui-angular] wrote ${result.shimsWritten} shim(s)`);
  };

  run();

  if (watch) {
    const watcher = chokidar.watch(cfg.include, { cwd, ignoreInitial: true });
    watcher.on('all', run);
    console.log('[lingui-angular] watching for template changes…');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
