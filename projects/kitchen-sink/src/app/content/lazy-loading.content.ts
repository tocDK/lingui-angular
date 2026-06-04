import { PageContent } from '../shared/page-content.types';

export const LAZY_LOADING_CONTENT: PageContent = {
  title: 'Lazy loading',
  pill: 'guide',
  overview: {
    sections: [
      {
        id: 'how-it-works',
        title: 'How it works',
        markdown: `
The \`loader\` you pass to \`provideLingui()\` is a function that returns
a \`Promise<LinguiCatalog>\`. The natural shape is a dynamic \`import()\`:

\`\`\`ts
provideLingui({
  sourceLocale: 'en',
  locales: ['en', 'da', 'de'],
  loader: async (locale) => import(\`./locales/\${locale}\`),
});
\`\`\`

Each locale's catalog is a separate JS chunk. The bundler emits one
chunk per match of the dynamic-import template, and none of them ship
in the initial bundle. The \`sourceLocale\` catalog is also lazy — the
service uses the \`sourceLocale\` string literal until the first
\`activate(sourceLocale)\` call resolves.
        `,
      },
      {
        id: 'when-it-loads',
        title: 'When does it load?',
        markdown: `
\`LinguiService\` calls the loader on **first** \`activate(locale)\` for
each locale. Subsequent activations of the same locale skip the loader
(the service keeps a \`loaded\` set internally). The \`loading\` signal
on the service is \`true\` while the in-flight loader is running — bind
to it for a "switching language…" spinner.

A failed loader rejects the \`activate()\` promise; the service does not
half-apply the locale change.
        `,
      },
      {
        id: 'race-handling',
        title: 'Race handling',
        markdown: `
If the user clicks two language buttons quickly, \`activate()\` is
called twice. The service tracks the most recent request and discards
older in-flight ones: only the final \`activate()\` call gets to flip
the locale and resolve the \`loading\` flag. This avoids the classic
"locale snapped back to the previous one" bug.
        `,
      },
    ],
    examples: ['lazy'],
  },
  api: { sections: [] },
  examples: [{ key: 'lazy', title: 'Lazy catalog load', showCatalog: false }],
};
