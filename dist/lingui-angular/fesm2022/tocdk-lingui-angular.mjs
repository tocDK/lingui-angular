import * as i0 from '@angular/core';
import { makeStateKey, InjectionToken, inject, TransferState, signal, computed, Injectable, makeEnvironmentProviders, Pipe, input, ElementRef, Injector, runInInjectionContext, effect, Directive } from '@angular/core';
import { setupI18n, formats } from '@lingui/core';
import { compileMessage } from '@lingui/message-utils/compileMessage';
import { generateMessageId } from '@lingui/message-utils/generateMessageId';

class LinguiUnknownLocaleError extends Error {
    locale;
    name = 'LinguiUnknownLocaleError';
    constructor(locale) {
        super(`Unknown locale: "${locale}"`);
        this.locale = locale;
    }
}

/**
 * Look up a bare-string source message against the active catalog.
 *
 * Lingui CLI's `compile --typescript` hashes bare-string msgids via
 * `generateMessageId(message, context)` (6-char base64). Parameterized
 * msgids (with `{name}` etc.) are kept source-keyed.
 *
 * Strategy:
 * 1. Compute the hash and try `messages[hash]` — matches real `lingui compile`
 *    output.
 * 2. Back-compat: if the catalog is hand-forged with source-text keys
 *    (legacy specs, ad-hoc consumer catalogs), fall back to `messages[source]`.
 * 3. Otherwise fall back to the source text. The source is pre-compiled via
 *    `compileMessage` and passed as `{ message }`, so its `{placeholders}`
 *    interpolate even in a production build where Lingui's runtime ICU
 *    compiler is tree-shaken out (issue #21).
 *
 * @param i18n Active `I18n` instance.
 * @param message Bare-string source text (English source).
 * @param values Optional ICU placeholder values.
 * @param context Optional `$context` extraction hint — included in the hash
 *   so the runtime id matches what `lingui compile` produced.
 */
function lookupBareString(i18n, message, values, context) {
    // `generateMessageId`'s shipped type signature is `any`; coerce to string.
    const hash = generateMessageId(message, context ?? '');
    // Stage 1: hashed catalog (real `lingui compile --typescript` output).
    if (hash in i18n.messages) {
        return i18n._(hash, values, { message });
    }
    // Stage 2: back-compat — hand-forged source-keyed catalog.
    if (message in i18n.messages) {
        return i18n._(message, values, { message });
    }
    // Stage 3: nothing matches — fall back to `message`. Pre-compile the source
    // into a token array so interpolation still works in a PRODUCTION build.
    //
    // Lingui's `I18n` registers its runtime ICU compiler only when
    // `NODE_ENV !== 'production'`; a prod bundle tree-shakes that branch out, so
    // `_()` has no compiler and returns a *string* fallback verbatim — leaving
    // `{placeholders}` literal (issue #21). Passing an already-compiled token
    // array as the fallback `message` means `_()` skips compilation entirely and
    // hands the array straight to `interpolate`, in dev and prod alike. On a
    // stage-1/2 hit this option is ignored (the catalog value wins), so this is
    // a no-op for translated messages.
    //
    // `MessageOptions.message` is typed `string`, but at runtime `_()` accepts
    // the same `UncompiledMessage | CompiledMessage` union its catalog values
    // use; the cast only bridges that narrower public type.
    return i18n._(hash, values, {
        message: compileMessage(message),
    });
}
/**
 * Resolve a `MessageDescriptor` or bare-string `descriptor` against the
 * active catalog, applying the same two-stage lookup as `lookupBareString`.
 *
 * - String descriptor: treated as a bare source message; hashed for lookup.
 * - `MessageDescriptor` with explicit `id`: passed through unchanged
 *   (the consumer has already opted into an explicit id — typically already
 *   hashed by the Lingui macro at extract time).
 * - `MessageDescriptor` without `id` (only `message`): hashed from
 *   `descriptor.message`. `MessageDescriptor.id` is declared required by
 *   `@lingui/core`'s type, but consumers occasionally pass id-less shapes;
 *   we handle that gracefully via the runtime check.
 */
function lookupDescriptor(i18n, descriptor) {
    if (typeof descriptor === 'string') {
        return lookupBareString(i18n, descriptor);
    }
    if (descriptor.id) {
        // Explicit id — caller knows what they want. Pass through unchanged.
        return i18n._(descriptor);
    }
    if (descriptor.message) {
        return lookupBareString(i18n, descriptor.message, descriptor.values);
    }
    // Degenerate descriptor — let Lingui handle it.
    return i18n._(descriptor);
}

/** Server-side: writes the active catalog into TransferState under `key`. */
function serializeCatalog(i18n, state, key) {
    const stateKey = makeStateKey(key);
    state.set(stateKey, { locale: i18n.locale, messages: i18n.messages });
}
/** Client-side: if TransferState contains a catalog under `key`, hydrate i18n with it.
 *  Returns true if hydration was applied, false if the key was absent. */
function hydrateCatalog(i18n, state, key) {
    const stateKey = makeStateKey(key);
    if (!state.hasKey(stateKey))
        return false;
    const payload = state.get(stateKey, null);
    if (!payload)
        return false;
    i18n.load(payload.locale, payload.messages);
    i18n.activate(payload.locale);
    return true;
}

/** Default `TransferState` key; can be overridden via `LinguiConfig.ssrTransferKey`. */
const DEFAULT_SSR_TRANSFER_KEY = 'lingui-catalog';
/** Optional override token consumers can provide for non-default keys. */
const LINGUI_SSR_KEY = new InjectionToken('LINGUI_SSR_KEY', {
    factory: () => DEFAULT_SSR_TRANSFER_KEY,
});

const LINGUI_CONFIG = new InjectionToken('LINGUI_CONFIG');

class LinguiService {
    config = inject(LINGUI_CONFIG);
    transferState = inject(TransferState, { optional: true });
    ssrKey = inject(LINGUI_SSR_KEY);
    _locale = signal(this.config.sourceLocale, ...(ngDevMode ? [{ debugName: "_locale" }] : []));
    _loading = signal(false, ...(ngDevMode ? [{ debugName: "_loading" }] : []));
    loaded = new Set();
    _inflight = null;
    locale = this._locale.asReadonly();
    loading = this._loading.asReadonly();
    sourceLocale = this.config.sourceLocale;
    locales = [...this.config.locales];
    i18n = setupI18n({ locale: this.config.sourceLocale });
    constructor() {
        if (!this.config.locales.includes(this.config.sourceLocale)) {
            throw new Error(`[LinguiService] sourceLocale "${this.config.sourceLocale}" must be in locales[] (got [${this.config.locales.join(', ')}])`);
        }
        const key = this.config.ssrTransferKey ?? this.ssrKey;
        if (this.transferState && hydrateCatalog(this.i18n, this.transferState, key)) {
            // SSR payload found: locale + catalog already loaded, no network fetch needed.
            this._locale.set(this.i18n.locale);
            this.loaded.add(this.i18n.locale);
            return;
        }
        let detected = null;
        try {
            detected = this.config.detectLocale?.() ?? null;
        }
        catch (err) {
            console.warn('[LinguiService] detectLocale() threw synchronously:', err);
        }
        if (detected && detected !== this.sourceLocale) {
            void this.activate(detected).catch((err) => {
                console.warn(`[LinguiService] Auto-detect locale "${detected}" failed:`, err);
            });
        }
        else {
            this.i18n.activate(this.sourceLocale);
        }
    }
    async activate(locale) {
        const resolved = this.resolveLocale(locale);
        if (resolved === null) {
            throw new LinguiUnknownLocaleError(locale);
        }
        this._inflight = resolved;
        this._loading.set(true);
        try {
            if (!this.loaded.has(resolved)) {
                const catalog = await this.config.loader(resolved);
                if (this._inflight !== resolved)
                    return this._locale();
                this.i18n.load(resolved, catalog.messages);
                this.loaded.add(resolved);
            }
            if (this._inflight !== resolved)
                return this._locale();
            this.i18n.activate(resolved);
            this._locale.set(resolved);
            return resolved;
        }
        finally {
            if (this._inflight === resolved) {
                this._loading.set(false);
                this._inflight = null;
            }
        }
    }
    t(descriptor) {
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
    t$(descriptor) {
        return computed(() => {
            // Read locale signal to register reactive dependency —
            // pure computed re-runs whenever locale changes.
            this._locale();
            return this.t(descriptor);
        });
    }
    resolveLocale(locale) {
        if (this.locales.includes(locale))
            return locale;
        const fallback = this.config.fallbackLocales?.[locale];
        if (fallback && this.locales.includes(fallback))
            return fallback;
        const def = this.config.fallbackLocales?.['default'];
        if (def && this.locales.includes(def))
            return def;
        return null;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.23", ngImport: i0, type: LinguiService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.23", ngImport: i0, type: LinguiService });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.23", ngImport: i0, type: LinguiService, decorators: [{
            type: Injectable
        }], ctorParameters: () => [] });

function provideLingui(config) {
    return makeEnvironmentProviders([
        { provide: LINGUI_CONFIG, useValue: config },
        LinguiService,
    ]);
}

class TPipe {
    lingui = inject(LinguiService);
    transform(message, options) {
        // Read the locale signal to register a reactive dep so pure-pipe CD
        // re-runs us on locale change.
        this.lingui.locale();
        if (!options) {
            // Bare-string form: hash the source for lookup so we hit the catalog
            // shape `lingui compile --typescript` produces.
            return lookupBareString(this.lingui.i18n, message);
        }
        const { $context, $id, ...values } = options;
        if ($id) {
            // Explicit id — caller has opted in (typically pre-hashed). Pass through.
            return this.lingui.i18n._($id, values, { message });
        }
        // No explicit id: hash the source (with $context per Lingui's contract) so
        // the runtime id matches `lingui compile --typescript` output. Parameterized
        // messages aren't hashed by Lingui CLI, but the two-stage lookup in
        // lookupBareString handles both shapes.
        return lookupBareString(this.lingui.i18n, message, values, $context);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.23", ngImport: i0, type: TPipe, deps: [], target: i0.ɵɵFactoryTarget.Pipe });
    static ɵpipe = i0.ɵɵngDeclarePipe({ minVersion: "14.0.0", version: "20.3.23", ngImport: i0, type: TPipe, isStandalone: true, name: "t", pure: false });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.23", ngImport: i0, type: TPipe, decorators: [{
            type: Pipe,
            args: [{ name: 't', standalone: true, pure: false }]
        }] });

class TPluralPipe {
    lingui = inject(LinguiService, { optional: true });
    transform(count, rules) {
        if (!rules || typeof rules.other !== 'string') {
            throw new TypeError('tPlural requires an "other" rule.');
        }
        const locale = this.lingui?.locale() ?? 'en';
        // Cast needed: @lingui/core's PluralOptions types values as LDMLPluralRule but
        // they are actually the translated strings (e.g. '# item').
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        const form = formats.plural([locale], false, count, rules);
        return form.replace(/#/g, String(count));
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.23", ngImport: i0, type: TPluralPipe, deps: [], target: i0.ɵɵFactoryTarget.Pipe });
    static ɵpipe = i0.ɵɵngDeclarePipe({ minVersion: "14.0.0", version: "20.3.23", ngImport: i0, type: TPluralPipe, isStandalone: true, name: "tPlural", pure: false });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.23", ngImport: i0, type: TPluralPipe, decorators: [{
            type: Pipe,
            args: [{ name: 'tPlural', standalone: true, pure: false }]
        }] });

class TSelectPipe {
    lingui = inject(LinguiService, { optional: true });
    transform(value, rules) {
        if (!rules || typeof rules.other !== 'string') {
            throw new TypeError('tSelect requires an "other" rule.');
        }
        // Read locale to register reactive dep so the pipe re-runs on locale change
        this.lingui?.locale();
        const match = Object.prototype.hasOwnProperty.call(rules, value) ? rules[value] : undefined;
        return match ?? rules.other;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.23", ngImport: i0, type: TSelectPipe, deps: [], target: i0.ɵɵFactoryTarget.Pipe });
    static ɵpipe = i0.ɵɵngDeclarePipe({ minVersion: "14.0.0", version: "20.3.23", ngImport: i0, type: TSelectPipe, isStandalone: true, name: "tSelect", pure: false });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.23", ngImport: i0, type: TSelectPipe, decorators: [{
            type: Pipe,
            args: [{ name: 'tSelect', standalone: true, pure: false }]
        }] });

// eslint-disable-next-line @angular-eslint/directive-selector
class TDirective {
    t = input.required(...(ngDevMode ? [{ debugName: "t" }] : []));
    host = inject(ElementRef);
    lingui = inject(LinguiService);
    injector = inject(Injector);
    ngOnInit() {
        runInInjectionContext(this.injector, () => {
            effect(() => {
                // Reading locale() registers the reactive dep so the effect re-runs on locale change.
                // Reading this.t() registers a dep on the signal input so the effect also re-runs
                // when the parent rebinds [t]="someVar" and someVar changes.
                this.lingui.locale();
                // Bare-string form: hash the source for lookup so we hit the catalog
                // shape `lingui compile --typescript` produces.
                this.host.nativeElement.textContent = lookupBareString(this.lingui.i18n, this.t());
            });
        });
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.23", ngImport: i0, type: TDirective, deps: [], target: i0.ɵɵFactoryTarget.Directive });
    static ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "17.1.0", version: "20.3.23", type: TDirective, isStandalone: true, selector: "[t]", inputs: { t: { classPropertyName: "t", publicName: "t", isSignal: true, isRequired: true, transformFunction: null } }, ngImport: i0 });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.23", ngImport: i0, type: TDirective, decorators: [{
            type: Directive,
            args: [{ selector: '[t]', standalone: true }]
        }], propDecorators: { t: [{ type: i0.Input, args: [{ isSignal: true, alias: "t", required: true }] }] } });

// Public API for @tocdk/lingui-angular
// Errors

/**
 * Generated bundle index. Do not edit.
 */

export { DEFAULT_SSR_TRANSFER_KEY, LINGUI_CONFIG, LINGUI_SSR_KEY, LinguiService, LinguiUnknownLocaleError, TDirective, TPipe, TPluralPipe, TSelectPipe, hydrateCatalog, provideLingui, serializeCatalog };
//# sourceMappingURL=tocdk-lingui-angular.mjs.map
