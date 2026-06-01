import { Injectable, Signal, inject, signal } from '@angular/core';
import { I18n, setupI18n } from '@lingui/core';
import { LinguiUnknownLocaleError } from './errors';
import type { LinguiConfig } from './lingui-config';
import { LINGUI_CONFIG } from './provide-lingui';

@Injectable({ providedIn: 'root' })
export class LinguiService {
  private readonly config = inject(LINGUI_CONFIG);
  private readonly _locale = signal<string>(this.config.sourceLocale);
  private readonly _loading = signal<boolean>(false);
  private readonly loaded = new Set<string>();

  readonly locale: Signal<string> = this._locale.asReadonly();
  readonly loading: Signal<boolean> = this._loading.asReadonly();
  readonly sourceLocale = this.config.sourceLocale;
  readonly locales: readonly string[] = [...this.config.locales];
  readonly i18n: I18n = setupI18n({ locale: this.config.sourceLocale });

  async activate(locale: string): Promise<void> {
    const resolved = this.resolveLocale(locale);
    if (resolved === null) {
      throw new LinguiUnknownLocaleError(locale);
    }
    this._loading.set(true);
    try {
      if (!this.loaded.has(resolved)) {
        const catalog = await this.config.loader(resolved);
        this.i18n.load(resolved, catalog.messages);
        this.loaded.add(resolved);
      }
      this.i18n.activate(resolved);
      this._locale.set(resolved);
    } finally {
      this._loading.set(false);
    }
  }

  private resolveLocale(locale: string): string | null {
    if (this.locales.includes(locale)) return locale;
    const fallback = this.config.fallbackLocales?.[locale];
    if (fallback && this.locales.includes(fallback)) return fallback;
    const def = this.config.fallbackLocales?.['default'];
    if (def && this.locales.includes(def)) return def;
    return null;
  }
}
