// Public API for @tocdk/lingui-angular

// Errors
export { LinguiUnknownLocaleError } from './lib/errors';

// Types
export type { LinguiCatalog, LinguiConfig } from './lib/lingui-config';

// Provider + service
export { LINGUI_CONFIG, provideLingui } from './lib/provide-lingui';
export { LinguiService } from './lib/lingui.service';

// NOTE: @lingui/core/macro exports (t, plural, select) are Babel-time macros
// and are intentionally NOT re-exported here — they require Babel plugin
// transforms that are not available in Angular CLI's esbuild pipeline.
// Use LinguiService.t() / LinguiService.i18n._() for runtime translation,
// and | t / | tPlural / | tSelect pipes in templates.

// Pipes
export { TPipe, type TPipeOptions } from './lib/pipes/t.pipe';
export { TPluralPipe, type PluralRules } from './lib/pipes/t-plural.pipe';
export { TSelectPipe, type SelectRules } from './lib/pipes/t-select.pipe';

// Directives
export { TDirective } from './lib/directives/t.directive';

// SSR helpers
export { serializeCatalog, hydrateCatalog } from './lib/ssr/transfer-state';
export {
  DEFAULT_SSR_TRANSFER_KEY,
  LINGUI_SSR_KEY,
  type LinguiTransferPayload,
} from './lib/ssr/tokens';
