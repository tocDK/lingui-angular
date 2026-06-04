import { Component, computed, inject, signal } from '@angular/core';
import { LinguiService, TPipe } from '@tocdk/lingui-angular';

@Component({
  selector: 'app-example-params',
  standalone: true,
  imports: [TPipe],
  template: `
    <p>i18n with values: <strong>{{ greeting() }}</strong></p>
    <p>Pipe with placeholder: <strong>{{ 'Hello, {name}' | t: { name: name() } }}</strong></p>
  `,
})
export class ParamsExample {
  private readonly lingui = inject(LinguiService);
  protected name = signal('Alice');
  // Access locale() to register reactive dependency, then use i18n._() with values
  protected greeting = computed(() => {
    this.lingui.locale(); // reactive dependency
    return this.lingui.i18n._('Hello, {name}!', { name: this.name() });
  });
}
