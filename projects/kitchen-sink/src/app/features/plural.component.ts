import { Component, computed, inject, signal } from '@angular/core';
import { LinguiService, TPluralPipe } from '@tocdk/lingui-angular';
import { formats } from '@lingui/core';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  selector: 'app-plural',
  standalone: true,
  imports: [DemoPageComponent, TPluralPipe],
  template: `
    <app-demo-page title="plural">
      <div rendered>
        <p>
          <label>Count:
            <input type="number" [value]="count()" (input)="count.set(+$any($event.target).value)" />
          </label>
        </p>
        <p>i18n runtime plural: <strong>{{ pluralTs() }}</strong></p>
        <p>| tPlural pipe: <strong>{{ count() | tPlural: { one: '# item', other: '# items' } }}</strong></p>
      </div>
    </app-demo-page>
  `,
})
export default class PluralComponent {
  private readonly lingui = inject(LinguiService);
  protected count = signal(1);
  protected pluralTs = computed(() => {
    const locale = this.lingui.locale();
    const n = this.count();
    const form = formats.plural([locale], false, n, { one: '# item', other: '# items' } as never);
    return (form as string).replace(/#/g, String(n));
  });
}
