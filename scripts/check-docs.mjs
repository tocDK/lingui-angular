#!/usr/bin/env node
/**
 * Drift guard for the kitchen-sink docs site.
 *
 * Reads projects/lingui-angular/src/public-api.ts, extracts every top-level
 * export name, and asserts each name appears at least once (substring match)
 * in any file under projects/kitchen-sink/src/app/content/*.content.ts.
 *
 * Exits 0 if every public export has at least one content-module mention,
 * non-zero otherwise. Wired into CI via the docs-check job.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const publicApiPath = join(root, 'projects/lingui-angular/src/public-api.ts');
const contentDir = join(root, 'projects/kitchen-sink/src/app/content');

if (!existsSync(publicApiPath)) {
  console.error(`[check-docs] FAIL: public-api.ts not found at ${publicApiPath}`);
  process.exit(1);
}

if (!existsSync(contentDir)) {
  console.error(
    `[check-docs] FAIL: content directory missing (projects/kitchen-sink/src/app/content/). Add content modules first.`,
  );
  process.exit(1);
}

const publicApiSource = readFileSync(publicApiPath, 'utf8');

/**
 * Extract export names from `export { ... } from '...'` and
 * `export type { ... } from '...'` lines. `export * from '...'` is
 * silently skipped (too coarse to check).
 *
 * Names like `Foo as Bar` reduce to `Foo`.
 */
function extractExports(src) {
  const names = new Set();
  // Strip line and block comments so we don't pick up commented-out exports.
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  const braceRe = /export\s+(?:type\s+)?\{([^}]+)\}/g;
  let m;
  while ((m = braceRe.exec(stripped)) !== null) {
    const inside = m[1];
    for (const raw of inside.split(',')) {
      let name = raw.trim();
      if (!name) continue;
      // Strip leading `type ` modifier on a single specifier.
      if (name.startsWith('type ')) name = name.slice('type '.length).trim();
      // `Foo as Bar` -> `Foo`
      const asIdx = name.indexOf(' as ');
      if (asIdx > 0) name = name.slice(0, asIdx).trim();
      if (name) names.add(name);
    }
  }

  // Also pick up `export class Foo`, `export function bar`, `export const baz`,
  // `export interface Quux`, `export type Q = ...` — defensive even though
  // public-api.ts is currently barrel-style.
  const declRe =
    /export\s+(?:declare\s+)?(?:abstract\s+)?(?:class|function|const|let|var|interface|type|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m = declRe.exec(stripped)) !== null) {
    names.add(m[1]);
  }

  return [...names];
}

const exportNames = extractExports(publicApiSource);

if (exportNames.length === 0) {
  console.error('[check-docs] FAIL: no exports found in public-api.ts');
  process.exit(1);
}

const contentFiles = readdirSync(contentDir).filter((f) => f.endsWith('.content.ts'));

if (contentFiles.length === 0) {
  console.error(
    `[check-docs] FAIL: no *.content.ts files in ${contentDir}. Add content modules first.`,
  );
  process.exit(1);
}

const contentBlobs = contentFiles.map((f) => ({
  file: f,
  source: readFileSync(join(contentDir, f), 'utf8'),
}));

let failures = 0;
let passes = 0;

for (const name of exportNames) {
  const hit = contentBlobs.some(({ source }) => source.includes(name));
  if (hit) {
    console.log(`  PASS  ${name}`);
    passes++;
  } else {
    console.log(`  FAIL  ${name} — not mentioned in any content/*.content.ts`);
    failures++;
  }
}

console.log('');
console.log(
  `[check-docs] ${passes} passed, ${failures} failed (${exportNames.length} exports checked across ${contentFiles.length} content file${contentFiles.length === 1 ? '' : 's'})`,
);

process.exit(failures === 0 ? 0 : 1);
