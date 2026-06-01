import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { walkTemplate } from './walk-template';

const fixturesDir = join(__dirname, 'fixtures');

describe('walkTemplate — basic.html', () => {
  it('produces shims matching basic.expected.ts', () => {
    const source = readFileSync(join(fixturesDir, 'basic.html'), 'utf8');
    const expected = readFileSync(join(fixturesDir, 'basic.expected.ts'), 'utf8');
    const result = walkTemplate(source, 'basic.html');
    expect(result.emit()).toBe(expected);
    expect(result.warnings).toEqual([]);
  });
});

describe('walkTemplate — params.html', () => {
  it('extracts $context / $id; ignores placeholder values', () => {
    const source = readFileSync(join(fixturesDir, 'params.html'), 'utf8');
    const expected = readFileSync(join(fixturesDir, 'params.expected.ts'), 'utf8');
    const result = walkTemplate(source, 'params.html');
    expect(result.emit()).toBe(expected);
    expect(result.warnings).toEqual([]);
  });
});

describe('walkTemplate — plural.html', () => {
  it('extracts | tPlural rules', () => {
    const source = readFileSync(join(fixturesDir, 'plural.html'), 'utf8');
    const expected = readFileSync(join(fixturesDir, 'plural.expected.ts'), 'utf8');
    expect(walkTemplate(source, 'plural.html').emit()).toBe(expected);
  });
});

describe('walkTemplate — select.html', () => {
  it('extracts | tSelect rules', () => {
    const source = readFileSync(join(fixturesDir, 'select.html'), 'utf8');
    const expected = readFileSync(join(fixturesDir, 'select.expected.ts'), 'utf8');
    expect(walkTemplate(source, 'select.html').emit()).toBe(expected);
  });
});
