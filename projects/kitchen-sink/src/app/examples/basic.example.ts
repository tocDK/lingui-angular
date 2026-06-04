import { Component, inject } from '@angular/core';
import { LinguiService, TPipe, TDirective } from '@tocdk/lingui-angular';

@Component({
  selector: 'app-example-basic',
  standalone: true,
  imports: [TPipe, TDirective],
  template: `
    <p>LinguiService.t(): <strong>{{ greeting() }}</strong></p>
    <h3>{{ 'Welcome' | t }}</h3>
    <button [t]="'About'"></button>
  `,
})
export class BasicExample {
  private readonly lingui = inject(LinguiService);
  protected greeting = this.lingui.t$('Hello');
}
