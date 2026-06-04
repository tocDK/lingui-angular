import { Component, computed, inject, signal } from '@angular/core';
import { LinguiService, TPluralPipe } from '@tocdk/lingui-angular';
import { formats } from '@lingui/core';

@Component({
  selector: 'lingui-example-plural',
  standalone: true,
  imports: [TPluralPipe],
  template: `
    <p style="font-size:.875rem;color:#666">
      Note: rule values (<code>'# item'</code>, <code>'# items'</code>) are literal English here —
      they are not auto-translated by the pipe. This route demonstrates CLDR plural-form selection
      and <code>#</code>-substitution. To localize the rule values, the catalog needs the full
      plural-form string per locale (Lingui supports this via the macro's plural syntax).
    </p>
    <p>
      <label>Count:
        <input type="number" [value]="count()" (input)="count.set(+$any($event.target).value)" />
      </label>
    </p>
    <p>i18n runtime plural: <strong>{{ pluralTs() }}</strong></p>
    <p>| tPlural pipe: <strong>{{ count() | tPlural: { one: '# item', other: '# items' } }}</strong></p>
  `,
})
export class PluralExample {
  private readonly lingui = inject(LinguiService);
  protected count = signal(1);
  protected pluralTs = computed(() => {
    const locale = this.lingui.locale();
    const n = this.count();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    const form: string = formats.plural([locale], false, n, { one: '# item', other: '# items' } as any);
    return form.replace(/#/g, String(n));
  });
}
