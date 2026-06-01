import type { Messages } from '@lingui/core';

export interface LinguiCatalog {
  messages: Messages;
}

export interface LinguiConfig {
  /** The locale your source strings are written in (e.g. `'en'`). */
  sourceLocale: string;
  /** All locales the app supports, including `sourceLocale`. */
  locales: string[];
  /** Resolves a catalog for the given locale. Typically `(l) => import(`./locales/${l}.po`)`. */
  loader: (locale: string) => Promise<LinguiCatalog>;
  /** Optional locale aliases. Example: `{ 'fr-CA': 'fr', default: 'en' }`. */
  fallbackLocales?: Record<string, string> & { default?: string };
  /** Browser-default detector; on SSR, supply your own. */
  detectLocale?: () => string | null;
  /** `TransferState` key for SSR catalog handoff. Default: `'lingui-catalog'`. */
  ssrTransferKey?: string;
}
