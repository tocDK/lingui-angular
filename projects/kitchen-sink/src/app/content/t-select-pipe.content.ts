import { PageContent } from '../shared/page-content.types';

export const T_SELECT_PIPE_CONTENT: PageContent = {
  title: 'TSelectPipe',
  pill: 'pipe',
  overview: {
    sections: [
      {
        id: 'overview',
        title: 'Discrete-value selection',
        markdown: `
\`TSelectPipe\` picks the rule whose key equals the input value, or falls
back to \`other\`. Use it for enum-like discriminators where CLDR plural
rules don't apply — gender, account status, role:

\`\`\`html
<p>
  {{ role | tSelect: { admin: 'Admin', editor: 'Editor', other: 'Member' } }}
</p>
\`\`\`

Only own properties are matched (via \`hasOwnProperty\`), so a key like
\`'constructor'\` won't accidentally hit a prototype property.
        `,
      },
      {
        id: 'other-required',
        title: '`other` is mandatory',
        markdown: `
\`SelectRules\` requires \`other\`. \`TSelectPipe\` throws \`TypeError\` if
it's missing — the contract is "match by key, or fall back to other",
not "match by key or return undefined".

\`\`\`ts
export type SelectRules = Record<string, string> & { other: string };
\`\`\`
        `,
      },
      {
        id: 'rule-values-not-translated',
        title: 'Rule values are not auto-translated',
        markdown: `
Like \`TPluralPipe\`, the strings in \`SelectRules\` are returned verbatim
and not looked up in the catalog. Pre-translate via \`lingui.t\` when
the rule values must localize themselves.
        `,
      },
    ],
    examples: ['select'],
  },
  api: {
    sections: [
      {
        id: 'transform',
        title: 'transform',
        items: [
          {
            id: 'transform-signature',
            signature: 'transform(value: string, rules: SelectRules): string',
            description: 'Returns `rules[value]` when present as an own property, otherwise `rules.other`. Reads `lingui.locale()` so the pipe re-runs on locale change. Throws `TypeError` if `rules.other` is missing.',
          },
        ],
      },
      {
        id: 'rules',
        title: 'SelectRules',
        items: [
          {
            id: 'shape',
            signature: 'type SelectRules = Record<string, string> & { other: string }',
            description: 'A map from discriminator value to the string to render. The `other` key is required and serves as the fallback when no match is found.',
          },
        ],
      },
    ],
  },
  examples: [{ key: 'select', title: 'Select rules', showCatalog: false }],
};
