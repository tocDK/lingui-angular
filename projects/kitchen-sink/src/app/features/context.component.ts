import { Component, computed, inject } from '@angular/core';
import { LinguiService, TPipe } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  selector: 'app-context',
  standalone: true,
  imports: [DemoPageComponent, TPipe],
  template: `
    <app-demo-page title="context">
      <div rendered>
        <p>Verb (service): <strong>{{ verb() }}</strong></p>
        <p>Adjective (service): <strong>{{ adj() }}</strong></p>
        <p>Verb (pipe): <strong>{{ 'Open' | t: { $context: 'verb' } }}</strong></p>
        <p>Adjective (pipe): <strong>{{ 'Open' | t: { $context: 'adjective' } }}</strong></p>
      </div>
    </app-demo-page>
  `,
})
export default class ContextComponent {
  private readonly lingui = inject(LinguiService);
  protected verb = computed(() =>
    this.lingui.t({ message: 'Open', context: 'verb' }),
  );
  protected adj = computed(() =>
    this.lingui.t({ message: 'Open', context: 'adjective' }),
  );
}
