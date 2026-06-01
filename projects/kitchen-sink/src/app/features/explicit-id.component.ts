import { Component, computed, inject } from '@angular/core';
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
  protected welcomeTs = computed(() =>
    this.lingui.t({ id: 'auth.welcome', message: 'Welcome' }),
  );
}
