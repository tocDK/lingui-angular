import { Component, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LinguiService, TPipe } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  selector: 'app-ssr',
  standalone: true,
  imports: [DemoPageComponent, TPipe],
  template: `
    <app-demo-page title="ssr">
      <div rendered>
        <p>Rendered on: <strong>{{ where }}</strong></p>
        <p>Active locale: <strong>{{ lingui.locale() }}</strong></p>
        <p>{{ 'Server-side rendering demo' | t }}</p>
        <p><em>In SSR mode, translated content is already in the HTML source.</em></p>
      </div>
    </app-demo-page>
  `,
})
export default class SsrComponent {
  protected readonly where = isPlatformBrowser(inject(PLATFORM_ID)) ? 'client' : 'server';
  protected readonly lingui = inject(LinguiService);
}
