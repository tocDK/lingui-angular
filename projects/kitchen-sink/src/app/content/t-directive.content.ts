import { PageContent } from '../shared/page-content.types';

export const T_DIRECTIVE_CONTENT: PageContent = {
  title: 'TDirective',
  pill: 'directive',
  overview: {
    sections: [
      {
        id: 'bare-string',
        title: 'Bare-string form',
        markdown: `
\`TDirective\` sets the host element's \`textContent\` to the translation
of a bare source string:

\`\`\`html
<button [t]="'Sign in'"></button>
\`\`\`

The selector is \`[t]\`, the input is a required signal input bound to
the source string. Source hashing matches what \`lingui compile
--typescript\` emits, so no manual ID management is needed.
        `,
      },
      {
        id: 'signal-input-reactivity',
        title: 'Signal-input reactivity via effect()',
        markdown: `
The directive subscribes to the locale signal inside an \`effect()\` set
up in \`ngOnInit\`:

\`\`\`ts
effect(() => {
  this.lingui.locale();
  this.host.nativeElement.textContent =
    lookupBareString(this.lingui.i18n, this.t());
});
\`\`\`

That effect re-runs whenever either the locale signal **or** the \`t\`
signal input changes — including in **zoneless** apps. This is the
key architectural difference from [\`TPipe\`](/pipes/t-pipe), which
depends on the host component running CD for the impure pipe to
re-evaluate.
        `,
      },
      {
        id: 'when-to-use-vs-pipe',
        title: 'When to use the directive vs the pipe',
        markdown: `
| Form         | Re-renders on locale change when… |
|--------------|------------------------------------|
| \`{{ ... \\| t }}\` | the host component runs CD |
| \`[t]="..."\`     | always — driven by \`effect()\` |
| \`{{ t$() }}\`    | always — signal read schedules CD |

Use \`[t]\` for static label text on simple elements (buttons, headings)
where you'd otherwise need the host to re-render. Use the pipe when
you also need parameter interpolation or \`$context\` / \`$id\` options.
        `,
      },
    ],
    examples: ['basic'],
  },
  api: {
    sections: [
      {
        id: 'inputs',
        title: 'Inputs',
        items: [
          {
            id: 't-input',
            signature: 't = input.required<string>()',
            description: 'Required signal input. The source string to translate. Re-binding it (e.g. `[t]="label()"`) re-runs the effect and updates the host `textContent`.',
          },
        ],
      },
      {
        id: 'host',
        title: 'Host behavior',
        items: [
          {
            id: 'text-content',
            signature: 'host.nativeElement.textContent = <translated>',
            description: 'The directive writes directly to `textContent`. Any existing children of the host element are overwritten on each effect run.',
          },
        ],
      },
    ],
  },
  examples: [{ key: 'basic', title: 'Bare string', showCatalog: true }],
};
