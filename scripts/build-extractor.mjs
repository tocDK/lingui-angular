#!/usr/bin/env node
/**
 * Compiles the extractor TypeScript sources to dist/lingui-angular/extractor/
 * and renames .js -> .mjs so Node can run them as ESM without requiring
 * "type":"module" in the workspace root package.json (which would break
 * the CJS-style eslint.config.js).
 */
import { execSync } from 'node:child_process';
import { readdirSync, renameSync, readFileSync, writeFileSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const outDir = join(root, 'dist/lingui-angular/extractor');

// 1. Compile with tsc
console.log('[build-extractor] running tsc...');
execSync('npx tsc -p projects/lingui-angular/extractor/tsconfig.build.json', {
  cwd: root,
  stdio: 'inherit',
});

// 2. Rename .js -> .mjs and fix relative import paths inside each file
console.log('[build-extractor] renaming .js -> .mjs...');
const files = readdirSync(outDir);

// First pass: fix import specifiers inside .js files
for (const file of files) {
  if (extname(file) !== '.js' && extname(file) !== '.d.ts') continue;
  const filePath = join(outDir, file);
  let src = readFileSync(filePath, 'utf8');
  // Replace relative imports like './extract-templates' with './extract-templates.mjs'
  src = src.replace(/from '(\.[^']+)'/g, (match, spec) => {
    if (!spec.endsWith('.mjs') && !spec.endsWith('.js')) {
      return `from '${spec}.mjs'`;
    }
    return match;
  });
  // Fix declaration file references too
  src = src.replace(/from "(\.[^"]+)"/g, (match, spec) => {
    if (!spec.endsWith('.mjs') && !spec.endsWith('.js')) {
      return `from "${spec}.mjs"`;
    }
    return match;
  });
  writeFileSync(filePath, src);
}

// Second pass: rename .js -> .mjs (leave .d.ts alone)
for (const file of files) {
  if (extname(file) === '.js') {
    const oldPath = join(outDir, file);
    const newPath = join(outDir, basename(file, '.js') + '.mjs');
    renameSync(oldPath, newPath);
    console.log(`  ${file} -> ${basename(file, '.js')}.mjs`);
  }
}

console.log('[build-extractor] done.');
