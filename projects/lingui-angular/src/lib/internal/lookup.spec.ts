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
