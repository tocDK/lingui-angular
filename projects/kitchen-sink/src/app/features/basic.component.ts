import { Component, computed, inject } from '@angular/core';
import { LinguiService, TPipe, TDirective } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  selector: 'app-basic',
  standalone: true,
  imports: [DemoPageComponent, TPipe, TDirective],
  template: `
    <app-demo-page title="basic">
      <div rendered>
        <p>LinguiService.t(): <strong>{{ greeting() }}</strong></p>
        <h3>{{ 'Welcome' | t }}</h3>
        <button [t]="'About'"></button>
      </div>
    </app-demo-page>
  `,
})
export default class BasicComponent {
  private readonly lingui = inject(LinguiService);
  protected greeting = computed(() => this.lingui.t('Hello'));
}
