import {
  afterNextRender,
  Component,
  DestroyRef,
  inject,
  input,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

interface TocItem {
  id: string;
  title: string;
}

/**
 * Right-rail "On this page" table of contents. The active entry is the one
 * whose target element is currently near the top of the viewport — driven by
 * an `IntersectionObserver` with `rootMargin: '-20% 0px -60% 0px'` so the
 * "active" band sits roughly across the top fifth of the visible area.
 *
 * SSR-safe: the observer is only constructed in a browser context, after the
 * first DOM paint (`afterNextRender`). Cleanup runs on destroy.
 */
@Component({
  selector: 'app-page-contents',
  standalone: true,
  imports: [RouterLink],
  template: `
    <aside class="page-contents">
      <header>Page contents</header>
      <ul>
        @for (item of items(); track item.id) {
          <li [class.active]="item.id === activeId()">
            <a [routerLink]="[]" [fragment]="item.id">{{ item.title }}</a>
          </li>
        }
      </ul>
    </aside>
  `,
})
export class PageContentsComponent {
  readonly items = input.required<TocItem[]>();

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);

  protected readonly activeId = signal<string>('');

  constructor() {
    if (!this.isBrowser) return;
    afterNextRender(() => {
      const ids = new Set(this.items().map((i) => i.id));
      const elements: HTMLElement[] = [];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) elements.push(el);
      });
      if (elements.length === 0) return;

      const observer = new IntersectionObserver(
        (entries) => {
          // Prefer the first entry currently intersecting the active band.
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort(
              (a, b) =>
                a.target.getBoundingClientRect().top -
                b.target.getBoundingClientRect().top,
            );
          if (visible.length > 0) {
            const id = (visible[0].target as HTMLElement).id;
            if (id) this.activeId.set(id);
          }
        },
        { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
      );
      elements.forEach((el) => observer.observe(el));
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
