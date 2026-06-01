import { Component, computed, inject, signal } from '@angular/core';
import { LinguiService, TPipe } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  selector: 'app-params',
  standalone: true,
  imports: [DemoPageComponent, TPipe],
  template: `
    <app-demo-page title="params">
      <div rendered>
        <p>i18n with values: <strong>{{ greeting() }}</strong></p>
        <p>Pipe with placeholder: <strong>{{ 'Hello, {name}' | t: { name: name() } }}</strong></p>
      </div>
    </app-demo-page>
  `,
})
export default class ParamsComponent {
  private readonly lingui = inject(LinguiService);
  protected name = signal('Alice');
  // Access locale() to register reactive dependency, then use i18n._() with values
  protected greeting = computed(() => {
    this.lingui.locale(); // reactive dependency
    return this.lingui.i18n._('Hello, {name}!', { name: this.name() });
  });
}
