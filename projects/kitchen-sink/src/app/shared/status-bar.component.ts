import { Component, inject } from '@angular/core';
import { LinguiService } from '@tocdk/lingui-angular';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  template: `
    <span class="status-bar">
      active: <strong>{{ lingui.locale() }}</strong>
      · loading: {{ lingui.loading() }}
      · source: {{ lingui.sourceLocale }}
    </span>
  `,
  styles: [
    `
      .status-bar {
        font-size: 0.85rem;
        opacity: 0.85;
      }
    `,
  ],
})
export class StatusBarComponent {
  protected readonly lingui = inject(LinguiService);
}
