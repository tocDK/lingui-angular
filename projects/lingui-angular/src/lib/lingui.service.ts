import { Injectable, Signal, inject, signal } from '@angular/core';
import { I18n, setupI18n } from '@lingui/core';
import type { LinguiConfig } from './lingui-config';
import { LINGUI_CONFIG } from './provide-lingui';

@Injectable({ providedIn: 'root' })
export class LinguiService {
  private readonly config = inject(LINGUI_CONFIG);
  private readonly _locale = signal<string>(this.config.sourceLocale);
  private readonly loaded = new Set<string>();

  readonly locale: Signal<string> = this._locale.asReadonly();
  readonly sourceLocale = this.config.sourceLocale;
  readonly locales: readonly string[] = [...this.config.locales];
  readonly i18n: I18n = setupI18n({ locale: this.config.sourceLocale });

  async activate(locale: string): Promise<void> {
    const catalog = await this.config.loader(locale);
    this.i18n.load(locale, catalog.messages);
    this.i18n.activate(locale);
    this._locale.set(locale);
  }
}
