import { Component, TransferState, inject, makeStateKey, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DEFAULT_SSR_TRANSFER_KEY, LinguiService, TPipe } from '@tocdk/lingui-angular';
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
        <p>Catalog hydrated from TransferState: <strong>{{ hydratedFromTransferState }}</strong></p>
        <p>{{ 'Server-side rendering demo' | t }}</p>
        <p><em>View page source — the translated content above is already in the HTML, no client-side fetch.</em></p>
      </div>
    </app-demo-page>
  `,
})
export default class SsrComponent {
  protected readonly where = isPlatformBrowser(inject(PLATFORM_ID)) ? 'client' : 'server';
  protected readonly lingui = inject(LinguiService);
  // On the client, if the TransferState had a catalog payload, the LinguiService
  // constructor consumed it during hydration. We can detect this by checking
  // whether the key was present at bootstrap.
  protected readonly hydratedFromTransferState: 'yes (no fetch)' | 'no' | 'n/a (server)';

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      this.hydratedFromTransferState = 'n/a (server)';
    } else {
      const state = inject(TransferState);
      const key = makeStateKey<unknown>(DEFAULT_SSR_TRANSFER_KEY);
      this.hydratedFromTransferState = state.hasKey(key) ? 'yes (no fetch)' : 'no';
    }
  }
}
