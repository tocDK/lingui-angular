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
        <p>The Spanish catalog is only fetched when this route is first visited.</p>
        @if (loaded()) {
          <p>ES catalog ready. <button (click)="activateEs()">Activate Spanish</button></p>
        } @else {
          <p><em>Loading es catalog…</em></p>
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
    // Pre-load the es catalog so a subsequent activate('es') is instant.
    void this.lingui.activate('es').then(() => this.loaded.set(true));
  }

  protected activateEs(): void {
    void this.lingui.activate('es');
  }
}
