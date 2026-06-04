# lingui-angular v0.2.0 — Pages + Material Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@tocdk/lingui-angular` v0.2.0 — GitHub Pages auto-deploy of the kitchen-sink demo, Material 3 redesign of the demo shell, and a reactive-binding fix in `basic.component`.

**Architecture:** Library runtime code is **untouched**. All changes scoped to the `kitchen-sink` demo app + repo root config (deps, workflows). Material 3 dresses up the chrome (toolbar + sidenav + card wrappers + theme toggle); feature page internals stay bare so the demos still show what the library actually outputs.

**Tech Stack:** Angular 20 (zoneless), Angular Material 20 (Material 3), `@angular/cdk` `BreakpointObserver`, Vitest (library only — kitchen-sink intentionally has no test project), GitHub Actions `actions/deploy-pages@v4`.

**Working branch:** `toc/gh-pages-deploy` (already created off `main`)

**Spec:** `docs/superpowers/specs/2026-06-04-pages-and-material-redesign-design.md`

---

## Testing strategy (read before starting)

The kitchen-sink demo has **no vitest project** in `vitest.config.ts` and coverage is explicitly limited to `projects/lingui-angular/src/lib/**` + the extractor. This is deliberate — the demo is the demo, not production code. **Do not add a kitchen-sink test project for this branch.** Verification is by the manual local-serve flow in Task 12, then the post-merge live URL check.

The one exception: if Task 11 (`basic.component` Hello fix) feels load-bearing enough to warrant a regression test later, that's for a follow-up branch that introduces kitchen-sink test infrastructure — not this one.

---

## Task 1: Confirm build artifact path matches workflow expectation

**Why first:** the workflow in Task 13 hard-codes `dist/kitchen-sink/browser` as the artifact path. The Angular builder can emit elsewhere on different versions. Verify before writing the workflow.

**Files:** none changed in this task

- [ ] **Step 1: Make sure deps are installed (idempotent)**

```bash
cd /Users/toc/git/tivedo/lingui-angular
npm ci
```

- [ ] **Step 2: Build the library (peer for the demo)**

```bash
npm run build:lib
```

Expected: completes without error; `dist/lingui-angular/fesm2022/tocdk-lingui-angular.mjs` exists.

- [ ] **Step 3: Build the demo with the production base href**

```bash
npx ng build kitchen-sink --configuration=production --base-href "/lingui-angular/"
```

Expected: completes without error.

- [ ] **Step 4: Confirm the artifact location**

```bash
ls dist/kitchen-sink/browser/index.csr.html dist/kitchen-sink/browser/main.js
```

Expected: both files exist. (The SPA shell ships as `index.csr.html` because SSR is enabled in `angular.json` for the kitchen-sink target. The workflow in Task 13 renames it to `index.html` + `404.html`.)

**If the path differs** (e.g., `dist/kitchen-sink/` without `browser/`, or `dist/apps/kitchen-sink/`): note the actual path. Task 13 must use that path everywhere — both for `upload-pages-artifact` and the rename step.

- [ ] **Step 5: Clean the dist tree** (so later tasks start fresh)

```bash
rm -rf dist
```

No commit in this task — it's a sanity check.

---

## Task 2: Add Angular Material + CDK to root devDependencies

**Files:**
- Modify: `package.json` (root)
- Modify: `package-lock.json` (root, auto-generated)

- [ ] **Step 1: Install Material + CDK as devDependencies**

```bash
cd /Users/toc/git/tivedo/lingui-angular
npm install --save-dev @angular/material@^20 @angular/cdk@^20
```

Expected: both packages appear under `devDependencies` in `package.json`. `@angular/animations` is already present.

- [ ] **Step 2: Verify install worked**

```bash
node -e "console.log(require('@angular/material/package.json').version, require('@angular/cdk/package.json').version)"
```

Expected: two version strings, both starting with `20.`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add @angular/material and @angular/cdk to devDependencies

Both demo-only — the published library remains zero-runtime-dependency."
```

---

## Task 3: Switch styles.css → styles.scss with Material 3 theme

**Files:**
- Create: `projects/kitchen-sink/src/styles.scss`
- Delete: `projects/kitchen-sink/src/styles.css`
- Modify: `angular.json` — kitchen-sink build options (styles entry + inlineStyleLanguage)

- [ ] **Step 1: Create the new styles file**

`projects/kitchen-sink/src/styles.scss`:

```scss
@use '@angular/material' as mat;

html {
  color-scheme: light dark;

  @include mat.theme((
    color: (
      primary: mat.$rose-palette,
      tertiary: mat.$green-palette,
    ),
    typography: Roboto,
    density: 0,
  ));
}

html.dark-theme {
  color-scheme: dark;

  @include mat.theme((
    color: (
      primary: mat.$rose-palette,
      tertiary: mat.$green-palette,
      theme-type: dark,
    ),
    typography: Roboto,
    density: 0,
  ));
}

/* App-level resets */
html, body {
  margin: 0;
  height: 100%;
  background: var(--mat-sys-surface);
  color: var(--mat-sys-on-surface);
  font-family: Roboto, system-ui, sans-serif;
}

.demo-card { margin: 1rem 0; }
.demo-card mat-card-content.demo-rendered { padding-top: 1rem; }
```

- [ ] **Step 2: Delete the old CSS file**

```bash
git rm projects/kitchen-sink/src/styles.css
```

- [ ] **Step 3: Update `angular.json`**

Find `projects.kitchen-sink.architect.build.options` and:
- Change `"styles": ["projects/kitchen-sink/src/styles.css"]` → `"styles": ["projects/kitchen-sink/src/styles.scss"]`
- Add (or set) `"inlineStyleLanguage": "scss"` inside the same `options` block

If `architect.test.options` or `architect.serve.options` also reference `styles.css`, update those too.

- [ ] **Step 4: Verify the build still completes**

```bash
npm run build:lib
npx ng build kitchen-sink --configuration=development
```

Expected: build completes with no SCSS errors. (Material warnings about deprecated APIs are OK.)

- [ ] **Step 5: Commit**

```bash
git add projects/kitchen-sink/src/styles.scss angular.json
git commit -m "feat(kitchen-sink): adopt Material 3 theme via SCSS

Rose primary, sage tertiary. Light is default; html.dark-theme switches.
Material 3 system tokens (var(--mat-sys-*)) drive body background and text color."
```

---

## Task 4: Wire animations provider in main.ts (and SSR mirror)

**Why:** Angular Material 20 requires animations even with `provideZonelessChangeDetection`. `provideAnimationsAsync()` is the lazy-loading variant — smaller initial bundle, no zoneless conflicts.

**Files:**
- Modify: `projects/kitchen-sink/src/main.ts`
- Modify: `projects/kitchen-sink/src/main.server.ts`

- [ ] **Step 1: Update `main.ts`**

```ts
import { bootstrapApplication, provideClientHydration } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideLingui } from '@tocdk/lingui-angular';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideAnimationsAsync(),
    provideRouter(routes),
    provideClientHydration(),
    provideLingui({
      sourceLocale: 'en',
      locales: ['en', 'da'],
      loader: async (locale) => {
        switch (locale) {
          case 'da': return import('./locales/da');
          default:   return import('./locales/en');
        }
      },
    }),
  ],
}).catch((err) => console.error(err));
```

- [ ] **Step 2: Mirror in `main.server.ts`**

Read the current `main.server.ts` and add `provideAnimationsAsync()` to its providers array, alongside `provideServerRendering()`. The exact structure depends on what's there — keep the existing SSR-specific providers (server rendering, prerendering, etc.) and only add the animations provider.

- [ ] **Step 3: Verify dev build still works**

```bash
npx ng build kitchen-sink --configuration=development
```

Expected: build completes.

- [ ] **Step 4: Commit**

```bash
git add projects/kitchen-sink/src/main.ts projects/kitchen-sink/src/main.server.ts
git commit -m "feat(kitchen-sink): wire Material animations provider

provideAnimationsAsync() is required for Angular Material under zoneless
change detection. Async variant lazy-loads the animations bundle."
```

---

## Task 5: Add Roboto + Material Icons + theme FOUC-prevention to index.html

**Files:**
- Modify: `projects/kitchen-sink/src/index.html`

- [ ] **Step 1: Add font + icon links and FOUC guard**

Read the current `index.html`. In the `<head>`, add (after the `<title>` line):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
<script>
  // FOUC guard: apply persisted theme before Angular boots
  (function () {
    try {
      var saved = localStorage.getItem('kitchen-sink:theme');
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      var dark = saved ? saved === 'dark' : prefersDark;
      if (dark) document.documentElement.classList.add('dark-theme');
    } catch (_) { /* localStorage may throw in private mode */ }
  })();
</script>
```

- [ ] **Step 2: Verify build still works**

```bash
npx ng build kitchen-sink --configuration=development
```

- [ ] **Step 3: Commit**

```bash
git add projects/kitchen-sink/src/index.html
git commit -m "feat(kitchen-sink): preload Roboto + Material Icons; FOUC-guard theme

Inline script reads localStorage('kitchen-sink:theme') before Angular boots
so dark-mode visitors don't see a flash of the light theme."
```

---

## Task 6: Restyle DemoPageComponent with mat-card

**Files:**
- Modify: `projects/kitchen-sink/src/app/shared/demo-page.component.ts`

The current template has a `<pre><ng-content select="[source]" /></pre>` slot that no feature page uses today. Drop it; if anyone wants a source slot later it can be reintroduced via the `subtitle` mechanism or a follow-up component.

- [ ] **Step 1: Rewrite the component**

```ts
import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-demo-page',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <mat-card appearance="outlined" class="demo-card">
      <mat-card-header>
        <mat-card-title>{{ title }}</mat-card-title>
        @if (subtitle) {
          <mat-card-subtitle>{{ subtitle }}</mat-card-subtitle>
        }
      </mat-card-header>
      <mat-card-content class="demo-rendered">
        <ng-content select="[rendered]" />
      </mat-card-content>
    </mat-card>
  `,
})
export class DemoPageComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
}
```

- [ ] **Step 2: Verify dev build**

```bash
npx ng build kitchen-sink --configuration=development
```

Expected: build completes. No callers break — `title` is still the same required input, and the dropped `[source]` slot wasn't used.

- [ ] **Step 3: Commit**

```bash
git add projects/kitchen-sink/src/app/shared/demo-page.component.ts
git commit -m "feat(kitchen-sink): wrap feature pages in mat-card

Outlined card with mat-card-header (title + optional subtitle) and
mat-card-content for the rendered slot. Unused [source] slot removed."
```

---

## Task 7: Restyle LocaleSwitcherComponent with mat-button-toggle-group

**Files:**
- Modify: `projects/kitchen-sink/src/app/shared/locale-switcher.component.ts`

- [ ] **Step 1: Rewrite the component**

```ts
import { Component, inject } from '@angular/core';
import { MatButtonToggleModule, MatButtonToggleChange } from '@angular/material/button-toggle';
import { LinguiService } from '@tocdk/lingui-angular';

@Component({
  selector: 'app-locale-switcher',
  standalone: true,
  imports: [MatButtonToggleModule],
  template: `
    <mat-button-toggle-group
      [value]="lingui.locale()"
      (change)="onChange($event)"
      aria-label="Locale"
      hideSingleSelectionIndicator
    >
      @for (l of lingui.locales; track l) {
        <mat-button-toggle [value]="l">{{ l | uppercase }}</mat-button-toggle>
      }
    </mat-button-toggle-group>
  `,
})
export class LocaleSwitcherComponent {
  protected readonly lingui = inject(LinguiService);

  protected onChange(event: MatButtonToggleChange): void {
    this.lingui.activate(event.value);
  }
}
```

If `| uppercase` isn't recognized, add `CommonModule` to imports. Or replace `{{ l | uppercase }}` with `{{ l.toUpperCase() }}` to avoid the import — equivalent and one fewer module.

- [ ] **Step 2: Use the inline-toUppercase form to keep imports minimal**

Replace `{{ l | uppercase }}` with `{{ l.toUpperCase() }}` (drops the CommonModule import requirement).

- [ ] **Step 3: Verify dev build**

```bash
npx ng build kitchen-sink --configuration=development
```

- [ ] **Step 4: Commit**

```bash
git add projects/kitchen-sink/src/app/shared/locale-switcher.component.ts
git commit -m "feat(kitchen-sink): mat-button-toggle-group locale switcher

Replaces the hand-rolled disabled-button group with Material's idiomatic
'pick one of N' primitive. Binding contract with LinguiService unchanged."
```

---

## Task 8: Build the new ThemeToggleComponent

**Files:**
- Create: `projects/kitchen-sink/src/app/shared/theme-toggle.component.ts`

- [ ] **Step 1: Create the component**

```ts
import { Component, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

type ThemeMode = 'light' | 'dark';
const STORAGE_KEY = 'kitchen-sink:theme';

function readInitialMode(isBrowser: boolean): ThemeMode {
  if (!isBrowser) return 'light';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <button
      mat-icon-button
      type="button"
      [attr.aria-label]="mode() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
      (click)="toggle()"
    >
      <mat-icon>{{ mode() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
})
export class ThemeToggleComponent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly mode = signal<ThemeMode>(readInitialMode(this.isBrowser));

  constructor() {
    effect(() => {
      if (!this.isBrowser) return;
      const current = this.mode();
      document.documentElement.classList.toggle('dark-theme', current === 'dark');
      try { localStorage.setItem(STORAGE_KEY, current); } catch { /* ignore */ }
    });
  }

  protected toggle(): void {
    this.mode.update(m => (m === 'dark' ? 'light' : 'dark'));
  }
}
```

**Why the `isPlatformBrowser` guard:** SSR runs this component server-side. `localStorage`, `matchMedia`, and `document.documentElement.classList` aren't safe there. Guarding keeps SSR clean.

- [ ] **Step 2: Verify dev build**

```bash
npx ng build kitchen-sink --configuration=development
```

- [ ] **Step 3: Commit**

```bash
git add projects/kitchen-sink/src/app/shared/theme-toggle.component.ts
git commit -m "feat(kitchen-sink): add light/dark theme toggle

Signal-driven, persisted to localStorage, falls back to
prefers-color-scheme on first visit. SSR-safe via PLATFORM_ID guard.
Pairs with the FOUC-guard script in index.html (Task 5)."
```

---

## Task 9: Restyle StatusBarComponent for bottom-toolbar context

**Files:**
- Modify: `projects/kitchen-sink/src/app/shared/status-bar.component.ts`

The status bar previously rode on its own `app-status-bar` host with a bottom border. Inside a `mat-toolbar` it doesn't need that — strip the `<small>` wrapper, let toolbar typography handle it.

- [ ] **Step 1: Simplify the template**

```ts
import { Component, inject } from '@angular/core';
import { LinguiService } from '@tocdk/lingui-angular';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  template: `
    <span class="status-bar">
      active: <strong>{{ lingui.locale() }}</strong>
      · loading: {{ lingui.loading() }}
      · source: {{ lingui.sourceLocale }}
    </span>
  `,
  styles: [`
    .status-bar { font-size: 0.85rem; opacity: 0.85; }
  `],
})
export class StatusBarComponent {
  protected readonly lingui = inject(LinguiService);
}
```

- [ ] **Step 2: Commit**

```bash
git add projects/kitchen-sink/src/app/shared/status-bar.component.ts
git commit -m "feat(kitchen-sink): simplify status-bar for mat-toolbar host"
```

---

## Task 10: Restyle AppComponent with toolbar + sidenav + responsive

**Files:**
- Modify: `projects/kitchen-sink/src/app/app.component.ts`

- [ ] **Step 1: Rewrite the component**

```ts
import { Component, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { LocaleSwitcherComponent } from './shared/locale-switcher.component';
import { StatusBarComponent } from './shared/status-bar.component';
import { ThemeToggleComponent } from './shared/theme-toggle.component';

const NAV = [
  { path: '/basic', label: 'Basic' },
  { path: '/params', label: 'Params' },
  { path: '/plural', label: 'Plural' },
  { path: '/select', label: 'Select' },
  { path: '/context', label: 'Context' },
  { path: '/explicit-id', label: 'Explicit IDs' },
  { path: '/lazy', label: 'Lazy' },
  { path: '/ssr', label: 'SSR' },
  { path: '/cd', label: 'Change det.' },
  { path: '/missing', label: 'Missing' },
] as const;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterLink, RouterLinkActive, RouterOutlet,
    MatToolbarModule, MatSidenavModule, MatListModule, MatIconModule, MatButtonModule,
    LocaleSwitcherComponent, StatusBarComponent, ThemeToggleComponent,
  ],
  template: `
    <mat-sidenav-container class="app-container">
      <mat-sidenav
        #sidenav
        [mode]="isHandset() ? 'over' : 'side'"
        [opened]="!isHandset()"
        class="app-sidenav"
      >
        <mat-nav-list>
          @for (item of nav; track item.path) {
            <a
              mat-list-item
              [routerLink]="item.path"
              routerLinkActive="active"
              (click)="onNavClick(sidenav)"
            >{{ item.label }}</a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar color="primary" class="app-toolbar">
          @if (isHandset()) {
            <button mat-icon-button (click)="sidenav.toggle()" aria-label="Toggle menu">
              <mat-icon>menu</mat-icon>
            </button>
          }
          <span class="app-title">&commat;tocdk/lingui-angular kitchen sink</span>
          <span class="spacer"></span>
          <app-theme-toggle />
          <app-locale-switcher />
        </mat-toolbar>

        <main class="app-main">
          <router-outlet />
        </main>

        <mat-toolbar class="app-footer">
          <app-status-bar />
        </mat-toolbar>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .app-container { height: 100vh; }
    .app-sidenav { width: 240px; }
    .app-sidenav .active { background: var(--mat-sys-secondary-container); }
    .app-toolbar { position: sticky; top: 0; z-index: 2; }
    .app-toolbar .app-title { font-size: 1rem; }
    .spacer { flex: 1 1 auto; }
    .app-main { padding: 1rem; min-height: calc(100vh - 64px - 48px); }
    .app-footer { min-height: 48px; height: 48px; padding: 0 1rem; }
  `],
})
export class AppComponent {
  private readonly observer = inject(BreakpointObserver);
  protected readonly nav = NAV;
  protected readonly isHandset = toSignal(
    this.observer.observe('(max-width: 959.98px)').pipe(map(s => s.matches)),
    { initialValue: false },
  );

  protected onNavClick(sidenav: MatSidenav): void {
    if (this.isHandset()) sidenav.close();
  }
}
```

- [ ] **Step 2: Verify dev build**

```bash
npx ng build kitchen-sink --configuration=development
```

Expected: build completes; no missing import errors.

- [ ] **Step 3: Commit**

```bash
git add projects/kitchen-sink/src/app/app.component.ts
git commit -m "feat(kitchen-sink): Material 3 app shell

mat-sidenav-container with responsive mode (side >= 960px, over < 960px),
mat-toolbar top with title + theme toggle + locale switcher, mat-toolbar
bottom hosts the status bar, mat-nav-list for navigation with active
highlighting via routerLinkActive."
```

---

## Task 11: Fix basic.component Hello row reactivity

**Files:**
- Modify: `projects/kitchen-sink/src/app/features/basic.component.ts`

- [ ] **Step 1: Verify `t$` exists in the public API**

```bash
grep -n 't\$' node_modules/@tocdk/lingui-angular/dist/lingui-angular/index.d.ts
```

Expected: a line like `t$(...): Signal<string>` or similar. If missing, fall back to Option B (read locale signal inside computed):

```ts
protected greeting = computed(() => {
  this.lingui.locale();  // register reactive dep
  return this.lingui.t('Hello');
});
```

- [ ] **Step 2: Apply the fix (Option A, preferred)**

```ts
import { Component, inject } from '@angular/core';
import { LinguiService, TPipe, TDirective } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  selector: 'app-basic',
  standalone: true,
  imports: [DemoPageComponent, TPipe, TDirective],
  template: `
    <app-demo-page title="Basic">
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
  protected greeting = this.lingui.t$('Hello');
}
```

Note `computed` import removed; `inject` still imported.

- [ ] **Step 3: Verify dev build**

```bash
npx ng build kitchen-sink --configuration=development
```

- [ ] **Step 4: Commit**

```bash
git add projects/kitchen-sink/src/app/features/basic.component.ts
git commit -m "fix(kitchen-sink): basic Hello row reacts to locale change

Was wrapped in computed(() => this.lingui.t('Hello')) — the callback
doesn't read the locale signal, so the computed never recomputes. Switched
to t\$('Hello') which returns a locale-reactive signal. Pipe and directive
paths were already correct; this row was the v0.1.2 oversight."
```

---

## Task 12: Local verification — full build + serve + manual checks

**Why before workflow:** the workflow path-bindings depend on the build artifact being where Task 1 said it would be. This task is the final smoke before automating it.

- [ ] **Step 1: Clean prior build artifacts**

```bash
cd /Users/toc/git/tivedo/lingui-angular
rm -rf dist
```

- [ ] **Step 2: Production build of the full chain**

```bash
npm run build:lib
npx ng build kitchen-sink --configuration=production --base-href "/lingui-angular/"
```

Expected: both complete without errors.

- [ ] **Step 3: Confirm artifact shape + apply Pages rename**

```bash
ls dist/kitchen-sink/browser/index.csr.html dist/kitchen-sink/browser/main.js
cp dist/kitchen-sink/browser/index.csr.html dist/kitchen-sink/browser/index.html
cp dist/kitchen-sink/browser/index.csr.html dist/kitchen-sink/browser/404.html
```

Expected: source files exist; copies succeed.

- [ ] **Step 4: Serve and visit**

In one terminal:

```bash
npx http-server dist/kitchen-sink/browser -p 8080 -c-1
```

Open `http://localhost:8080/lingui-angular/` in a browser.

- [ ] **Step 5: Manual checks (mark each box only after seeing the behavior)**

- [ ] Top toolbar renders with title, theme toggle (sun/moon icon), and EN/DA button-toggle group
- [ ] Sidenav opens on the left at desktop width, listing all 10 routes
- [ ] Clicking `Basic`: card renders with title "Basic", showing three lines:
  - `LinguiService.t(): Hello`
  - `Welcome` (h3)
  - `About` button
- [ ] Click `DA` in the locale toggle:
  - `Welcome` swaps to `Velkommen` (or Danish equivalent)
  - `About` swaps to Danish
  - **`LinguiService.t(): Hello` swaps to `Hej`** ← the previously-broken row
- [ ] Status bar at the bottom shows `active: da · loading: false · source: en`
- [ ] Click theme toggle: page switches light ↔ dark
- [ ] Hard refresh (Cmd+Shift+R): theme persists; no flash of opposite theme on load
- [ ] Resize browser below 960px: sidenav disappears, hamburger appears in toolbar; click hamburger → drawer slides in over content; click a nav item → drawer closes
- [ ] Visit `http://localhost:8080/lingui-angular/plural` directly (hard reload): page renders inside its mat-card (SPA routing works under the configured base-href)

- [ ] **Step 6: Kill the http-server (Ctrl+C) — no commit in this task, it's verification only**

If any check failed: go back to the relevant task, fix, and re-run from Step 1 here.

---

## Task 13: GitHub Pages workflow

**Files:**
- Create: `.github/workflows/deploy-pages.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: deploy-pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - name: Install
        run: npm ci
      - name: Build library (peer for the demo)
        run: npm run build:lib
      - name: Build demo (with GH Pages base href)
        run: npx ng build kitchen-sink --configuration=production --base-href "/lingui-angular/"
      - name: Promote CSR shell to index.html + SPA 404 fallback
        # The @angular/build:application builder emits the SPA shell as
        # index.csr.html when SSR is enabled in the build config. Rename it
        # to index.html (GH Pages default) and duplicate as 404.html so
        # deep links survive a hard refresh.
        run: |
          cp dist/kitchen-sink/browser/index.csr.html dist/kitchen-sink/browser/index.html
          cp dist/kitchen-sink/browser/index.csr.html dist/kitchen-sink/browser/404.html
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist/kitchen-sink/browser

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**If Task 1/Task 12 found a different artifact path** (e.g., `dist/kitchen-sink/` directly), swap the path in the `cp` step and `upload-pages-artifact.with.path` consistently.

- [ ] **Step 2: Verify YAML parses**

```bash
python3 -c "import yaml; print(yaml.safe_load(open('.github/workflows/deploy-pages.yml')))" >/dev/null
```

Expected: prints the parsed dict reference (or nothing with `>/dev/null`), exits 0.

If `python3` + `yaml` unavailable, fallback:

```bash
node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/deploy-pages.yml','utf8')); console.log('ok')"
```

(`js-yaml` is transitively in node_modules via Angular tooling.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy-pages.yml
git commit -m "ci: GitHub Pages deploy of kitchen-sink demo

Triggers on push to main and workflow_dispatch. Builds library, then
builds demo with base-href=/lingui-angular/, adds SPA 404 fallback,
uploads as Pages artifact, deploys.

One-time owner action: enable Pages with Source=GitHub Actions at
https://github.com/tocDK/lingui-angular/settings/pages — listed in PR body."
```

---

## Task 14: README + CHANGELOG

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Read both files first**

```bash
head -40 README.md
head -30 CHANGELOG.md
```

This is needed to find the exact roadmap line + insertion points.

- [ ] **Step 2: README — add live-demo callout at the top**

Locate the top of README (after the H1 and the one-liner description, before the first major section). Insert:

```markdown
> **🎮 [Live demo: tocdk.github.io/lingui-angular](https://tocdk.github.io/lingui-angular/)**
```

(Plain markdown blockquote; the emoji is intentional here — README is the public-facing entry point.)

- [ ] **Step 3: README — move v0.2.0 roadmap entry**

Find the roadmap section. Locate the row that mentions "GitHub Pages deployment of the kitchen-sink" under `v0.2.0 (planned)`. Move it to a new `## Demo` section near the top (above the roadmap) OR mark it as shipped within the v0.2.0 row — pick whichever style the existing README uses.

**Keep any other v0.2.0 line items** (HTML-comment extraction, Playwright e2e) in `(planned)` — they remain not-shipped after this PR.

- [ ] **Step 4: CHANGELOG — add v0.2.0 entry**

Insert below the `# Changelog` header / above the previous `## [0.1.x]` entry:

```markdown
## [0.2.0]

### Added
- GitHub Pages deployment of the kitchen-sink demo at https://tocdk.github.io/lingui-angular/. Auto-deploys on push to main. SPA 404 fallback ensures deep links survive hard refresh.
- Material 3 redesign of the kitchen-sink shell (Angular Material toolbar, sidenav, card wrappers, button-toggle locale switcher, light/dark theme toggle). Demo-only — the published library remains zero-runtime-dependency.

### Fixed
- `basic.component`: `LinguiService.t('Hello')` row now swaps to Danish on DA toggle (switched to reactive `t$()` form so the row reacts to locale changes). Pipe and directive paths were already correct.
```

- [ ] **Step 5: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: live demo link + v0.2.0 changelog

README gets a live-demo callout at the top and moves the v0.2.0 GitHub
Pages roadmap line to shipped. CHANGELOG documents the Pages deploy,
the Material 3 redesign, and the basic.component Hello reactivity fix."
```

---

## Task 15: Push, open PR, instruct user about Pages settings

**Files:** none changed in this task

- [ ] **Step 1: Final sanity build (cold)**

```bash
cd /Users/toc/git/tivedo/lingui-angular
rm -rf dist
npm ci
npm run build:lib
npx ng build kitchen-sink --configuration=production --base-href "/lingui-angular/"
```

Expected: both succeed.

- [ ] **Step 2: Run library tests (should be untouched, just confirm)**

```bash
npm test
```

Expected: all library tests pass. No kitchen-sink tests exist (deliberate — see Testing strategy at top).

- [ ] **Step 3: Push the branch**

```bash
git push -u origin toc/gh-pages-deploy
```

- [ ] **Step 4: Compose PR body to a fresh file**

```bash
cat > /tmp/pr-body-v0.2.0.md <<'EOF'
## Summary

Promotes the v0.2.0 roadmap item "GitHub Pages deployment of the kitchen-sink" from planned to shipped. Auto-deploys on every push to `main` via GitHub Actions. Live demo: https://tocdk.github.io/lingui-angular/

Also adds a Material 3 redesign of the demo shell — sidenav navigation, toolbar with theme + locale toggles, mat-card wrapper per feature page. Library runtime is untouched; Material is demo-only.

Fixes a pre-existing demo bug in `basic.component`: the `LinguiService.t('Hello')` row was wrapped in a non-reactive `computed()` and never swapped to Danish on DA toggle. Switched to the reactive `t$('Hello')` form.

## What changed

- `.github/workflows/deploy-pages.yml` (new) — build:lib → ng build with `--base-href /lingui-angular/` → SPA 404 fallback → deploy
- Material 3 redesign of `kitchen-sink` shell:
  - `app.component` — mat-sidenav-container, mat-toolbar, mat-nav-list, responsive via BreakpointObserver
  - `demo-page.component` — mat-card outlined wrapper
  - `locale-switcher.component` — mat-button-toggle-group
  - `theme-toggle.component` (new) — light/dark toggle, localStorage-persisted, SSR-safe
  - `styles.scss` — Material 3 rose/sage palette, light + dark schemes
  - `index.html` — Roboto + Material Icons, FOUC-guard script
  - `main.ts` / `main.server.ts` — `provideAnimationsAsync()`
- `basic.component.ts` — reactive `t$('Hello')` binding
- `package.json` — `@angular/material@^20`, `@angular/cdk@^20` in devDependencies
- `README.md` — live-demo callout at top, roadmap line updated
- `CHANGELOG.md` — v0.2.0 entry

## Pages setup (one-time, manual — required before merge)

Repository owner: enable GitHub Pages at https://github.com/tocDK/lingui-angular/settings/pages with **Source = GitHub Actions** before merging. The first deploy fires on the next push to main after enabling.

## Test plan

- [x] Local prod build succeeds (`ng build kitchen-sink --configuration=production --base-href /lingui-angular/`)
- [x] `dist/kitchen-sink/browser/` contains index.html + main bundle
- [x] Local serve: EN/DA toggle visibly swaps all bare strings (Welcome → Velkommen, About → Om, Hello → Hej including the previously-broken `t()` row)
- [x] Light/dark toggle persists across reload with no FOUC
- [x] Responsive sidenav: side mode ≥960px, drawer mode <960px with hamburger
- [x] SPA 404 fallback in place so deep links don't 404
- [x] Library vitest suite still passes
- [ ] First Pages deploy after merge succeeds (manual verify post-merge)
- [ ] Deployed URL renders correctly with locale + theme toggles working (manual verify post-merge)

## Out of scope

- HTML-comment extraction (v0.2.0 roadmap, separate branch)
- Playwright e2e against the live demo (v0.2.0 roadmap, separate branch)
- Restyling feature page **internals** — kept bare on purpose so each demo still shows what the library outputs

## Release tag

After merge + first Pages deploy succeeds, tag `v0.2.0` and cut a GitHub Release (see spec for exact commands).
EOF
```

- [ ] **Step 5: Verify the PR body file is correct before passing to gh**

```bash
head -5 /tmp/pr-body-v0.2.0.md
```

Expected: starts with `## Summary`.

- [ ] **Step 6: Open the PR**

```bash
gh pr create \
  --base main \
  --head toc/gh-pages-deploy \
  --title "feat(pages): deploy kitchen-sink to GitHub Pages + Material 3 redesign" \
  --body-file /tmp/pr-body-v0.2.0.md
```

Expected: returns a PR URL. Note: lingui-angular is **not** a Tivedo repo — do NOT add Anh as reviewer (Tivedo convention doesn't apply here).

- [ ] **Step 7: Verify PR body landed correctly**

```bash
gh pr view --json title,body | head -50
```

Expected: title and body match what was sent.

- [ ] **Step 8: Tell the user the Pages-settings step**

Print this to the conversation so the user sees it:

> **🔴 Action required from you:** Enable GitHub Pages at https://github.com/tocDK/lingui-angular/settings/pages
> - Source: **GitHub Actions**
> - Save
> First deploy fires on next push to main after merge. Without this step the workflow runs but the deploy job will fail with "Pages not enabled".

- [ ] **Step 9: Report PR URL and local-serve verification results**

Format:

```
✅ Branch: toc/gh-pages-deploy
✅ PR: <URL from Step 6>
✅ Local build output: dist/kitchen-sink/browser (confirmed)
✅ Manual local-serve verification (Task 12):
   - EN↔DA toggle swaps all visible strings including the Hello row
   - Light↔dark theme toggle persists across reload, no FOUC
   - Responsive sidenav works as designed
   - SPA 404 fallback verified via deep-link reload
⚠️  Tag/release v0.2.0: post-merge step, not done in this PR
🔴 One-time owner action: enable Pages settings (see Step 8)
```

---

## Self-review — spec coverage check

Pre-merge sanity that the plan covers every spec section:

- [x] **Hard constraints** — library runtime untouched (no task modifies `projects/lingui-angular/src/lib/`), no `--no-verify`, no force-push (Task 15 uses standard `git push -u` + `gh pr create`).
- [x] **App shell architecture** — Task 10.
- [x] **`DemoPageComponent` contract** — Task 6 (preserves `title` + `rendered` slot, adds optional `subtitle`, drops unused `[source]`).
- [x] **`LocaleSwitcherComponent` restyled** — Task 7.
- [x] **`ThemeToggleComponent` new** — Task 8.
- [x] **Responsive (`BreakpointObserver`)** — Task 10.
- [x] **Bootstrap providers (zoneless + `provideAnimationsAsync`)** — Task 4.
- [x] **Material 3 theming + rose/sage palette** — Task 3.
- [x] **Font + icon loading + FOUC guard** — Task 5.
- [x] **GitHub Pages workflow** — Task 13.
- [x] **Pages settings owner action** — Task 15 Step 8.
- [x] **`basic.component` Hello fix (`t$`)** — Task 11.
- [x] **Verification (local + CI)** — Task 12 (local), Task 13 + Task 15 Step 9 (CI handoff).
- [x] **PR + commit strategy** — Tasks 2/3/4/5/6/7/8/9/10/11/13/14 each commit one logical unit; Task 15 opens the PR.
- [x] **Release strategy** — Out of scope for this branch, noted in PR body and Task 15 Step 9.
- [x] **Risks** — addressed inline:
  - Artifact path → Task 1 verifies before Task 13 hard-codes
  - `t$` signature → Task 11 Step 1 verifies + fallback
  - Sidenav flicker → Task 10 uses `toSignal(..., { initialValue: false })`
  - CDN unavailability → acceptable, no mitigation needed
  - FOUC → Task 5 inline script + Task 8 effect
  - Material bundle bloat → noted in CHANGELOG (Task 14)
