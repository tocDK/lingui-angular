import { describe, expect, it } from 'vitest';
import { LinguiUnknownLocaleError } from './errors';

describe('LinguiUnknownLocaleError', () => {
  it('is an Error with the locale on the instance', () => {
    const err = new LinguiUnknownLocaleError('xx');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(LinguiUnknownLocaleError);
    expect(err.locale).toBe('xx');
    expect(err.message).toBe('Unknown locale: "xx"');
    expect(err.name).toBe('LinguiUnknownLocaleError');
  });
});
