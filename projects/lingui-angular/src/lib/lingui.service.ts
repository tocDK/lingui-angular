import { Injectable, Signal, TransferState, computed, inject, signal } from '@angular/core';
import { I18n, MessageDescriptor, setupI18n } from '@lingui/core';
import { LinguiUnknownLocaleError } from './errors';
import { lookupDescriptor } from './internal/lookup';
// LinguiConfig: consumed via injection token LINGUI_CONFIG at runtime; not imported directly
import { hydrateCatalog } from './ssr/transfer-state';
import { LINGUI_SSR_KEY } from './ssr/tokens';
import { LINGUI_CONFIG } from './tokens';

@Injectable()
export class LinguiService {
  private readonly config = inject(LINGUI_CONFIG);
  private readonly transferState = inject(TransferState, { optional: true });
  private readonly ssrKey = inject(LINGUI_SSR_KEY);
  private readonly _locale = signal<string>(this.config.sourceLocale);
  private readonly _loading = signal<boolean>(false);
  private readonly loaded = new Set<string>();
  private _inflight: string | null = null;

  readonly locale: Signal<string> = this._locale.asReadonly();
  readonly loading: Signal<boolean> = this._loading.asReadonly();
  readonly sourceLocale = this.config.sourceLocale;
  readonly locales: readonly string[] = [...this.config.locales];
  readonly i18n: I18n = setupI18n({ locale: this.config.sourceLocale });

  constructor() {
    if (!this.config.locales.includes(this.config.sourceLocale)) {
      throw new Error(
        `[LinguiService] sourceLocale "${this.config.sourceLocale}" must be in locales[] (got [${this.config.locales.join(', ')}])`,
      );
    }
    const key = this.config.ssrTransferKey ?? this.ssrKey;
    if (this.transferState && hydrateCatalog(this.i18n, this.transferState, key)) {
      // SSR payload found: locale + catalog already loaded, no network fetch needed.
      this._locale.set(this.i18n.locale);
      this.loaded.add(this.i18n.locale);
      return;
    }
    let detected: string | null = null;
    try {
      detected = this.config.detectLocale?.() ?? null;
    } catch (err) {
      console.warn('[LinguiService] detectLocale() threw synchronously:', err);
    }
    if (detected && detected !== this.sourceLocale) {
      void this.activate(detected).catch((err) => {
        console.warn(`[LinguiService] Auto-detect locale "${detected}" failed:`, err);
      });
    } else {
      this.i18n.activate(this.sourceLocale);
    }
  }

  async activate(locale: string): Promise<string> {
    const resolved = this.resolveLocale(locale);
    if (resolved === null) {
      throw new LinguiUnknownLocaleError(locale);
    }
    this._inflight = resolved;
    this._loading.set(true);
    try {
      if (!this.loaded.has(resolved)) {
        const catalog = await this.config.loader(resolved);
        if (this._inflight !== resolved) return this._locale();
        this.i18n.load(resolved, catalog.messages);
        this.loaded.add(resolved);
      }
      if (this._inflight !== resolved) return this._locale();
      this.i18n.activate(resolved);
      this._locale.set(resolved);
      return resolved;
    } finally {
      if (this._inflight === resolved) {
        this._loading.set(false);
        this._inflight = null;
      }
    }
  }

  t(descriptor: MessageDescriptor | string): string {
    // Hash bare-string sources / id-less descriptors so the runtime id matches
    // what `lingui compile --typescript` emits. Descriptors with an explicit
    // `id` (e.g. macro-generated) pass through unchanged.
    return lookupDescriptor(this.i18n, descriptor);
  }

  /**
   * Returns a `Signal<string>` that re-emits when the active locale changes.
   *
   * **Call this once and store the result.** Each call creates a new `computed()`,
   * so calling `t$()` inside another computed or template expression allocates
   * a new signal every CD cycle. The idiomatic shape is:
   *
   * ```typescript
   * readonly greeting = this.lingui.t$('Hello');
   * // in template: {{ greeting() }}
   * ```
   *
   * Avoid:
   * ```typescript
   * // BAD: new computed every render
   * readonly greeting = computed(() => this.lingui.t$('Hello')());
   * ```
   */
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
