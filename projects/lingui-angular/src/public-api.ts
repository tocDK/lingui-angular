// Public API for @tocdk/lingui-angular

// Errors
export { LinguiUnknownLocaleError } from './lib/errors';

// Types
export type { LinguiCatalog, LinguiConfig } from './lib/lingui-config';

// Provider + service
export { LINGUI_CONFIG, provideLingui } from './lib/provide-lingui';
export { LinguiService } from './lib/lingui.service';

// Tag-function re-exports (so callers import everything from one place)
export { t, plural, select, defineMessage as msg } from '@lingui/core/macro';

// Pipes
export { TPipe, type TPipeOptions } from './lib/pipes/t.pipe';
export { TPluralPipe, type PluralRules } from './lib/pipes/t-plural.pipe';
export { TSelectPipe, type SelectRules } from './lib/pipes/t-select.pipe';

// Directives
export { TDirective } from './lib/directives/t.directive';
