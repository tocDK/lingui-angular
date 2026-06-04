import { PageContent } from '../shared/page-content.types';

export const CHANGE_DETECTION_CONTENT: PageContent = {
  title: 'Change detection',
  pill: 'guide',
  overview: {
    sections: [
      {
        id: 'zoneless-primer',
        title: 'Zoneless primer',
        markdown: `
\`@tocdk/lingui-angular\` is built signal-first. It does not depend on
zone.js and works in fully zoneless apps. The active locale is a
\`Signal<string>\`, and every API reads it the way Angular expects:

- \`| t\` pipe — reads \`lingui.locale()\` inside an impure-pipe
  \`transform()\`.
- \`[t]\` directive — reads \`lingui.locale()\` inside an \`effect()\`.
- \`t$(...)\` — wraps the read in a \`computed()\`.

The fundamental rule is the usual signals one: **a UI surface re-renders
when a signal it reads changes**. The library only has to make sure
each surface reads \`locale\` somewhere.
        `,
      },
      {
        id: 'why-t-dollar-in-templates',
        title: 'Why `t$` matters in templates',
        markdown: `
In a zoneless app, an \`OnPush\` (or default) component re-renders only
when a signal it reads — or one of its input signals — changes. If you
have a class field translated once with \`lingui.t('Hello')\`, it's a
plain string. The component has no way to know that string is now stale
when the user switches language.

\`t$()\` solves this by returning a \`Signal<string>\` that reads the
locale signal internally. Storing it as a field and reading it in the
template (\`{{ greeting() }}\`) registers the component as a consumer of
that signal — Angular schedules CD for it on locale change, and the
binding re-evaluates.
        `,
      },
      {
        id: 'the-footgun',
        title: 'The footgun: wrapping `t()` in `computed()`',
        markdown: `
\`\`\`ts
// BAD — does NOT re-run on locale change.
readonly greeting = computed(() => this.lingui.t('Hello'));
\`\`\`

Plain \`lingui.t()\` reads the catalog directly and never touches the
locale signal. The \`computed\` therefore has no signal dependencies and
runs exactly once.

The fix is to use \`t$()\` — which is the same shape, but registers the
dependency for you:

\`\`\`ts
readonly greeting = this.lingui.t$('Hello');
\`\`\`

If you genuinely need a hand-rolled \`computed\` (e.g. combining
translation with other state), read \`lingui.locale()\` inside it
yourself:

\`\`\`ts
readonly greeting = computed(() => {
  this.lingui.locale();          // register the dep
  const base = this.lingui.t('Hello');
  return \`\${base}, \${this.user()?.name ?? 'friend'}\`;
});
\`\`\`
        `,
      },
    ],
    examples: ['cd'],
  },
  api: { sections: [] },
  examples: [{ key: 'cd', title: 'Zoneless re-render', showCatalog: false }],
};
