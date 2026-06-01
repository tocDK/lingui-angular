export class LinguiUnknownLocaleError extends Error {
  override readonly name = 'LinguiUnknownLocaleError';
  constructor(public readonly locale: string) {
    super(`Unknown locale: "${locale}"`);
  }
}
