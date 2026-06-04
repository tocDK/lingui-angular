import { Component, inject } from '@angular/core';
import { LinguiService, TPipe } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  selector: 'app-explicit-id',
  standalone: true,
  imports: [DemoPageComponent, TPipe],
  template: `
    <app-demo-page title="explicit-id">
      <div rendered>
        <p>service (id descriptor): <strong>{{ welcomeTs() }}</strong></p>
        <p>pipe (\$id option): <strong>{{ 'Welcome' | t: { $id: 'auth.welcome' } }}</strong></p>
      </div>
    </app-demo-page>
  `,
})
export default class ExplicitIdComponent {
  private readonly lingui = inject(LinguiService);
  // Use t$ (not computed+t) so the template registers a locale-signal dep —
  // without that, host CD never runs on locale change and the sibling | t pipe
  // stays frozen.
  protected welcomeTs = this.lingui.t$({
    id: 'auth.welcome',
    message: 'Welcome',
  });
}
