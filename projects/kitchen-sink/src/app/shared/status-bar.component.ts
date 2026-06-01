import { Component, inject } from '@angular/core';
import { LinguiService } from '@tocdk/lingui-angular';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  template: `
    <small>
      active: <strong>{{ lingui.locale() }}</strong>
      · loading: {{ lingui.loading() }}
      · source: {{ lingui.sourceLocale }}
    </small>
  `,
})
export class StatusBarComponent {
  protected readonly lingui = inject(LinguiService);
}
