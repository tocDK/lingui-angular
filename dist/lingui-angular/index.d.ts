import { Messages, I18n, MessageDescriptor } from '@lingui/core';
import * as i0 from '@angular/core';
import { InjectionToken, EnvironmentProviders, Signal, PipeTransform, OnInit, TransferState } from '@angular/core';

declare class LinguiUnknownLocaleError extends Error {
    readonly locale: string;
    readonly name = "LinguiUnknownLocaleError";
    constructor(locale: string);
}

interface LinguiCatalog {
    messages: Messages;
}
interface LinguiConfig {
    /** The locale your source strings are written in (e.g. `'en'`). */
    sourceLocale: string;
    /** All locales the app supports, including `sourceLocale`. */
    locales: string[];
    /** Resolves a catalog for the given locale. Typically `(l) => import(`./locales/${l}.po`)`. */
    loader: (locale: string) => Promise<LinguiCatalog>;
    /** Optional locale aliases. Example: `{ 'fr-CA': 'fr', default: 'en' }`. */
    fallbackLocales?: Record<string, string> & {
        default?: string;
    };
    /** Browser-default detector; on SSR, supply your own. */
    detectLocale?: () => string | null;
    /** `TransferState` key for SSR catalog handoff. Default: `'lingui-catalog'`. */
    ssrTransferKey?: string;
}

declare const LINGUI_CONFIG: InjectionToken<LinguiConfig>;

declare function provideLingui(config: LinguiConfig): EnvironmentProviders;

declare class LinguiService {
    private readonly config;
    private readonly transferState;
    private readonly ssrKey;
    private readonly _locale;
    private readonly _loading;
    private readonly loaded;
    private _inflight;
    readonly locale: Signal<string>;
    readonly loading: Signal<boolean>;
    readonly sourceLocale: string;
    readonly locales: readonly string[];
    readonly i18n: I18n;
    constructor();
    activate(locale: string): Promise<string>;
    t(descriptor: MessageDescriptor | string): string;
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
    t$(descriptor: MessageDescriptor | string): Signal<string>;
    private resolveLocale;
    static ɵfac: i0.ɵɵFactoryDeclaration<LinguiService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<LinguiService>;
}

interface TPipeOptions {
    $context?: string;
    $id?: string;
    [placeholder: string]: unknown;
}
declare class TPipe implements PipeTransform {
    private readonly lingui;
    transform(message: string, options?: TPipeOptions): string;
    static ɵfac: i0.ɵɵFactoryDeclaration<TPipe, never>;
    static ɵpipe: i0.ɵɵPipeDeclaration<TPipe, "t", true>;
}

type PluralRules = Partial<Record<'zero' | 'one' | 'two' | 'few' | 'many', string>> & {
    other: string;
};
declare class TPluralPipe implements PipeTransform {
    private readonly lingui;
    transform(count: number, rules: PluralRules): string;
    static ɵfac: i0.ɵɵFactoryDeclaration<TPluralPipe, never>;
    static ɵpipe: i0.ɵɵPipeDeclaration<TPluralPipe, "tPlural", true>;
}

type SelectRules = Record<string, string> & {
    other: string;
};
declare class TSelectPipe implements PipeTransform {
    private readonly lingui;
    transform(value: string, rules: SelectRules): string;
    static ɵfac: i0.ɵɵFactoryDeclaration<TSelectPipe, never>;
    static ɵpipe: i0.ɵɵPipeDeclaration<TSelectPipe, "tSelect", true>;
}

declare class TDirective implements OnInit {
    readonly t: i0.InputSignal<string>;
    private readonly host;
    private readonly lingui;
    private readonly injector;
    ngOnInit(): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<TDirective, never>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<TDirective, "[t]", never, { "t": { "alias": "t"; "required": true; "isSignal": true; }; }, {}, never, never, true, never>;
}

/** Server-side: writes the active catalog into TransferState under `key`. */
declare function serializeCatalog(i18n: I18n, state: TransferState, key: string): void;
/** Client-side: if TransferState contains a catalog under `key`, hydrate i18n with it.
 *  Returns true if hydration was applied, false if the key was absent. */
declare function hydrateCatalog(i18n: I18n, state: TransferState, key: string): boolean;

/** Default `TransferState` key; can be overridden via `LinguiConfig.ssrTransferKey`. */
declare const DEFAULT_SSR_TRANSFER_KEY = "lingui-catalog";
/** Serialized payload shape used between server and client. */
interface LinguiTransferPayload {
    locale: string;
    messages: Messages;
}
/** Optional override token consumers can provide for non-default keys. */
declare const LINGUI_SSR_KEY: InjectionToken<string>;

export { DEFAULT_SSR_TRANSFER_KEY, LINGUI_CONFIG, LINGUI_SSR_KEY, LinguiService, LinguiUnknownLocaleError, TDirective, TPipe, TPluralPipe, TSelectPipe, hydrateCatalog, provideLingui, serializeCatalog };
export type { LinguiCatalog, LinguiConfig, LinguiTransferPayload, PluralRules, SelectRules, TPipeOptions };
