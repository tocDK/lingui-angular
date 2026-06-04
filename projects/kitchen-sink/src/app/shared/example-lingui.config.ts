import { Provider } from '@angular/core';
import { LINGUI_CONFIG, LinguiService } from '@tocdk/lingui-angular';

/**
 * Per-example LinguiService provider.
 *
 * Mirrors `provideLingui({...})` from the library but as a plain
 * `Provider[]` (rather than `EnvironmentProviders`) so it fits in a
 * component-level `providers: [...]` array. Each `<app-lingui-example>`
 * registers this, giving every card its own `LinguiService` instance —
 * and therefore its own `locale()` signal.
 *
 * Effect on the demo: switching DA on one example card no longer flips
 * the locale on every other card on the page. The guide prose stays
 * untranslated — only the example's rendered output reacts.
 *
 * The dynamic-import loader (`import('../../locales/da')`) is cached by
 * the JS module system, so the per-card catalogs share the same module
 * objects. Each LinguiService still calls `i18n.activate` asynchronously
 * on first mount; there is a brief flash of English before the catalog
 * activates, acceptable for a docs gallery.
 */
export function provideExampleLingui(): Provider[] {
  return [
    {
      provide: LINGUI_CONFIG,
      useValue: {
        sourceLocale: 'en',
        locales: ['en', 'da'],
        loader: async (locale: string) => {
          switch (locale) {
            case 'da':
              return import('../../locales/da');
            default:
              return import('../../locales/en');
          }
        },
      },
    },
    LinguiService,
  ];
}
