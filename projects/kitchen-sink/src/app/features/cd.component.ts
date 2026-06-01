import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { LinguiService } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  selector: 'app-cd',
  standalone: true,
  imports: [DemoPageComponent],
  template: `
    <app-demo-page title="cd">
      <div rendered>
        <p>Signal-driven change detection — updates every second without zone.js:</p>
        <p>{{ message() }}</p>
        <p><em>Locale: {{ lingui.locale() }}</em></p>
      </div>
    </app-demo-page>
  `,
})
export default class CdComponent implements OnDestroy {
  protected readonly lingui = inject(LinguiService);
  protected n = signal(0);
  protected message = computed(() => {
    this.lingui.locale(); // reactive dep so message re-evaluates on locale change
    return this.lingui.i18n._('Tick: {n}', { n: this.n() });
  });

  private readonly timer = setInterval(() => this.n.update((v) => v + 1), 1000);

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
