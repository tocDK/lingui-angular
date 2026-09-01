import { mkdirSync, readFileSync, rmSync, writeFileSync, globSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { walkTemplate } from './walk-template.mjs';
export function extractTemplates(opts) {
    const warnings = [];
    let count = 0;
    for (const pattern of opts.include) {
        const matches = globSync(pattern, { cwd: opts.cwd });
        for (const match of matches) {
            const abs = join(opts.cwd, match);
            const source = readFileSync(abs, 'utf8');
            const result = walkTemplate(source, match);
            warnings.push(...result.warnings);
            const shim = result.emit();
            const target = join(opts.cwd, opts.outDir, `${match}.ts`);
            mkdirSync(dirname(target), { recursive: true });
            writeFileSync(target, shim, 'utf8');
            count++;
        }
    }
    return { shimsWritten: count, warnings };
}
export function cleanExtracted(cwd, outDir) {
    const target = resolve(cwd, outDir);
    if (!target.startsWith(resolve(cwd) + '/')) {
        throw new Error(`cleanExtracted: outDir resolves outside cwd: ${outDir}`);
    }
    rmSync(target, { recursive: true, force: true });
}
