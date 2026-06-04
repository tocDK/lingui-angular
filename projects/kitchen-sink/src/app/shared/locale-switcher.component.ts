import { Component, inject } from '@angular/core';
import {
  MatButtonToggleModule,
  MatButtonToggleChange,
} from '@angular/material/button-toggle';
import { LinguiService } from '@tocdk/lingui-angular';

@Component({
  selector: 'app-locale-switcher',
  standalone: true,
  imports: [MatButtonToggleModule],
  template: `
    <mat-button-toggle-group
      [value]="lingui.locale()"
      (change)="onChange($event)"
      aria-label="Locale"
      hideSingleSelectionIndicator
    >
      @for (l of lingui.locales; track l) {
        <mat-button-toggle [value]="l">{{ l.toUpperCase() }}</mat-button-toggle>
      }
    </mat-button-toggle-group>
  `,
})
export class LocaleSwitcherComponent {
  protected readonly lingui = inject(LinguiService);

  protected onChange(event: MatButtonToggleChange): void {
    this.lingui.activate(event.value);
  }
}
