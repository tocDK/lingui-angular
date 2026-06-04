import { Component, input } from '@angular/core';

import { ApiItem } from './page-content.types';
import { MarkdownRendererComponent } from './markdown-renderer.component';

/**
 * Renders one API entry (member of the `Api` tab): the exact TypeScript
 * signature plus a short markdown description. The optional `example`
 * field on `ApiItem` is intentionally NOT rendered in v1 — wiring an
 * inline mini-example requires a component-key → standalone-class
 * resolver that arrives with Task 4. The field stays in the type so a
 * later iteration can light it up without re-authoring content.
 */
@Component({
  selector: 'app-api-item-card',
  standalone: true,
  imports: [MarkdownRendererComponent],
  template: `
    <article class="api-item" [id]="item().id">
      <code class="signature">{{ item().signature }}</code>
      <app-markdown-renderer [source]="item().description" />
    </article>
  `,
})
export class ApiItemCardComponent {
  readonly item = input.required<ApiItem>();
}
