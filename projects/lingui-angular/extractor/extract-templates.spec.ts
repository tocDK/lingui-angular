import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { extractTemplates } from './extract-templates';

describe('extractTemplates', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'lingui-extract-'));
    mkdirSync(join(root, 'src/app'), { recursive: true });
    writeFileSync(
      join(root, 'src/app/foo.component.html'),
      `<h1>{{ 'Welcome' | t }}</h1>\n`,
    );
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('writes shim file for each input', () => {
    const result = extractTemplates({
      cwd: root,
      include: ['src/**/*.html'],
      outDir: '.lingui-extracted',
    });
    expect(result.shimsWritten).toBe(1);
    expect(result.warnings).toEqual([]);
    const shimPath = join(root, '.lingui-extracted/src/app/foo.component.html.ts');
    const shim = readFileSync(shimPath, 'utf8');
    expect(shim).toContain(`void t({ message: 'Welcome' });`);
  });
});
