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

describe('walkTemplate — invalid.html', () => {
  it('warns and emits no shim calls for the bad patterns', () => {
    const source = readFileSync(join(fixturesDir, 'invalid.html'), 'utf8');
    const result = walkTemplate(source, 'invalid.html');
    expect(result.calls).toEqual([]);
    expect(result.warnings.length).toBe(3);
    expect(result.warnings.map((w) => w.reason)).toEqual([
      't pipe needs a string literal message',
      't pipe needs a string literal message',
      '[t] needs a string literal',
    ]);
  });
});

describe('walkTemplate — edge cases', () => {
  it('warns when tPlural rules arg is not a literal object', () => {
    const source = `<p>{{ count | tPlural: someVar }}</p>\n`;
    const result = walkTemplate(source, 'test.html');
    expect(result.calls).toEqual([]);
    expect(result.warnings[0]?.reason).toBe('tPlural needs a literal rules object');
  });

  it('warns when tPlural is missing the "other" rule', () => {
    const source = `<p>{{ count | tPlural: { one: '# item' } }}</p>\n`;
    const result = walkTemplate(source, 'test.html');
    expect(result.calls).toEqual([]);
    expect(result.warnings[0]?.reason).toBe('tPlural requires an "other" rule');
  });

  it('warns when tSelect rules arg is not a literal object', () => {
    const source = `<p>{{ status | tSelect: someVar }}</p>\n`;
    const result = walkTemplate(source, 'test.html');
    expect(result.calls).toEqual([]);
    expect(result.warnings[0]?.reason).toBe('tSelect needs a literal rules object');
  });

  it('warns when $context is a non-literal expression', () => {
    const source = `<p>{{ 'Open' | t: { $context: someVar } }}</p>\n`;
    const result = walkTemplate(source, 'test.html');
    expect(result.calls).toEqual([]);
    expect(result.warnings[0]?.reason).toBe('t pipe options arg has non-literal entries');
  });

  it('handles templates with no translatable content', () => {
    const source = `<div><p>plain text</p></div>\n`;
    const result = walkTemplate(source, 'test.html');
    expect(result.calls).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.emit()).toBe(`import { plural, select, t } from '@lingui/core/macro';\n`);
  });

  it('throws on malformed template with parse errors', () => {
    const source = `<unclosed`;
    expect(() => walkTemplate(source, 'bad.html')).toThrow(/Template parse failed/);
  });
});

describe('walkTemplate — control-flow.html', () => {
  it('recurses into @if / @for / @switch blocks', () => {
    const source = readFileSync(join(fixturesDir, 'control-flow.html'), 'utf8');
    const expected = readFileSync(join(fixturesDir, 'control-flow.expected.ts'), 'utf8');
    const result = walkTemplate(source, 'control-flow.html');
    expect(result.emit()).toBe(expected);
    expect(result.warnings).toEqual([]);
  });
});

describe('walkTemplate — chained pipes', () => {
  it("silently skips {{ 'X' | t | uppercase }} (outermost is not t)", () => {
    const result = walkTemplate(`<p>{{ 'X' | t | uppercase }}</p>`, 'chain1.html');
    expect(result.calls).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('warns on {{ x | uppercase | t }} (outermost t with non-literal exp)', () => {
    const result = walkTemplate(`<p>{{ x | uppercase | t }}</p>`, 'chain2.html');
    expect(result.calls).toEqual([]);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0].reason).toMatch(/string literal/);
  });
});
