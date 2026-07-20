import { Component, inject, signal } from '@angular/core';
import { LinguiService, TPipe } from '@tocdk/lingui-angular';

/**
 * Parameterized **msgid-fallback** interpolation (issue #21).
 *
 * The second line's source string is *deliberately absent* from both the
 * `en` and `da` catalogs — it is never extracted, so it always hits
 * `lookupBareString` **stage 3** (the msgid-fallback path). This mirrors the
 * downstream case where an English source ships no compiled catalog and every
 * `| t` therefore falls back to its source text.
 *
 * The bug: in a **production** Angular build, Lingui's runtime ICU compiler is
 * tree-shaken out, so an uncompiled string fallback was returned verbatim and
 * the `{tier}` / `{account}` placeholders rendered literally. The fix
 * pre-compiles the fallback source in `lookupBareString`, so it interpolates
 * even without the runtime compiler.
 *
 * NOTE: do not add this string to the catalogs (`lingui extract`) — it must
 * stay uncompiled for this example to exercise the fallback path.
 */
@Component({
  selector: 'app-example-params-fallback',
  standalone: true,
  imports: [TPipe],
  template: `
    <p><em>Active locale: {{ lingui.locale() }}</em></p>
    <p>
      Translated (in catalog):
      <strong>{{ 'Hello, {name}!' | t: { name: name() } }}</strong>
    </p>
    <p>
      Msgid fallback (NOT in catalog):
      <strong>{{
        'Support session — acting as {tier} on {account}'
          | t: { tier: tier(), account: account() }
      }}</strong>
    </p>
  `,
})
export class ParamsFallbackExample {
  // Reading lingui.locale() in the template registers a reactive dep so host CD
  // re-runs on locale change — mirrors MissingExample.
  protected readonly lingui = inject(LinguiService);
  protected name = signal('Alice');
  protected tier = signal('admin');
  protected account = signal('Acme Corp');
}
