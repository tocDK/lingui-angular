import { setupI18n } from '@lingui/core';
import { generateMessageId } from '@lingui/message-utils/generateMessageId';
import { describe, expect, it } from 'vitest';
import { lookupBareString, lookupDescriptor } from './lookup';

function makeI18n(locale: string, messages: Record<string, string>) {
  const i18n = setupI18n({ locale });
  i18n.load(locale, messages);
  i18n.activate(locale);
  return i18n;
}

/**
 * Build an `I18n` that behaves like a **production** Angular bundle.
 *
 * Lingui's `I18n` constructor only registers the runtime ICU compiler
 * (`setMessagesCompiler(compileMessage)`) when `NODE_ENV !== 'production'`.
 * In a prod build that branch is dead-code-eliminated, so `_messageCompiler`
 * is `undefined` and any *string* fallback returned by `_()` is emitted
 * verbatim — placeholders and all. Vitest runs in dev mode, so the compiler
 * is present and masks the bug (issue #21). We strip it here to reproduce the
 * production fallback path at the unit level.
 */
function makeProdLikeI18n(locale: string, messages: Record<string, string>) {
  const i18n = makeI18n(locale, messages);
  // `setMessagesCompiler` assigns straight to the private field; passing a
  // nullish compiler faithfully mimics the tree-shaken prod build.
  (i18n.setMessagesCompiler as (c: undefined) => unknown)(undefined);
  return i18n;
}

describe('lookupBareString', () => {
  it('finds the translation when the catalog is keyed by hash (real `lingui compile` shape)', () => {
    const source = 'Log in to your account';
    const hash = generateMessageId(source);
    const i18n = makeI18n('da', { [hash]: 'Log ind på din konto' });
    expect(lookupBareString(i18n, source)).toBe('Log ind på din konto');
  });

  it('falls back to source-text key when catalog is hand-forged (back-compat)', () => {
    const source = 'Hello';
    // Note: hash is NOT in the catalog; source-text key IS.
    const i18n = makeI18n('fr', { Hello: 'Bonjour' });
    expect(lookupBareString(i18n, source)).toBe('Bonjour');
  });

  it('returns the source message when neither hash nor source key is in catalog', () => {
    const i18n = makeI18n('da', {});
    expect(lookupBareString(i18n, 'Untranslated')).toBe('Untranslated');
  });

  it('honors $context — same source + different context = different hash = different translation', () => {
    const open = 'Open';
    const openVerb = generateMessageId(open, 'verb');
    const openAdj = generateMessageId(open, 'adjective');
    const i18n = makeI18n('da', {
      [openVerb]: 'Åbn',
      [openAdj]: 'Åben',
    });
    expect(lookupBareString(i18n, open, undefined, 'verb')).toBe('Åbn');
    expect(lookupBareString(i18n, open, undefined, 'adjective')).toBe('Åben');
  });

  it('interpolates values into the hashed lookup result', () => {
    const source = 'Hello, {name}';
    const hash = generateMessageId(source);
    const i18n = makeI18n('fr', { [hash]: 'Bonjour, {name}' });
    expect(lookupBareString(i18n, source, { name: 'Alice' })).toBe('Bonjour, Alice');
  });

  it('interpolates values via the back-compat (source-keyed) path', () => {
    const source = 'Hello, {name}';
    const i18n = makeI18n('fr', { [source]: 'Bonjour, {name}' });
    expect(lookupBareString(i18n, source, { name: 'Alice' })).toBe('Bonjour, Alice');
  });
});

describe('lookupBareString — msgid fallback (stage 3) without a runtime compiler', () => {
  // These reproduce issue #21: a parameterized bare string whose msgid is NOT
  // in the active catalog. In a production build Lingui's runtime ICU compiler
  // is tree-shaken out, so the raw `message` fallback was returned uncompiled
  // and its `{placeholders}` rendered literally. `makeProdLikeI18n` strips the
  // compiler so these assertions FAIL against the pre-fix implementation and
  // PASS once the fallback source is pre-compiled.

  it('interpolates a single placeholder', () => {
    const i18n = makeProdLikeI18n('en', {});
    expect(lookupBareString(i18n, 'Hello, {name}', { name: 'Alice' })).toBe('Hello, Alice');
  });

  it('interpolates multiple placeholders (the #21 support-banner case)', () => {
    const i18n = makeProdLikeI18n('en', {});
    const source = 'Support session — acting as {tier} on {account}';
    expect(lookupBareString(i18n, source, { tier: 'admin', account: 'Acme Corp' })).toBe(
      'Support session — acting as admin on Acme Corp',
    );
  });

  it('interpolates a fallback resolved via $context (context-hashed msgid still absent)', () => {
    // With a $context the lookup hashes `generateMessageId(msg, context)`; that
    // id is not in the catalog either, so it falls through to stage 3. The
    // fallback must still interpolate.
    const i18n = makeProdLikeI18n('en', {});
    expect(lookupBareString(i18n, 'Signed in as {user}', { user: 'Bob' }, 'header')).toBe(
      'Signed in as Bob',
    );
  });

  it('compiles full ICU (plural) in the fallback, not just simple placeholders', () => {
    const i18n = makeProdLikeI18n('en', {});
    const source = '{count, plural, one {# item} other {# items}}';
    expect(lookupBareString(i18n, source, { count: 1 })).toBe('1 item');
    expect(lookupBareString(i18n, source, { count: 5 })).toBe('5 items');
  });

  it('returns the source unchanged when the fallback has no placeholders (behavior preserved)', () => {
    const i18n = makeProdLikeI18n('da', {});
    expect(lookupBareString(i18n, 'Untranslated')).toBe('Untranslated');
  });
});

describe('lookupDescriptor', () => {
  it('treats string descriptors as bare-string sources (hash lookup)', () => {
    const source = 'Sign out';
    const hash = generateMessageId(source);
    const i18n = makeI18n('da', { [hash]: 'Log ud' });
    expect(lookupDescriptor(i18n, source)).toBe('Log ud');
  });

  it('passes through MessageDescriptor with explicit id unchanged', () => {
    const i18n = makeI18n('da', { 'login.button': 'Log ind' });
    expect(lookupDescriptor(i18n, { id: 'login.button', message: 'Log in' })).toBe('Log ind');
  });

  it('hashes id-less MessageDescriptor by its message', () => {
    const source = 'Sign up';
    const hash = generateMessageId(source);
    const i18n = makeI18n('da', { [hash]: 'Tilmeld' });
    expect(lookupDescriptor(i18n, { message: source })).toBe('Tilmeld');
  });

  it('interpolates descriptor.values', () => {
    const source = 'Hello, {name}';
    const hash = generateMessageId(source);
    const i18n = makeI18n('fr', { [hash]: 'Bonjour, {name}' });
    expect(lookupDescriptor(i18n, { message: source, values: { name: 'Alice' } })).toBe('Bonjour, Alice');
  });
});
