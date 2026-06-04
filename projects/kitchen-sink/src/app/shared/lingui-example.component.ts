import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-ini';

import { SOURCES } from '../examples/sources.generated';

/**
 * Reusable example card. The host page provides the rendered demo via
 * `<ng-content>`; this component supplies the chrome (title bar, copy-link
 * button, source toggle) and the expandable source pane wired up to
 * `SOURCES[sourceKey()]` — both the compiled `.ts` and, when `showCatalog`
 * is set, the matching `.po` fragment, both Prism-highlighted.
 */
@Component({
  selector: 'lingui-example',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatButtonModule, MatSnackBarModule],
  template: `
    <mat-card appearance="outlined" class="example-card" [id]="sourceKey()">
      <div class="example-header">
        <span class="title">{{ title() }}</span>
        <span class="spacer"></span>
        <button
          mat-icon-button
          type="button"
          (click)="copyLink()"
          aria-label="Copy link to example"
        >
          <mat-icon>link</mat-icon>
        </button>
        <button
          mat-icon-button
          type="button"
          (click)="toggleSource()"
          [attr.aria-pressed]="expanded()"
          aria-label="Toggle source"
        >
          <mat-icon>code</mat-icon>
        </button>
      </div>
      <div class="example-demo">
        <ng-content />
      </div>
      @if (expanded() && sources(); as src) {
        <div class="example-source">
          @if (src.ts) {
            <div class="source-file">
              <header>{{ sourceKey() }}.example.ts</header>
              <pre><code
                class="language-typescript"
                [innerHTML]="highlightedTs()"
              ></code></pre>
            </div>
          }
          @if (showCatalog() && src.po) {
            <div class="source-file">
              <header>{{ sourceKey() }}.example.po</header>
              <pre><code
                class="language-ini"
                [innerHTML]="highlightedPo()"
              ></code></pre>
            </div>
          }
        </div>
      }
    </mat-card>
  `,
})
export class LinguiExampleComponent {
  readonly title = input.required<string>();
  readonly sourceKey = input.required<string>();
  readonly showCatalog = input<boolean>(false);
  readonly defaultExpanded = input<boolean>(false);

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly snackbar = inject(MatSnackBar);

  protected readonly expanded = linkedSignal<boolean>(() =>
    this.defaultExpanded(),
  );

  protected readonly sources = computed(() => SOURCES[this.sourceKey()]);

  protected readonly highlightedTs = computed(() => {
    const ts = this.sources()?.ts ?? '';
    return Prism.highlight(ts, Prism.languages['typescript'], 'typescript');
  });

  protected readonly highlightedPo = computed(() => {
    const po = this.sources()?.po ?? '';
    return Prism.highlight(po, Prism.languages['ini'], 'ini');
  });

  protected toggleSource(): void {
    this.expanded.update((v) => !v);
  }

  protected copyLink(): void {
    if (!this.isBrowser) return;
    const url = `${location.origin}${location.pathname}#${this.sourceKey()}`;
    try {
      void navigator.clipboard?.writeText(url);
      this.snackbar.open('Link copied', 'Dismiss', { duration: 1500 });
    } catch {
      /* ignore — clipboard permission denied or unavailable */
    }
  }
}
