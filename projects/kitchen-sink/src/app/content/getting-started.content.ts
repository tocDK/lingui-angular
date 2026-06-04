import { PageContent } from '../shared/page-content.types';

export const GETTING_STARTED_CONTENT: PageContent = {
  title: 'Getting started',
  pill: 'guide',
  overview: {
    sections: [
      {
        id: 'install',
        title: 'Install',
        markdown: `
\`@tocdk/lingui-angular\` ships via GitHub install — there is no npm registry
publish:

\`\`\`bash
npm i github:tocDK/lingui-angular#v0.2.0
\`\`\`

The library has zero runtime dependencies of its own. Lingui's runtime
(\`@lingui/core\`) is a peer dependency and supplies the \`I18n\` instance,
\`MessageDescriptor\` type, and CLDR plural formats used internally.
        `,
      },
      {
        id: 'provide',
        title: 'Provide the library',
        markdown: `
Bootstrap your app with \`provideLingui()\`:

\`\`\`ts
import { provideLingui } from '@tocdk/lingui-angular';

bootstrapApplication(AppComponent, {
  providers: [
    provideLingui({
      sourceLocale: 'en',
      locales: ['en', 'da'],
      loader: async (locale) => import(\`./locales/\${locale}\`),
    }),
  ],
});
\`\`\`

The \`loader\` returns a module exposing a \`messages\` object — the shape
\`lingui compile --typescript\` produces. See the [SSR + provider](/ssr/provide-lingui-ssr)
page for the full \`LinguiConfig\` shape.
        `,
      },
      {
        id: 'use',
        title: 'Use it',
        markdown: `
Three ways to translate, each backed by the same \`LinguiService\`:

\`\`\`html
<!-- pipe form (bare string) -->
<h1>{{ 'Welcome' | t }}</h1>

<!-- directive form (sets textContent) -->
<button [t]="'Sign in'"></button>

<!-- service form (reactive Signal) -->
{{ greeting() }}
\`\`\`

\`\`\`ts
class WelcomeComponent {
  private readonly lingui = inject(LinguiService);
  protected greeting = this.lingui.t$('Hello');
}
\`\`\`

For details, see [LinguiService](/services/lingui-service),
[TPipe](/pipes/t-pipe), and [TDirective](/directives/t-directive).
        `,
      },
    ],
    examples: [],
  },
  api: { sections: [] },
  examples: [],
};
