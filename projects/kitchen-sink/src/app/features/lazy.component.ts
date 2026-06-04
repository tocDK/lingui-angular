import { Component, inject, signal } from '@angular/core';
import { LinguiService } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  selector: 'app-lazy',
  standalone: true,
  imports: [DemoPageComponent],
  template: `
    <app-demo-page title="lazy">
      <div rendered>
        <p>The Danish catalog is only fetched when this route is first visited.</p>
        @if (loaded()) {
          <p>DA catalog ready. <button (click)="activateDa()">Activate Danish</button></p>
        } @else {
          <p><em>Loading da catalog…</em></p>
        }
        <p>Current locale: <strong>{{ lingui.locale() }}</strong></p>
      </div>
    </app-demo-page>
  `,
})
export default class LazyComponent {
  protected readonly lingui = inject(LinguiService);
  protected loaded = signal(false);

  constructor() {
    // Pre-load the da catalog so a subsequent activate('da') is instant.
    void this.lingui.activate('da').then(() => this.loaded.set(true));
  }

  protected activateDa(): void {
    void this.lingui.activate('da');
  }
}
