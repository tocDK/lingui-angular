import { Injectable, Signal, TransferState, computed, inject, signal } from '@angular/core';
import { I18n, MessageDescriptor, setupI18n } from '@lingui/core';
import { LinguiUnknownLocaleError } from './errors';
import type { LinguiConfig } from './lingui-config';
import { hydrateCatalog } from './ssr/transfer-state';
import { DEFAULT_SSR_TRANSFER_KEY } from './ssr/tokens';
import { LINGUI_CONFIG } from './tokens';

@Injectable()
export class LinguiService {
  private readonly config = inject(LINGUI_CONFIG);
  private readonly transferState = inject(TransferState, { optional: true });
  private readonly _locale = signal<string>(this.config.sourceLocale);
  private readonly _loading = signal<boolean>(false);
  private readonly loaded = new Set<string>();

  readonly locale: Signal<string> = this._locale.asReadonly();
  readonly loading: Signal<boolean> = this._loading.asReadonly();
  readonly sourceLocale = this.config.sourceLocale;
  readonly locales: readonly string[] = [...this.config.locales];
  readonly i18n: I18n = setupI18n({ locale: this.config.sourceLocale });

  constructor() {
    const key = this.config.ssrTransferKey ?? DEFAULT_SSR_TRANSFER_KEY;
    if (this.transferState && hydrateCatalog(this.i18n, this.transferState, key)) {
      // SSR payload found: locale + catalog already loaded, no network fetch needed.
      this._locale.set(this.i18n.locale);
      this.loaded.add(this.i18n.locale);
      return;
    }
    const detected = this.config.detectLocale?.() ?? null;
    if (detected && detected !== this.sourceLocale) {
      void this.activate(detected).catch((err) => {
        console.warn(`[LinguiService] Auto-detect locale "${detected}" failed:`, err);
      });
    } else {
      this.i18n.activate(this.sourceLocale);
    }
  }

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

  t(descriptor: MessageDescriptor | string): string {
    // i18n._ has two overloads (string | MessageDescriptor); cast to satisfy
    // the TypeScript compiler while keeping a single call site.
    return this.i18n._(descriptor as MessageDescriptor);
  }

  t$(descriptor: MessageDescriptor | string): Signal<string> {
    return computed(() => {
      // Read locale signal to register reactive dependency —
      // pure computed re-runs whenever locale changes.
      this._locale();
      return this.t(descriptor);
    });
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
