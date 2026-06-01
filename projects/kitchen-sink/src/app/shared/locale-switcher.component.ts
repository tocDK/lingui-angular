import { Component, inject } from '@angular/core';
import { LinguiService } from '@tocdk/lingui-angular';

@Component({
  selector: 'app-locale-switcher',
  standalone: true,
  template: `
    @for (l of lingui.locales; track l) {
      <button (click)="lingui.activate(l)" [disabled]="lingui.locale() === l">{{ l }}</button>
    }
  `,
})
export class LocaleSwitcherComponent {
  protected readonly lingui = inject(LinguiService);
}
