import { PageContent } from '../shared/page-content.types';

export const T_PIPE_CONTENT: PageContent = {
  title: 'TPipe',
  pill: 'pipe',
  overview: {
    sections: [
      {
        id: 'bare-string',
        title: 'Bare-string form',
        markdown: `
The everyday form. Pass the source string straight through the pipe:

\`\`\`html
<h1>{{ 'Welcome' | t }}</h1>
\`\`\`

Behind the scenes, \`TPipe\` hashes the source so the runtime catalog
lookup matches what \`lingui compile --typescript\` emits — you don't
have to manage message IDs by hand.
        `,
      },
      {
        id: 'with-options',
        title: 'Options: $context, $id, parameters',
        markdown: `
The pipe takes an options object as its second argument:

\`\`\`html
<!-- parameters: any non-$ key is a placeholder value -->
<p>{{ 'Hello {name}' | t: { name: user.name } }}</p>

<!-- disambiguation: same source, different meanings -->
<button>{{ 'Right' | t: { $context: 'direction' } }}</button>
<span>{{ 'Right' | t: { $context: 'correct' } }}</span>

<!-- explicit ID: bypass source-hashing -->
<p>{{ 'fallback source' | t: { $id: 'app.welcome.headline' } }}</p>
\`\`\`

The \`TPipeOptions\` shape:

\`\`\`ts
export interface TPipeOptions {
  $context?: string;
  $id?: string;
  [placeholder: string]: unknown;
}
\`\`\`

When \`$id\` is present the source string is passed through as a fallback
\`message\` only. Otherwise the source is hashed with \`$context\` per
Lingui's contract.
        `,
      },
      {
        id: 'reactivity-host-cd-trap',
        title: 'Reactivity: the host-CD trap',
        markdown: `
\`TPipe\` is registered as \`pure: false\` so Angular re-runs \`transform()\`
on every change detection cycle of the host component. The pipe reads
\`lingui.locale()\` to register a reactive dep, so under default CD it
re-evaluates on locale change as soon as the host is checked.

In **zoneless** apps, a locale change doesn't automatically schedule CD
on every component. If a component reads the pipe but doesn't have its
own signal-driven reason to re-render, the pipe output can go stale.

Two fixes:

1. Use \`{{ greeting() }}\` against a stored \`t$()\` signal in the class
   — the signal read schedules CD for you.
2. Use \`[t]\` directive form instead — see [TDirective](/directives/t-directive),
   which subscribes via \`effect()\` and re-renders without depending on
   host CD.
        `,
      },
      {
        id: 'parameterized-fallback',
        title: 'Parameterized msgid fallback',
        markdown: `
When a parameterized message has **no catalog entry** for the active locale,
\`TPipe\` falls back to the source string — and still interpolates the
placeholders:

\`\`\`html
<!-- 'Support session — acting as {tier} on {account}' is never extracted,
     so it always falls back to source, in every locale. -->
<p>{{ 'Support session — acting as {tier} on {account}'
      | t: { tier: 'admin', account: 'Acme Corp' } }}</p>
<!-- renders: Support session — acting as admin on Acme Corp -->
\`\`\`

This is the common shape when an app's **source locale ships no compiled
catalog** — every \`| t\` resolves via the fallback path. The fallback source
is pre-compiled internally, so interpolation works in **production** builds
too, where Lingui's runtime ICU compiler is tree-shaken out (see
[issue #21](https://github.com/tocDK/lingui-angular/issues/21)).
        `,
      },
    ],
    examples: ['basic', 'params', 'params-fallback', 'context'],
  },
  api: {
    sections: [
      {
        id: 'transform',
        title: 'transform',
        items: [
          {
            id: 'transform-signature',
            signature: 'transform(message: string, options?: TPipeOptions): string',
            description: 'Looks up `message` in the active catalog (hashing the source for ID resolution), substituting any non-`$` keys from `options` as placeholder values.',
          },
        ],
      },
      {
        id: 'options',
        title: 'TPipeOptions',
        items: [
          {
            id: 'context',
            signature: '$context?: string',
            description: 'Disambiguates two source strings with the same text but different meanings (e.g. `Right` direction vs `Right` correct).',
          },
          {
            id: 'id',
            signature: '$id?: string',
            description: 'Explicit message ID. When present, skips source-hashing and looks the ID up directly; `message` becomes the fallback only.',
          },
          {
            id: 'placeholders',
            signature: '[placeholder: string]: unknown',
            description: 'Any other key is treated as a placeholder value — e.g. `{ name: user.name }` substitutes `{name}` in the message.',
          },
        ],
      },
    ],
  },
  examples: [
    { key: 'basic', title: 'Bare string', showCatalog: true },
    { key: 'params', title: 'Parameters', showCatalog: false },
    { key: 'params-fallback', title: 'Parameters (msgid fallback)', showCatalog: false },
    { key: 'context', title: '$context', showCatalog: true },
    { key: 'explicit-id', title: '$id', showCatalog: true },
  ],
};
