import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-demo-page',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <mat-card appearance="outlined" class="demo-card">
      <mat-card-header>
        <mat-card-title>{{ title }}</mat-card-title>
        @if (subtitle) {
          <mat-card-subtitle>{{ subtitle }}</mat-card-subtitle>
        }
      </mat-card-header>
      <mat-card-content class="demo-rendered">
        <ng-content select="[rendered]" />
      </mat-card-content>
    </mat-card>
  `,
})
export class DemoPageComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
}
