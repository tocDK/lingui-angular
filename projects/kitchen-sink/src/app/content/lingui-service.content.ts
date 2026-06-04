import { PageContent } from '../shared/page-content.types';

export const LINGUI_SERVICE_CONTENT: PageContent = {
  title: 'LinguiService',
  pill: 'service',
  overview: {
    sections: [
      {
        id: 'when-to-use',
        title: 'When to reach for the service',
        markdown: `
\`LinguiService\` is the runtime escape hatch — use it from class code when
neither the \`| t\` pipe nor the \`[t]\` directive fits (e.g. building a
toast string in a side-effect, picking a locale at runtime, or reading
the current locale to drive routing).

The two methods you'll touch most:

- \`t$(descriptor)\` — returns a \`Signal<string>\` that re-emits when the
  active locale changes. Use this for any class-side translation that
  must react to locale changes.
- \`activate(locale)\` — switches the active locale, lazily loading the
  catalog through the configured loader if it isn't cached yet.
        `,
      },
      {
        id: 'reactivity-contract',
        title: 'Reactivity contract',
        markdown: `
The active locale is a writable signal exposed as \`lingui.locale()\`.

\`t$()\` reads that signal internally, so the returned \`Signal<string>\`
re-emits whenever \`activate()\` resolves. Call \`t$()\` **once** and store
the result — each call allocates a new \`computed()\`.

Never wrap \`lingui.t()\` in a \`computed()\` yourself: plain \`t()\` does
not register a dep on the locale signal, so the \`computed\` will never
re-run on locale change. See [Change detection](/guides/change-detection)
for the footgun in full.
        `,
      },
      {
        id: 'error-handling',
        title: 'Error handling',
        markdown: `
\`activate(locale)\` throws \`LinguiUnknownLocaleError\` if the locale isn't
listed in \`LinguiConfig.locales\` (and no \`fallbackLocales\` entry
resolves it). Catch it at your switcher boundary to surface a friendly
"unsupported language" message.
        `,
      },
    ],
    examples: ['basic'],
  },
  api: {
    sections: [
      {
        id: 'properties',
        title: 'Properties',
        items: [
          {
            id: 'locale',
            signature: 'locale: Signal<string>',
            description: 'The currently active locale. Updates after `activate()` resolves.',
          },
          {
            id: 'loading',
            signature: 'loading: Signal<boolean>',
            description: 'True while a locale catalog is being fetched via the configured `loader`.',
          },
          {
            id: 'sourceLocale',
            signature: 'sourceLocale: string',
            description: 'Source locale taken from the `LinguiConfig` passed to `provideLingui()`.',
          },
          {
            id: 'locales',
            signature: 'locales: readonly string[]',
            description: 'All configured locales (defensively copied from the config).',
          },
          {
            id: 'i18n',
            signature: 'i18n: I18n',
            description: 'The underlying `@lingui/core` instance — escape hatch for `i18n._(id, values, opts)` or `i18n.load(locale, messages)`.',
          },
        ],
      },
      {
        id: 'methods',
        title: 'Methods',
        items: [
          {
            id: 't',
            signature: 't(descriptor: MessageDescriptor | string): string',
            description: 'Synchronous one-shot translation. Does **not** track the locale signal — pair with `t$` (or read `locale()` yourself) when the value needs to react to locale changes.',
          },
          {
            id: 't-dollar',
            signature: 't$(descriptor: MessageDescriptor | string): Signal<string>',
            description: 'Reactive translation. The returned `Signal<string>` re-emits whenever the active locale changes. Call once, store the result — each invocation allocates a new `computed()`.',
          },
          {
            id: 'activate',
            signature: 'activate(locale: string): Promise<string>',
            description: 'Switch to a different locale. Loads the catalog via the configured loader on first use, then activates it. Resolves with the actually-activated locale (after `fallbackLocales` resolution). Throws `LinguiUnknownLocaleError` if the locale cannot be resolved.',
          },
        ],
      },
    ],
  },
  examples: [
    { key: 'basic', title: 'Basic', showCatalog: true },
    { key: 'params', title: 'Interpolated parameters', showCatalog: false },
    { key: 'context', title: 'Disambiguation via $context', showCatalog: true },
    { key: 'explicit-id', title: 'Explicit message IDs', showCatalog: true },
  ],
};
