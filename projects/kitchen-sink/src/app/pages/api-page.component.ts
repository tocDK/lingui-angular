import {
  afterNextRender,
  Component,
  computed,
  inject,
  input,
  signal,
  Type,
} from '@angular/core';
import { NgComponentOutlet, ViewportScroller } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';

import { ApiItemCardComponent } from '../shared/api-item-card.component';
import { LinguiExampleComponent } from '../shared/lingui-example.component';
import { MarkdownRendererComponent } from '../shared/markdown-renderer.component';
import { PageContentsComponent } from '../shared/page-contents.component';
import { PageContent } from '../shared/page-content.types';

import { EXAMPLE_COMPONENTS } from '../examples';

/** Tab labels indexed by `tabIndex()`. */
const TAB_FRAGMENTS = ['overview', 'api', 'examples'] as const;
type TabFragment = (typeof TAB_FRAGMENTS)[number];

interface TocItem {
  id: string;
  title: string;
}

/**
 * Per-route documentation shell. Renders three `mat-tab` slots — Overview,
 * API, Examples — driven by a `PageContent` input. Each tab body uses
 * `<ng-template matTabContent>` so only the active tab's DOM (and its
 * `IntersectionObserver`-driven TOC) is live at a time.
 *
 * Route-fragment ↔ tab sync:
 *   - On first paint, read `route.snapshot.fragment` and map it to a tab
 *     index. `#overview` / `#api` / `#examples` map directly; any other
 *     fragment is matched against the sections / example keys of each tab.
 *   - On user-driven tab change, `replaceUrl`-update the fragment.
 *   - After the new tab content is in the DOM, call
 *     `viewportScroller.scrollToAnchor(fragment)` so deep links like
 *     `#reactivity-contract` land on the right `<section>`.
 */
@Component({
  selector: 'app-api-page',
  standalone: true,
  imports: [
    NgComponentOutlet,
    MatTabsModule,
    ApiItemCardComponent,
    LinguiExampleComponent,
    MarkdownRendererComponent,
    PageContentsComponent,
  ],
  template: `
    <header class="page-header">
      <span class="pill" [attr.data-pill]="content().pill">{{
        content().pill
      }}</span>
      <h1>{{ content().title }}</h1>
    </header>

    <mat-tab-group
      [selectedIndex]="tabIndex()"
      (selectedIndexChange)="onTabChange($event)"
      mat-stretch-tabs="false"
      [preserveContent]="true"
      class="page-tabs"
    >
      <mat-tab label="Overview">
        <ng-template matTabContent>
          <div class="page-body">
            <div class="page-main">
              @for (section of content().overview.sections; track section.id) {
                <section [id]="section.id">
                  <h2>{{ section.title }}</h2>
                  <app-markdown-renderer [source]="section.markdown" />
                </section>
              }
              @for (key of content().overview.examples; track key) {
                <app-lingui-example
                  [sourceKey]="key"
                  [title]="exampleTitle(key)"
                >
                  <ng-container
                    *ngComponentOutlet="exampleComponent(key)!"
                  />
                </app-lingui-example>
              }
            </div>
            <app-page-contents [items]="overviewItems()" />
          </div>
        </ng-template>
      </mat-tab>

      <mat-tab label="API">
        <ng-template matTabContent>
          <div class="page-body">
            <div class="page-main">
              @for (section of content().api.sections; track section.id) {
                <section [id]="section.id">
                  <h2>{{ section.title }}</h2>
                  @for (item of section.items; track item.id) {
                    <app-api-item-card [item]="item" />
                  }
                </section>
              }
            </div>
            <app-page-contents [items]="apiItems()" />
          </div>
        </ng-template>
      </mat-tab>

      <mat-tab label="Examples">
        <ng-template matTabContent>
          <div class="page-body">
            <div class="page-main">
              @for (ex of content().examples; track ex.key) {
                <app-lingui-example
                  [sourceKey]="ex.key"
                  [title]="ex.title"
                  [showCatalog]="ex.showCatalog ?? false"
                  [defaultExpanded]="true"
                >
                  <ng-container
                    *ngComponentOutlet="exampleComponent(ex.key)!"
                  />
                </app-lingui-example>
              }
            </div>
            <app-page-contents [items]="examplesItems()" />
          </div>
        </ng-template>
      </mat-tab>
    </mat-tab-group>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .page-header {
        padding: 1rem 1.5rem 0.5rem;
        display: flex;
        align-items: baseline;
        gap: 0.75rem;
      }
      .page-header .pill {
        display: inline-block;
        padding: 0.15rem 0.6rem;
        border-radius: 999px;
        background: var(--mat-sys-secondary-container);
        color: var(--mat-sys-on-secondary-container);
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .page-header h1 {
        font-size: 1.75rem;
        font-weight: 500;
        margin: 0;
      }

      .page-tabs {
        padding: 0 1.5rem;
      }

      .page-body {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 16rem;
        gap: 2rem;
        padding: 1.5rem;
      }

      .page-main {
        min-width: 0;
      }

      @media (max-width: 1024px) {
        .page-body {
          grid-template-columns: minmax(0, 1fr);
        }
        .page-body page-contents {
          display: none;
        }
      }
    `,
  ],
})
export class ApiPageComponent {
  readonly content = input.required<PageContent>();

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly viewportScroller = inject(ViewportScroller);

  protected readonly tabIndex = signal<number>(0);

  /** Right-rail TOC items for each tab — derived from `content()`. */
  protected readonly overviewItems = computed<TocItem[]>(() => {
    const c = this.content();
    const sectionItems: TocItem[] = c.overview.sections.map((s) => ({
      id: s.id,
      title: s.title,
    }));
    const exampleItems: TocItem[] = c.overview.examples.map((key) => ({
      id: key,
      title: this.exampleTitle(key),
    }));
    return [...sectionItems, ...exampleItems];
  });

  protected readonly apiItems = computed<TocItem[]>(() =>
    this.content().api.sections.map((s) => ({ id: s.id, title: s.title })),
  );

  protected readonly examplesItems = computed<TocItem[]>(() =>
    this.content().examples.map((e) => ({ id: e.key, title: e.title })),
  );

  constructor() {
    // Initial sync: derive the tab from the route fragment, then scroll to
    // the sub-anchor (if any) after the active tab content has been rendered.
    afterNextRender(() => {
      const fragment = this.route.snapshot.fragment;
      const initialTab = this.resolveTabFromFragment(fragment);
      if (initialTab !== this.tabIndex()) {
        this.tabIndex.set(initialTab);
      }
      this.scrollToFragmentAfterRender(fragment);
    });
  }

  /** ngComponentOutlet target — `EXAMPLE_COMPONENTS[key]` or undefined. */
  protected exampleComponent(key: string): Type<unknown> | undefined {
    return EXAMPLE_COMPONENTS[key];
  }

  /** Resolve a human title for an example key — looks at `content().examples`. */
  protected exampleTitle(key: string): string {
    return this.content().examples.find((e) => e.key === key)?.title ?? key;
  }

  protected onTabChange(index: number): void {
    this.tabIndex.set(index);
    const fragment: TabFragment = TAB_FRAGMENTS[index] ?? 'overview';
    void this.router.navigate([], {
      relativeTo: this.route,
      fragment,
      replaceUrl: true,
    });
    // After the tab content is rendered, jump to the anchor (the tab name
    // itself is fine as a scroll target — page-header always exists).
    this.scrollToFragmentAfterRender(fragment);
  }

  /**
   * Map a route fragment to a tab index. Order of precedence:
   *   1. Explicit tab name (`overview`, `api`, `examples`).
   *   2. Anchor matching an Overview section id or overview-example key.
   *   3. Anchor matching an API section / item id.
   *   4. Anchor matching an Examples entry key.
   *   5. Fallback: 0 (Overview).
   */
  private resolveTabFromFragment(fragment: string | null | undefined): number {
    if (!fragment) return 0;
    const fragIndex = TAB_FRAGMENTS.indexOf(fragment as TabFragment);
    if (fragIndex >= 0) return fragIndex;

    const c = this.content();

    // Overview matches: section ids OR inline-example keys.
    const overviewIds = new Set<string>([
      ...c.overview.sections.map((s) => s.id),
      ...c.overview.examples,
    ]);
    if (overviewIds.has(fragment)) return 0;

    // API matches: section ids OR item ids inside each section.
    const apiIds = new Set<string>();
    c.api.sections.forEach((s) => {
      apiIds.add(s.id);
      s.items.forEach((i) => apiIds.add(i.id));
    });
    if (apiIds.has(fragment)) return 1;

    // Examples matches: example entry keys.
    const exampleIds = new Set<string>(c.examples.map((e) => e.key));
    if (exampleIds.has(fragment)) return 2;

    return 0;
  }

  /**
   * Schedule a `viewportScroller.scrollToAnchor` for after the next render so
   * that the tab body has actually been inserted into the DOM. If the
   * fragment matches a tab name (overview/api/examples) we skip the scroll —
   * there's no in-page anchor to target.
   */
  private scrollToFragmentAfterRender(
    fragment: string | null | undefined,
  ): void {
    if (!fragment) return;
    if (TAB_FRAGMENTS.includes(fragment as TabFragment)) return;
    afterNextRender(() => {
      this.viewportScroller.scrollToAnchor(fragment);
    });
  }
}
