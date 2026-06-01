import {
  ASTWithSource,
  BindingPipe,
  Interpolation,
  LiteralMap,
  LiteralPrimitive,
  parseTemplate,
  TmplAstBoundAttribute,
  TmplAstBoundText,
  TmplAstElement,
  TmplAstNode,
  TmplAstTemplate,
} from '@angular/compiler';

export interface ExtractedCall {
  kind: 't' | 'tPlural' | 'tSelect';
  message?: string;
  context?: string;
  id?: string;
  plural?: Record<string, string>;
  select?: Record<string, string>;
  comment?: string;
  line: number;
  column: number;
}

export interface ExtractionWarning {
  reason: string;
  line: number;
  column: number;
  file: string;
}

export interface WalkResult {
  calls: ExtractedCall[];
  warnings: ExtractionWarning[];
  emit(): string;
}

export function walkTemplate(source: string, filePath: string): WalkResult {
  const parsed = parseTemplate(source, filePath, { preserveWhitespaces: false });
  if (parsed.errors && parsed.errors.length) {
    throw new Error(`Template parse failed for ${filePath}: ${parsed.errors[0]?.toString()}`);
  }
  const calls: ExtractedCall[] = [];
  const warnings: ExtractionWarning[] = [];

  const walk = (nodes: readonly TmplAstNode[]): void => {
    for (const node of nodes) {
      if (node instanceof TmplAstElement || node instanceof TmplAstTemplate) {
        for (const attr of node.inputs) {
          handleBoundAttr(attr, filePath, calls, warnings);
        }
        walk(node.children);
      } else if (node instanceof TmplAstBoundText) {
        handleBoundText(node, filePath, calls, warnings);
      }
    }
  };
  walk(parsed.nodes);

  return {
    calls,
    warnings,
    emit: () => renderShim(calls, filePath),
  };
}

/**
 * Handle `{{ expr | t }}` / `{{ expr | tPlural: ... }}` / `{{ expr | tSelect: ... }}`.
 *
 * Angular parses `{{ ... }}` as TmplAstBoundText whose value is an ASTWithSource
 * wrapping an Interpolation. The Interpolation.expressions array contains the
 * expressions between `{{` and `}}`, which may be BindingPipe nodes.
 *
 * In Angular 20, BindingPipe.sourceSpan is a plain {start, end} char-offset pair —
 * not a ParseSourcePosition with .line/.col. We resolve line/col by converting the
 * pipe expression's absolute offset using the source file content stored on
 * TmplAstBoundText.sourceSpan.start.file.
 */
function handleBoundText(
  node: TmplAstBoundText,
  filePath: string,
  calls: ExtractedCall[],
  warnings: ExtractionWarning[],
): void {
  const ast = (node.value as ASTWithSource).ast;
  if (!(ast instanceof Interpolation)) return;

  // ParseLocation carries the full file content so we can convert offsets to line/col.
  const fileContent: string | undefined = (node.sourceSpan.start as { file?: { content: string } }).file?.content;

  for (const expr of ast.expressions) {
    if (!(expr instanceof BindingPipe)) continue;
    if (expr.name !== 't' && expr.name !== 'tPlural' && expr.name !== 'tSelect') continue;

    // Use the absolute offset of the pipe expression (the string literal / count /
    // value being piped) as the reported position, falling back to the {{ position.
    const { line, column } = resolvePosition(expr.exp.sourceSpan.start as number, fileContent, node.sourceSpan.start);

    switch (expr.name) {
      case 't':
        handleTPipe(expr, filePath, line, column, calls, warnings);
        break;
      case 'tPlural':
        handleRulesPipe(expr, 'tPlural', filePath, line, column, calls, warnings);
        break;
      case 'tSelect':
        handleRulesPipe(expr, 'tSelect', filePath, line, column, calls, warnings);
        break;
    }
  }
}

/**
 * Convert an absolute character offset to 1-indexed line/col using the template
 * source. Falls back to the TmplAstBoundText ParseLocation when file content is
 * unavailable.
 */
function resolvePosition(
  absOffset: unknown,
  fileContent: string | undefined,
  fallback: { line: number; col: number },
): { line: number; column: number } {
  if (typeof absOffset === 'number' && fileContent !== undefined) {
    const before = fileContent.substring(0, absOffset);
    const lines = before.split('\n');
    return { line: lines.length, column: lines[lines.length - 1].length + 1 };
  }
  return { line: fallback.line + 1, column: fallback.col + 1 };
}

function handleTPipe(
  pipe: BindingPipe,
  filePath: string,
  line: number,
  column: number,
  calls: ExtractedCall[],
  warnings: ExtractionWarning[],
): void {
  const messageArg = pipe.exp;
  if (!(messageArg instanceof LiteralPrimitive) || typeof messageArg.value !== 'string') {
    warnings.push({ file: filePath, reason: 't pipe needs a string literal message', line, column });
    return;
  }
  const optionsArg = pipe.args[0];
  const { context, id, hasUnsupportedValues } = parseOptionsArg(optionsArg);
  if (hasUnsupportedValues) {
    warnings.push({ file: filePath, reason: 't pipe options arg has non-literal entries', line, column });
    return;
  }
  calls.push({ kind: 't', message: messageArg.value, context, id, line, column });
}

function handleRulesPipe(
  pipe: BindingPipe,
  kind: 'tPlural' | 'tSelect',
  filePath: string,
  line: number,
  column: number,
  calls: ExtractedCall[],
  warnings: ExtractionWarning[],
): void {
  const rulesArg = pipe.args[0];
  if (!(rulesArg instanceof LiteralMap)) {
    warnings.push({ file: filePath, reason: `${kind} needs a literal rules object`, line, column });
    return;
  }
  const rules: Record<string, string> = {};
  rulesArg.keys.forEach((keyNode, idx) => {
    const val = rulesArg.values[idx];
    if (val instanceof LiteralPrimitive && typeof val.value === 'string') {
      rules[keyNode.key] = val.value;
    }
  });
  if (!rules['other']) {
    warnings.push({ file: filePath, reason: `${kind} requires an "other" rule`, line, column });
    return;
  }
  const call: ExtractedCall = { kind, line, column };
  if (kind === 'tPlural') call.plural = rules;
  else call.select = rules;
  calls.push(call);
}

function handleBoundAttr(
  attr: TmplAstBoundAttribute,
  filePath: string,
  calls: ExtractedCall[],
  warnings: ExtractionWarning[],
): void {
  if (attr.name !== 't') return;
  const ast = (attr.value as ASTWithSource).ast;
  const line = attr.sourceSpan.start.line + 1;
  const column = attr.sourceSpan.start.col + 1;
  if (ast instanceof LiteralPrimitive && typeof ast.value === 'string') {
    calls.push({ kind: 't', message: ast.value, line, column });
  } else {
    warnings.push({ file: filePath, reason: '[t] needs a string literal', line, column });
  }
}

function parseOptionsArg(arg: unknown): {
  context?: string;
  id?: string;
  hasUnsupportedValues: boolean;
} {
  if (!(arg instanceof LiteralMap)) {
    return { context: undefined, id: undefined, hasUnsupportedValues: false };
  }
  let context: string | undefined;
  let id: string | undefined;
  let hasUnsupportedValues = false;
  arg.keys.forEach((keyNode, idx) => {
    const key = keyNode.key;
    const val = arg.values[idx];
    if (key === '$context' || key === '$id') {
      if (val instanceof LiteralPrimitive && typeof val.value === 'string') {
        if (key === '$context') context = val.value;
        else id = val.value;
      } else {
        hasUnsupportedValues = true;
      }
    }
    // Other keys are placeholder names — we carry them in the message string only.
  });
  return { context, id, hasUnsupportedValues };
}

function renderShim(calls: ExtractedCall[], filePath: string): string {
  const lines: string[] = [`import { plural, select, t } from '@lingui/core/macro';`];
  for (const call of calls) {
    lines.push(`// @source: ${filePath}:${call.line}:${call.column}`);
    if (call.comment) lines.push(`// ${call.comment}`);
    switch (call.kind) {
      case 't': {
        const desc: Record<string, unknown> = { message: call.message! };
        if (call.context) desc['context'] = call.context;
        if (call.id) desc['id'] = call.id;
        lines.push(`void t(${stringify(desc)});`);
        break;
      }
      case 'tPlural':
        lines.push(`void plural(0, ${stringify(call.plural!)});`);
        break;
      case 'tSelect':
        lines.push(`void select('', ${stringify(call.select!)});`);
        break;
    }
  }
  return lines.join('\n') + '\n';
}

function stringify(obj: Record<string, unknown>): string {
  // Deterministic single-quoted output to keep snapshot diffs minimal.
  const parts = Object.entries(obj).map(
    ([k, v]) => `${k}: ${JSON.stringify(v).replace(/"/g, "'")}`,
  );
  return `{ ${parts.join(', ')} }`;
}
