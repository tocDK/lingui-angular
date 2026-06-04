import { Component } from '@angular/core';
import { TPipe } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  selector: 'app-missing',
  standalone: true,
  imports: [DemoPageComponent, TPipe],
  template: `
    <app-demo-page title="missing">
      <div rendered>
        <p>
          The string below is intentionally absent from <code>da.po</code> — switch to DA
          and watch it fall back to the English source string.
        </p>
        <p>{{ 'this is deliberately untranslated' | t }}</p>
      </div>
    </app-demo-page>
  `,
})
export default class MissingComponent {}
