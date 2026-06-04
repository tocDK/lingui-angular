import { PageContent } from '../shared/page-content.types';

export const T_PLURAL_PIPE_CONTENT: PageContent = {
  title: 'TPluralPipe',
  pill: 'pipe',
  overview: {
    sections: [
      {
        id: 'overview',
        title: 'CLDR plural-form selection',
        markdown: `
\`TPluralPipe\` picks one of CLDR's plural categories — \`zero\`, \`one\`,
\`two\`, \`few\`, \`many\`, \`other\` — based on \`count\` and the **active
locale**. The selected string is returned with every \`#\` replaced by
\`String(count)\`.

\`\`\`html
<p>{{ count | tPlural: { one: '# item', other: '# items' } }}</p>
\`\`\`

Only \`other\` is mandatory. English uses \`one\` + \`other\`; Russian uses
\`one\` + \`few\` + \`many\` + \`other\`; Japanese collapses everything to
\`other\`. The pipe reads \`lingui.locale()\` so the form is re-selected on
locale change.
        `,
      },
      {
        id: 'rule-values-not-translated',
        title: 'Rule values are not auto-translated',
        markdown: `
The strings inside \`PluralRules\` are passed through verbatim. They are
**not** looked up in the catalog. If you need them translated, build the
rules from \`lingui.t\` calls yourself:

\`\`\`ts
readonly rules = computed<PluralRules>(() => {
  this.lingui.locale();
  return {
    one: this.lingui.t('# item'),
    other: this.lingui.t('# items'),
  };
});
\`\`\`

This is intentional — \`TPluralPipe\` is a thin wrapper around CLDR
selection, not a second translation layer.
        `,
      },
    ],
    examples: ['plural'],
  },
  api: {
    sections: [
      {
        id: 'transform',
        title: 'transform',
        items: [
          {
            id: 'transform-signature',
            signature: 'transform(count: number, rules: PluralRules): string',
            description: 'Selects the CLDR plural form for `count` in the active locale, then replaces every `#` in the chosen rule with `String(count)`. Throws `TypeError` if `rules.other` is missing.',
          },
        ],
      },
      {
        id: 'rules',
        title: 'PluralRules',
        items: [
          {
            id: 'shape',
            signature: `type PluralRules = Partial<Record<'zero' | 'one' | 'two' | 'few' | 'many', string>> & { other: string }`,
            description: 'A map from CLDR plural category to the string to render. `other` is required; the rest are optional. The `#` token is substituted with the numeric count.',
          },
        ],
      },
    ],
  },
  examples: [{ key: 'plural', title: 'Plural forms', showCatalog: false }],
};
