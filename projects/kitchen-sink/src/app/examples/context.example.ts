import { Component, inject } from '@angular/core';
import { LinguiService, TPipe } from '@tocdk/lingui-angular';

// Context disambiguation: at runtime, Lingui uses the message string as the
// catalog key (since there's no Babel macro transform in esbuild). The $context
// option in the | t pipe is an extraction hint only — it does not alter runtime
// lookup. To demonstrate the concept, we show both pipe usage and direct i18n._().
@Component({
  selector: 'lingui-example-context',
  standalone: true,
  imports: [TPipe],
  template: `
    <p>
      Context disambiguation routes the same source word to different translations.
      Switch to FR — both "Open" strings render as <em>Ouvrir</em> (same key, no
      compile-time transform in the esbuild pipeline).
    </p>
    <p>Verb (service): <strong>{{ verb() }}</strong></p>
    <p>Adjective (service): <strong>{{ adj() }}</strong></p>
    <p>Verb (pipe <code>$context</code> hint): <strong>{{ 'Open' | t: { $context: 'verb' } }}</strong></p>
    <p>Adjective (pipe <code>$context</code> hint): <strong>{{ 'Open' | t: { $context: 'adjective' } }}</strong></p>
  `,
})
export class ContextExample {
  private readonly lingui = inject(LinguiService);
  // Runtime: $context is extraction-only; both resolve to the same catalog key.
  // Use t$ (not computed+t) so the template registers a locale-signal dep —
  // without that, host CD never runs on locale change and sibling | t pipes
  // stay frozen.
  protected verb = this.lingui.t$('Open');
  protected adj = this.lingui.t$('Open');
}
