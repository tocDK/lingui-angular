import { I18n, MessageDescriptor } from '@lingui/core';
import { generateMessageId } from '@lingui/message-utils/generateMessageId';

/**
 * Look up a bare-string source message against the active catalog.
 *
 * Lingui CLI's `compile --typescript` hashes bare-string msgids via
 * `generateMessageId(message, context)` (6-char base64). Parameterized
 * msgids (with `{name}` etc.) are kept source-keyed.
 *
 * Strategy:
 * 1. Compute the hash and try `messages[hash]` — matches real `lingui compile`
 *    output.
 * 2. Back-compat: if the catalog is hand-forged with source-text keys
 *    (legacy specs, ad-hoc consumer catalogs), fall back to `messages[source]`.
 * 3. Otherwise let Lingui's `_()` produce the source-text fallback via
 *    `{ message: source }`.
 *
 * @param i18n Active `I18n` instance.
 * @param message Bare-string source text (English source).
 * @param values Optional ICU placeholder values.
 * @param context Optional `$context` extraction hint — included in the hash
 *   so the runtime id matches what `lingui compile` produced.
 */
export function lookupBareString(
  i18n: I18n,
  message: string,
  values?: Record<string, unknown>,
  context?: string,
): string {
  // `generateMessageId`'s shipped type signature is `any`; coerce to string.
  const hash: string = generateMessageId(message, context ?? '') as string;
  // Stage 1: hashed catalog (real `lingui compile --typescript` output).
  if (hash in i18n.messages) {
    return i18n._(hash, values, { message });
  }
  // Stage 2: back-compat — hand-forged source-keyed catalog.
  if (message in i18n.messages) {
    return i18n._(message, values, { message });
  }
  // Stage 3: nothing matches — let Lingui fall back to `message`.
  return i18n._(hash, values, { message });
}

/**
 * Resolve a `MessageDescriptor` or bare-string `descriptor` against the
 * active catalog, applying the same two-stage lookup as `lookupBareString`.
 *
 * - String descriptor: treated as a bare source message; hashed for lookup.
 * - `MessageDescriptor` with explicit `id`: passed through unchanged
 *   (the consumer has already opted into an explicit id — typically already
 *   hashed by the Lingui macro at extract time).
 * - `MessageDescriptor` without `id` (only `message`): hashed from
 *   `descriptor.message`. `MessageDescriptor.id` is declared required by
 *   `@lingui/core`'s type, but consumers occasionally pass id-less shapes;
 *   we handle that gracefully via the runtime check.
 */
export function lookupDescriptor(
  i18n: I18n,
  descriptor: MessageDescriptor | string,
): string {
  if (typeof descriptor === 'string') {
    return lookupBareString(i18n, descriptor);
  }
  if (descriptor.id) {
    // Explicit id — caller knows what they want. Pass through unchanged.
    return i18n._(descriptor);
  }
  if (descriptor.message) {
    return lookupBareString(i18n, descriptor.message, descriptor.values);
  }
  // Degenerate descriptor — let Lingui handle it.
  return i18n._(descriptor);
}
