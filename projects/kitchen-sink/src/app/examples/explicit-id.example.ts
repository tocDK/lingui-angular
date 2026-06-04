import { Component, inject } from '@angular/core';
import { LinguiService, TPipe } from '@tocdk/lingui-angular';

@Component({
  selector: 'app-example-explicit-id',
  standalone: true,
  imports: [TPipe],
  template: `
    <p>service (id descriptor): <strong>{{ welcomeTs() }}</strong></p>
    <p>pipe (\$id option): <strong>{{ 'Welcome' | t: { $id: 'auth.welcome' } }}</strong></p>
  `,
})
export class ExplicitIdExample {
  private readonly lingui = inject(LinguiService);
  // Use t$ (not computed+t) so the template registers a locale-signal dep —
  // without that, host CD never runs on locale change and the sibling | t pipe
  // stays frozen.
  protected welcomeTs = this.lingui.t$({
    id: 'auth.welcome',
    message: 'Welcome',
  });
}
