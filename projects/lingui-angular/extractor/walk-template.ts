import {
  AST,
  ASTWithSource,
  Binary,
  BindingPipe,
  Call,
  Conditional,
  Interpolation,
  KeyedRead,
  LiteralArray,
  LiteralMap,
  LiteralPrimitive,
  NonNullAssert,
  parseTemplate,
  PrefixNot,
  PropertyRead,
  SafeCall,
  SafeKeyedRead,
  SafePropertyRead,
  TmplAstBoundAttribute,
  TmplAstBoundText,
  TmplAstDeferredBlock,
  TmplAstElement,
  TmplAstForLoopBlock,
  TmplAstIfBlock,
  TmplAstNode,
  TmplAstSwitchBlock,
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
      } else if (node instanceof TmplAstIfBlock) {
        for (const branch of node.branches) walk(branch.children);
      } else if (node instanceof TmplAstForLoopBlock) {
        walk(node.children);
        if (node.empty) walk(node.empty.children);
      } else if (node instanceof TmplAstSwitchBlock) {
        for (const c of node.cases) walk(c.children);
      } else if (node instanceof TmplAstDeferredBlock) {
        walk(node.children);
        if (node.placeholder) walk(node.placeholder.children);
        if (node.loading) walk(node.loading.children);
        if (node.error) walk(node.error.children);
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
// Policy for chained pipes:
// - {{ 'X' | t | uppercase }}: outermost is `uppercase`, so we never see `t`.
//   This silently emits nothing. Chaining post-processing pipes after `t`
//   is unsupported — use a TS `computed(() => t`X`.toUpperCase())` instead.
// - {{ x | uppercase | t }}: outermost is `t`, but its `.exp` is a BindingPipe,
//   not a LiteralPrimitive, so the literal-message guard fires and we warn.
//   This is the warn path; the message text is generic but the location is precise.
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
  const captured = Object.keys(rules).length;
  if (captured !== rulesArg.keys.length) {
    warnings.push({ file: filePath, reason: `${kind} rule values must all be string literals`, line, column });
    return;
  }
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
  const ast = (attr.value as ASTWithSource).ast;
  const line = attr.sourceSpan.start.line + 1;
  const column = attr.sourceSpan.start.col + 1;

  // `[t]="'Foo'"` — the legacy directive form. Value must be a string literal.
  if (attr.name === 't') {
    if (ast instanceof LiteralPrimitive && typeof ast.value === 'string') {
      calls.push({ kind: 't', message: ast.value, line, column });
    } else {
      warnings.push({ file: filePath, reason: '[t] needs a string literal', line, column });
    }
    return;
  }

  // Bound-attribute pipe form: `[label]="'Foo' | t"`, `[attr.title]="'…' | t"`,
  // `[attr.aria-label]="'…' | t"`, etc. The pipe may not be the outermost AST node
  // (e.g. `'Foo' | t | uppercase` puts t inside an outer `uppercase` pipe), so we
  // recursively walk the expression AST looking for BindingPipe(t|tPlural|tSelect).
  //
  // Trade-off vs. handleBoundText: handleBoundText only inspects the top-level
  // pipe of each interpolation expression and is therefore stricter about chained
  // pipes. Here we deliberately walk recursively so that bound attributes like
  // `[label]="'Foo' | t | uppercase"` are still extracted. Position info is the
  // attribute's own sourceSpan (line/col where the binding starts) — this is
  // less precise than the pipe-exp absolute offset used in handleBoundText, but
  // attribute pipes are typically one-liners so the loss is acceptable.
  const fileContent: string | undefined = (attr.sourceSpan.start as { file?: { content: string } }).file?.content;
  visitForTPipes(ast, attr, filePath, fileContent, calls, warnings);
}

/**
 * Recursively walk an expression AST and emit any t / tPlural / tSelect pipe we find.
 *
 * We stop descending once we've matched a t-family pipe — we don't recurse into its
 * `.exp` or `.args` to avoid double-extracting from nested options/rules maps.
 *
 * Position info for each emitted call: the BindingPipe's own sourceSpan converted
 * to 1-indexed line/col using the attribute's file content, falling back to the
 * attribute's own start line/col when offsets aren't available.
 */
function visitForTPipes(
  ast: AST,
  attr: TmplAstBoundAttribute,
  filePath: string,
  fileContent: string | undefined,
  calls: ExtractedCall[],
  warnings: ExtractionWarning[],
): void {
  if (ast instanceof BindingPipe) {
    if (ast.name === 't' || ast.name === 'tPlural' || ast.name === 'tSelect') {
      const { line, column } = resolvePosition(
        ast.exp.sourceSpan.start as number,
        fileContent,
        { line: attr.sourceSpan.start.line, col: attr.sourceSpan.start.col },
      );
      switch (ast.name) {
        case 't':
          handleTPipe(ast, filePath, line, column, calls, warnings);
          break;
        case 'tPlural':
          handleRulesPipe(ast, 'tPlural', filePath, line, column, calls, warnings);
          break;
        case 'tSelect':
          handleRulesPipe(ast, 'tSelect', filePath, line, column, calls, warnings);
          break;
      }
      // Don't recurse into the matched pipe's exp/args — they're handled by
      // handleTPipe / handleRulesPipe and we don't want to double-extract.
      return;
    }
    // Non-t pipe (e.g. `uppercase`) — recurse into its exp looking for nested t.
    // We don't recurse into ast.args (pipe arguments are typed `any[]`) — t pipes
    // showing up as pipe args is not a real-world pattern.
    visitForTPipes(ast.exp, attr, filePath, fileContent, calls, warnings);
    return;
  }

  // Walk into AST shapes that can contain sub-expressions. The set of shapes we
  // see in bound attribute values is bounded — these cover the common cases.
  if (ast instanceof Interpolation) {
    for (const expr of ast.expressions) visitForTPipes(expr, attr, filePath, fileContent, calls, warnings);
    return;
  }
  if (ast instanceof Conditional) {
    visitForTPipes(ast.condition, attr, filePath, fileContent, calls, warnings);
    visitForTPipes(ast.trueExp, attr, filePath, fileContent, calls, warnings);
    visitForTPipes(ast.falseExp, attr, filePath, fileContent, calls, warnings);
    return;
  }
  if (ast instanceof Binary) {
    visitForTPipes(ast.left, attr, filePath, fileContent, calls, warnings);
    visitForTPipes(ast.right, attr, filePath, fileContent, calls, warnings);
    return;
  }
  if (ast instanceof PrefixNot || ast instanceof NonNullAssert) {
    visitForTPipes(ast.expression, attr, filePath, fileContent, calls, warnings);
    return;
  }
  if (ast instanceof LiteralArray) {
    // LiteralArray.expressions is typed `any[]` in @angular/compiler — narrow per-element.
    for (const expr of ast.expressions as unknown[]) {
      if (expr instanceof AST) visitForTPipes(expr, attr, filePath, fileContent, calls, warnings);
    }
    return;
  }
  if (ast instanceof LiteralMap) {
    // LiteralMap.values is typed `any[]` in @angular/compiler — narrow per-element.
    for (const value of ast.values as unknown[]) {
      if (value instanceof AST) visitForTPipes(value, attr, filePath, fileContent, calls, warnings);
    }
    return;
  }
  if (ast instanceof Call || ast instanceof SafeCall) {
    visitForTPipes(ast.receiver, attr, filePath, fileContent, calls, warnings);
    for (const arg of ast.args) visitForTPipes(arg, attr, filePath, fileContent, calls, warnings);
    return;
  }
  if (
    ast instanceof PropertyRead ||
    ast instanceof SafePropertyRead ||
    ast instanceof KeyedRead ||
    ast instanceof SafeKeyedRead
  ) {
    visitForTPipes(ast.receiver, attr, filePath, fileContent, calls, warnings);
    if ((ast instanceof KeyedRead || ast instanceof SafeKeyedRead) && ast.key) {
      visitForTPipes(ast.key, attr, filePath, fileContent, calls, warnings);
    }
    return;
  }
  // LiteralPrimitive, ImplicitReceiver, ThisReceiver — leaves; nothing to recurse into.
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
  const parts = Object.entries(obj).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `{ ${parts.join(', ')} }`;
}
