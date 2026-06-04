import { Component, inject, signal } from '@angular/core';
import { LinguiService } from '@tocdk/lingui-angular';

@Component({
  selector: 'app-example-lazy',
  standalone: true,
  imports: [],
  template: `
    <p>The Danish catalog is only fetched when this route is first visited.</p>
    @if (loaded()) {
      <p>DA catalog ready. <button (click)="activateDa()">Activate Danish</button></p>
    } @else {
      <p><em>Loading da catalog…</em></p>
    }
    <p>Current locale: <strong>{{ lingui.locale() }}</strong></p>
  `,
})
export class LazyExample {
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
