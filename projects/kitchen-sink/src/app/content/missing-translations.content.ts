import { PageContent } from '../shared/page-content.types';

export const MISSING_TRANSLATIONS_CONTENT: PageContent = {
  title: 'Missing translations',
  pill: 'guide',
  overview: {
    sections: [
      {
        id: 'fallback-behavior',
        title: 'Source-fallback behavior',
        markdown: `
When a message has no catalog entry in the active locale, the runtime
returns the **source string** as-is. There is no thrown error and no
empty render — \`'Welcome' | t\` simply renders \`Welcome\` until a
matching catalog entry exists for the active locale.

This applies to all three forms:

\`\`\`html
<h1>{{ 'Welcome' | t }}</h1>      <!-- 'Welcome' if no entry -->
<button [t]="'Sign in'"></button> <!-- 'Sign in' if no entry -->
{{ greeting() }}                  <!-- 'Hello' if no entry -->
\`\`\`

Combined with \`fallbackLocales\` on \`LinguiConfig\`, you can stage
translations gradually: ship the source-locale catalog, and any string
not yet translated in the target locale renders the source.
        `,
      },
      {
        id: 'console-warning',
        title: 'The "uncompiled message" warning',
        markdown: `
On the **source locale** you may see Lingui log:

\`\`\`
[lingui] Uncompiled message detected: <text>
\`\`\`

This is expected when running without a compiled catalog for the source
locale. \`lingui compile\` produces one once translation work has
started; until then, the runtime falls back to the source string and
logs the warning. It is informational, not an error.

To suppress it during local development, run \`lingui compile\` against
your source catalog as well, even if no translation has happened — an
empty translated value still tells the runtime "this id exists".
        `,
      },
      {
        id: 'po-fragment',
        title: 'Catalog fragment example',
        markdown: `
A typical \`.po\` excerpt — note the empty \`msgstr\` produces the
source-fallback behavior:

\`\`\`ini
msgid "Welcome"
msgstr ""

msgid "Hello {name}"
msgstr "Hej {name}"
\`\`\`

The first entry falls back to \`Welcome\`; the second renders the
translated form.
        `,
      },
    ],
    examples: ['missing'],
  },
  api: { sections: [] },
  examples: [{ key: 'missing', title: 'Missing-key fallback', showCatalog: false }],
};
