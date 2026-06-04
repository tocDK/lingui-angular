import { PageContent } from '../shared/page-content.types';

export const SSR_CONTENT: PageContent = {
  title: 'provideLingui + SSR',
  pill: 'provider',
  overview: {
    sections: [
      {
        id: 'setup',
        title: 'Setup',
        markdown: `
\`provideLingui(config)\` returns \`EnvironmentProviders\` that wire the
\`LINGUI_CONFIG\` injection token and \`LinguiService\` into the
application's environment injector:

\`\`\`ts
import { provideLingui } from '@tocdk/lingui-angular';

bootstrapApplication(AppComponent, {
  providers: [
    provideLingui({
      sourceLocale: 'en',
      locales: ['en', 'da'],
      loader: async (locale) => import(\`./locales/\${locale}\`),
      fallbackLocales: { 'en-GB': 'en', default: 'en' },
    }),
  ],
});
\`\`\`

\`LinguiConfig\` requires \`sourceLocale\`, \`locales\`, and \`loader\`;
\`fallbackLocales\`, \`detectLocale\`, and \`ssrTransferKey\` are optional.
The loader resolves a \`LinguiCatalog\` — \`{ messages: Messages }\` —
matching the shape \`lingui compile --typescript\` produces.
        `,
      },
      {
        id: 'transfer-state',
        title: 'TransferState handoff',
        markdown: `
On the server, after activating the locale, call \`serializeCatalog\` to
write the active catalog into Angular's \`TransferState\`:

\`\`\`ts
import { serializeCatalog, DEFAULT_SSR_TRANSFER_KEY } from '@tocdk/lingui-angular';

// in your server entry, after lingui.activate(locale) resolves:
serializeCatalog(lingui.i18n, transferState, DEFAULT_SSR_TRANSFER_KEY);
\`\`\`

On the client you don't call \`hydrateCatalog\` yourself — the
\`LinguiService\` constructor checks \`TransferState\` first and hydrates
automatically if a payload is present. That avoids a network round-trip
for the catalog on the very first render after hydration.
        `,
      },
      {
        id: 'key',
        title: 'The transfer key',
        markdown: `
The default key is exported as \`DEFAULT_SSR_TRANSFER_KEY\` (the literal
string \`'lingui-catalog'\`). Override it per-app by setting
\`ssrTransferKey\` on \`LinguiConfig\`, or globally by providing a value
for \`LINGUI_SSR_KEY\`. The serialized shape is described by
\`LinguiTransferPayload\` (locale + messages).
        `,
      },
    ],
    examples: ['ssr'],
  },
  api: {
    sections: [
      {
        id: 'provider',
        title: 'Provider',
        items: [
          {
            id: 'provide-lingui',
            signature: 'provideLingui(config: LinguiConfig): EnvironmentProviders',
            description: 'Registers `LINGUI_CONFIG` and `LinguiService` for the application/environment. Call once at bootstrap.',
          },
          {
            id: 'lingui-config-token',
            signature: 'LINGUI_CONFIG: InjectionToken<LinguiConfig>',
            description: 'The injection token holding the resolved `LinguiConfig`. Useful in advanced setups (e.g. multi-tenant configs) where you want to provide it manually.',
          },
        ],
      },
      {
        id: 'config',
        title: 'LinguiConfig',
        items: [
          {
            id: 'source-locale',
            signature: 'sourceLocale: string',
            description: 'The locale your source strings are written in (e.g. `\'en\'`). Must appear in `locales`.',
          },
          {
            id: 'locales',
            signature: 'locales: string[]',
            description: 'All locales the app supports, including `sourceLocale`.',
          },
          {
            id: 'loader',
            signature: 'loader: (locale: string) => Promise<LinguiCatalog>',
            description: 'Resolves a catalog for the given locale. Typically `(l) => import(`./locales/${l}.po`)`.',
          },
          {
            id: 'fallback-locales',
            signature: 'fallbackLocales?: Record<string, string> & { default?: string }',
            description: 'Locale aliases. `{ \'fr-CA\': \'fr\', default: \'en\' }` maps `fr-CA` to `fr` and uses `en` for anything else not in `locales`.',
          },
          {
            id: 'detect-locale',
            signature: 'detectLocale?: () => string | null',
            description: 'Optional locale detector invoked at construction time. Browser apps typically read `navigator.language`; on SSR you supply your own (e.g. from request headers).',
          },
          {
            id: 'ssr-transfer-key',
            signature: 'ssrTransferKey?: string',
            description: '`TransferState` key for the SSR catalog handoff. Defaults to `DEFAULT_SSR_TRANSFER_KEY`.',
          },
        ],
      },
      {
        id: 'catalog',
        title: 'LinguiCatalog',
        items: [
          {
            id: 'catalog-shape',
            signature: 'interface LinguiCatalog { messages: Messages }',
            description: 'Shape returned by `loader`. Matches the export of `lingui compile --typescript`.',
          },
        ],
      },
      {
        id: 'ssr',
        title: 'SSR helpers',
        items: [
          {
            id: 'serialize',
            signature: 'serializeCatalog(i18n: I18n, state: TransferState, key: string): void',
            description: 'Server-side. Writes `{ locale, messages }` for the active catalog into `TransferState` under `key`.',
          },
          {
            id: 'hydrate',
            signature: 'hydrateCatalog(i18n: I18n, state: TransferState, key: string): boolean',
            description: 'Client-side. If `TransferState` contains a payload under `key`, loads and activates it on `i18n`. Returns `true` if hydration was applied. **You usually don\'t need to call this** — `LinguiService` invokes it from its constructor.',
          },
          {
            id: 'default-key',
            signature: "DEFAULT_SSR_TRANSFER_KEY: 'lingui-catalog'",
            description: 'The default `TransferState` key. Use it on both server and client unless you have a reason to override.',
          },
          {
            id: 'ssr-key-token',
            signature: 'LINGUI_SSR_KEY: InjectionToken<string>',
            description: 'Token holding the effective key. Defaults to `DEFAULT_SSR_TRANSFER_KEY` via factory; override with a `{ provide: LINGUI_SSR_KEY, useValue: \'my-key\' }` provider.',
          },
          {
            id: 'payload',
            signature: 'interface LinguiTransferPayload { locale: string; messages: Messages }',
            description: 'The serialized shape stored in `TransferState`. Exported so server adapters can type the payload precisely.',
          },
        ],
      },
      {
        id: 'errors',
        title: 'Errors',
        items: [
          {
            id: 'unknown-locale',
            signature: 'class LinguiUnknownLocaleError extends Error',
            description: 'Thrown by `LinguiService.activate()` when the requested locale isn\'t in `locales` and no `fallbackLocales` entry resolves it. Carries the offending `locale: string` as a public property.',
          },
        ],
      },
    ],
  },
  examples: [{ key: 'ssr', title: 'SSR + TransferState', showCatalog: false }],
};
