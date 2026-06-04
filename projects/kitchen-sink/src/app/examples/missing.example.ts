import { Component, inject } from '@angular/core';
import { LinguiService, TPipe } from '@tocdk/lingui-angular';

@Component({
  selector: 'lingui-example-missing',
  standalone: true,
  imports: [TPipe],
  template: `
    <p>
      The string below is intentionally absent from <code>da.po</code> — switch to DA
      and watch it fall back to the English source string.
    </p>
    <p><em>Active locale: {{ lingui.locale() }}</em></p>
    <p>{{ 'this is deliberately untranslated' | t }}</p>
  `,
})
export class MissingExample {
  // Reading lingui.locale() in the template registers a reactive dep so host CD
  // re-runs on locale change — without that, the sibling | t pipe stays frozen.
  protected readonly lingui = inject(LinguiService);
}
