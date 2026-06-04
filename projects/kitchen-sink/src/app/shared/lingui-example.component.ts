import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  PLATFORM_ID,
  Type,
} from '@angular/core';
import { NgComponentOutlet, isPlatformBrowser } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-ini';

import { SOURCES } from '../examples/sources.generated';
import { provideExampleLingui } from './example-lingui.config';
import { LocaleSwitcherComponent } from './locale-switcher.component';

/**
 * Reusable example card.
 *
 * Provides its OWN `LinguiService` via `provideExampleLingui()`, so
 * each card has an independent locale. Switching DA on one card no
 * longer flips locale on every other card. The card's locale switcher
 * (in the header) and the example component rendered via
 * `*ngComponentOutlet` both inject the card-scoped LinguiService.
 *
 * The example is rendered via `*ngComponentOutlet` inside the card's
 * template (NOT via `<ng-content>`) so that providers declared on this
 * component reach it through the injector lookup.
 */
@Component({
  selector: 'app-lingui-example',
  standalone: true,
  imports: [
    NgComponentOutlet,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    LocaleSwitcherComponent,
  ],
  providers: [...provideExampleLingui()],
  template: `
    <mat-card appearance="outlined" class="example-card" [id]="sourceKey()">
      <div class="example-header">
        <span class="title">{{ title() }}</span>
        <span class="spacer"></span>
        <app-locale-switcher class="example-locale-switcher" />
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
        <ng-container *ngComponentOutlet="exampleComponent()" />
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
  readonly exampleComponent = input.required<Type<unknown>>();
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
