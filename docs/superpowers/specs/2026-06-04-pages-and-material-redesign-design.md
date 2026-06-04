# lingui-angular v0.2.0 — GitHub Pages + Material redesign

**Date:** 2026-06-04
**Status:** approved (Thomas)
**Owner:** Thomas (tocDK)
**Branch:** `toc/gh-pages-deploy`
**Target release:** `v0.2.0`

## Why

Two interrelated v0.2.0 goals:

1. **Make the kitchen-sink demo publicly reachable.** Today the only way to see `@tocdk/lingui-angular` in action is to clone the repo, `npm install`, `npm run build:lib`, and `ng serve kitchen-sink`. That's a poor first-touch for a library README. Promoting the v0.2.0 roadmap item "GitHub Pages deployment of the kitchen-sink" from planned to shipped fixes this.

2. **Make the demo presentable when it ships.** The current shell is hand-rolled vanilla CSS designed for local hacking. A public demo should look polished without competing with the actual point of the demo (showing what the library outputs). A light Material 3 dress-up on the chrome + a consistent page wrapper achieves that without restyling the demo internals.

Shipping these together avoids a "v0.2.0 looks bad → v0.2.1 polishes it" sequence on the public URL.

## Hard constraints

These are non-negotiable for this branch:

- **No changes to runtime library code** — `projects/lingui-angular/src/lib/` is off-limits. This branch is demo + workflow only.
- **No `--no-verify`, no force-push.** Standard PR + merge flow.
- **Library must stay zero-runtime-dependency.** Material dependencies attach to the **kitchen-sink demo app only**, never to the published `@tocdk/lingui-angular` package.

## Scope

### In scope

- New GitHub Actions workflow: `deploy-pages.yml` — build lib, build kitchen-sink with GH Pages `--base-href`, SPA 404 fallback, deploy.
- Reactive-binding bug fix in `basic.component.ts` so the `LinguiService.t('Hello')` row swaps to Danish on DA toggle (was missed in v0.1.2 — the pipe/directive paths swap, this one didn't).
- Material 3 redesign of the kitchen-sink shell:
  - App shell (`mat-sidenav-container`, `mat-toolbar`, `mat-nav-list`)
  - Page wrapper (`mat-card` inside `DemoPageComponent`)
  - Locale switcher rebuilt on `mat-button-toggle-group`
  - New `ThemeToggleComponent` (light/dark, persisted to localStorage)
  - Material 3 theme — rose primary, sage tertiary — light + dark schemes
  - Responsive sidenav (side ≥960px, over <960px with hamburger)
- README — move v0.2.0 roadmap line out of `(planned)`; add live-demo callout at top.
- CHANGELOG — `## [0.2.0]` with `### Added` (Pages deploy) + `### Fixed` (Hello row reactivity).
- One-time manual step (instructed to user, not automatable): enable Pages with **Source = GitHub Actions** at `https://github.com/tocDK/lingui-angular/settings/pages`.

### Out of scope (v0.2.0 roadmap items deferred to later branches)

- HTML-comment extraction (`<!-- i18n: ... -->`)
- Playwright e2e against the deployed demo
- Full restyle of feature page **internals** — `basic.component`, `params.component`, etc. keep their bare `<button>`/`<h3>`/`<p>` markup. The demos exist to show what the library outputs; restyling that content with Material primitives would obscure the point of each demo.
- Tag/release `v0.2.0` — happens after this PR merges, listed in the implementation plan as a follow-up.

## Architecture

### Component tree (after)

```
AppComponent
└── mat-sidenav-container
    ├── mat-sidenav (mode=side|over, opened by responsive signal)
    │   └── mat-nav-list
    │       ├── mat-list-item routerLink="/basic"  [Basic]
    │       ├── mat-list-item routerLink="/params" [Params]
    │       └── ... (one per feature route)
    └── mat-sidenav-content
        ├── mat-toolbar (top, sticky)
        │   ├── button mat-icon-button (hamburger, isHandset-only)
        │   ├── h1 (title)
        │   ├── spacer
        │   ├── ThemeToggleComponent      ← new
        │   └── LocaleSwitcherComponent   ← restyled (mat-button-toggle-group)
        ├── router-outlet
        │   └── feature page wrapped by DemoPageComponent (mat-card)
        └── mat-toolbar (footer, sticky-bottom, hosts StatusBarComponent body)
```

### `DemoPageComponent` contract (unchanged from callers' POV)

Today's API:

```html
<app-demo-page title="Basic">
  <div rendered>...demo content...</div>
</app-demo-page>
```

Stays exactly the same. Internals replaced:

```html
<mat-card appearance="outlined" class="demo-card">
  <mat-card-header>
    <mat-card-title>{{ title }}</mat-card-title>
    <mat-card-subtitle *ngIf="subtitle">{{ subtitle }}</mat-card-subtitle>
  </mat-card-header>
  <mat-card-content class="demo-rendered">
    <ng-content select="[rendered]" />
  </mat-card-content>
</mat-card>
```

New optional `subtitle` input (e.g., "Demonstrates: TPipe + TDirective"); existing pages don't have to set it. No `[source]` slot added in this branch — defer to a later iteration if useful.

### `LocaleSwitcherComponent` (restyled)

Replace custom `<button>`s with `mat-button-toggle-group`. The signal binding stays the same — `lingui.locale()` for read, `lingui.setLocale(value)` for write. This means the bind contract with `LinguiService` is unchanged.

### `ThemeToggleComponent` (new)

~25 LOC standalone component:

- `themeMode = signal<'light' | 'dark'>(...)` — initial value from `localStorage.getItem('kitchen-sink:theme')`, falling back to `matchMedia('(prefers-color-scheme: dark)')`.
- `effect()` writes class `dark-theme` on `document.documentElement` and `localStorage.setItem('kitchen-sink:theme', mode)`.
- Template: single `<button mat-icon-button>` showing `light_mode` icon when current is `dark`, `dark_mode` icon when current is `light` (icons label what clicking will switch TO — standard pattern).

Binary toggle only — no auto/system third state in v0.2.0.

### Responsive

Inject `BreakpointObserver` in `AppComponent`. Derive `isHandset = toSignal(observer.observe('(max-width: 959.98px)').pipe(map(s => s.matches)))`. Sidenav binds `[mode]="isHandset() ? 'over' : 'side'"` and `[opened]="!isHandset()"`. Hamburger button uses `*ngIf="isHandset()"` (or `@if` block).

Sidenav width: 240px fixed (Material rec).

### Bootstrap providers

Kitchen-sink runs zoneless (`provideZonelessChangeDetection()` in `main.ts`). Angular Material 20 supports zoneless but needs animations wired up explicitly:

```ts
// projects/kitchen-sink/src/main.ts — added provider
providers: [
  provideZonelessChangeDetection(),
  provideAnimationsAsync(),        // ← NEW (from @angular/platform-browser/animations/async)
  provideRouter(routes),
  provideClientHydration(),
  provideLingui({ ... }),
],
```

`provideAnimationsAsync()` (not `provideAnimations()`) — lazy-loads the animations bundle, smaller initial download, plays nicely with zoneless. The SSR `main.server.ts` mirrors the same change.

### Theming (Material 3)

`styles.scss` (renamed from `styles.css`):

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

/* keep minimal app-level resets */
body { margin: 0; }
.demo-card { margin: 1rem 0; }
```

Palette: rose primary, sage (green) tertiary. Distinctive (Material default is purple); pleasant in both light and dark.

**Angular config changes:**

- `angular.json` → `projects.kitchen-sink.architect.build.options.styles`: change `src/styles.css` to `src/styles.scss`
- `angular.json` → `projects.kitchen-sink.architect.build.options.inlineStyleLanguage`: add `"scss"`
- Delete `src/styles.css`, create `src/styles.scss`

**Font + icon loading** (added to `index.html`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
```

CDN-loaded (cheaper than self-hosting for a Pages demo, and Pages is on `*.github.io` so no cross-origin DNS surprises).

### GitHub Pages workflow

`.github/workflows/deploy-pages.yml` — as specified in the implementation brief:

- Trigger: `push` to `main`, `workflow_dispatch`
- Permissions: `contents: read`, `pages: write`, `id-token: write`
- Concurrency group: `pages`
- Build job: checkout → setup-node 22 → `npm ci` → `npm run build:lib` → `ng build kitchen-sink --configuration=production --base-href "/lingui-angular/"` → `cp dist/kitchen-sink/browser/index.html dist/kitchen-sink/browser/404.html` → upload-pages-artifact
- Deploy job: deploy-pages

**Artifact path verification** — the brief flags that `dist/kitchen-sink/browser` must be confirmed before committing the workflow. Run the build locally during implementation and adjust the path if Angular's current builder emits elsewhere.

### Pages settings (one-time owner action)

Instruct user to:

1. Open `https://github.com/tocDK/lingui-angular/settings/pages`
2. Source: **GitHub Actions**
3. Save

Cannot be automated reliably via `gh` — the Pages source flag isn't scriptable. Instructed explicitly in the PR body.

## Bug fix — `basic.component` Hello row

Today:

```ts
protected greeting = computed(() => this.lingui.t('Hello'));
```

`computed()` only tracks signal reads inside its callback. `lingui.t('Hello')` is a one-shot string return — it doesn't read `lingui.locale()` — so the computed never recomputes on locale change. The pipe and directive paths swap correctly because they subscribe to the locale signal internally.

Fix (Option A, the API designed for this):

```ts
protected greeting = this.lingui.t$('Hello');
```

`t$()` returns `Signal<string>` and re-emits on locale change. Template `{{ greeting() }}` is unchanged.

Verify `t$` exists in `node_modules/@tocdk/lingui-angular/dist/lingui-angular/index.d.ts` before committing (per the implementation brief).

## File inventory

### New files

- `.github/workflows/deploy-pages.yml`
- `projects/kitchen-sink/src/styles.scss`
- `projects/kitchen-sink/src/app/shared/theme-toggle.component.ts`
- `docs/superpowers/specs/2026-06-04-pages-and-material-redesign-design.md` (this file)
- `docs/superpowers/plans/2026-06-04-pages-and-material-redesign.md` (next, from writing-plans)

### Modified files

- `package.json` (root) — add `@angular/material` and `@angular/cdk` to **`devDependencies`** (root is the only manifest; kitchen-sink shares root deps; Material is never published with the library)
- `angular.json` — `styles.scss` and `inlineStyleLanguage: scss` for kitchen-sink
- `projects/kitchen-sink/src/index.html` — Roboto + Material Icons links
- `projects/kitchen-sink/src/app/app.component.ts` — full template restructure (sidenav-container, toolbar, nav-list)
- `projects/kitchen-sink/src/app/shared/demo-page.component.ts` — mat-card internals
- `projects/kitchen-sink/src/app/shared/locale-switcher.component.ts` — mat-button-toggle-group internals
- `projects/kitchen-sink/src/app/shared/status-bar.component.ts` — sits inside mat-toolbar now (template may simplify slightly)
- `projects/kitchen-sink/src/app/features/basic.component.ts` — `t$('Hello')` fix
- `projects/kitchen-sink/src/main.ts` — add `provideAnimationsAsync()`
- `projects/kitchen-sink/src/main.server.ts` — mirror the animations provider
- `README.md` — live-demo callout at top; v0.2.0 roadmap line moved out of `(planned)`
- `CHANGELOG.md` — `## [0.2.0]` entry

### Deleted files

- `projects/kitchen-sink/src/styles.css` (replaced by `.scss`)

## Verification

### Local

1. `npm ci` — clean install with new Material deps.
2. `npm run build:lib` — library still builds untouched.
3. `npx ng build kitchen-sink --configuration=production --base-href "/lingui-angular/"` — production build with Pages base href succeeds.
4. `ls dist/kitchen-sink/browser/index.html dist/kitchen-sink/browser/main-*.js` — confirm artifact shape.
5. `npx http-server dist/kitchen-sink/browser -p 8080` (or equivalent) and visit `http://localhost:8080/lingui-angular/`.
6. Manual visual checks:
   - Header renders with theme toggle + EN/DA button-toggle group
   - Sidenav opens on desktop, hamburger appears below 960px
   - Click DA: **every visible string** swaps including the previously-broken `LinguiService.t(): Hello` → `Hej` row in `BasicComponent`
   - Click theme toggle: light ↔ dark, persists across reload
   - Click each nav item: each feature page renders inside a mat-card

### CI

- Workflow triggers on push to feature branch via `workflow_dispatch` for early validation (optional during development).
- First real deploy happens on merge to `main`. Verify the deployed URL `https://tocdk.github.io/lingui-angular/` renders correctly and locale + theme toggles work.
- Hard refresh on a deep link (e.g. `https://tocdk.github.io/lingui-angular/params`) — SPA 404 fallback should keep the route alive.

## PR + commit strategy

- Single PR off `toc/gh-pages-deploy`, base `main`.
- Logical commits:
  1. `docs(spec): v0.2.0 pages + material redesign design` (this file + plan)
  2. `chore(deps): add @angular/material + @angular/cdk to kitchen-sink`
  3. `feat(kitchen-sink): material 3 app shell (sidenav + toolbar)`
  4. `feat(kitchen-sink): material card page wrapper`
  5. `feat(kitchen-sink): mat-button-toggle locale switcher + theme toggle`
  6. `fix(kitchen-sink): basic Hello row now reactive to locale (t$)`
  7. `ci: github pages deployment workflow`
  8. `docs: live-demo callout, changelog v0.2.0`

(Implementation plan from writing-plans may further sequence these into smaller verifiable steps.)

- PR body — as drafted in the implementation brief: summary, change list, manual Pages-enable callout, test plan checklist.
- Reviewer: per repo conventions (not Anh — this is `tocDK/lingui-angular`, not a Tivedo repo).

## Release strategy

After PR merges and first Pages deploy succeeds:

```bash
git checkout main && git pull
git tag -a v0.2.0 -m "v0.2.0 — kitchen-sink on GitHub Pages + Material 3 redesign + reactive Hello binding"
git push origin v0.2.0
gh release create v0.2.0 \
  --title "v0.2.0" \
  --notes "Kitchen-sink demo live at https://tocdk.github.io/lingui-angular/. Material 3 redesign of the demo shell. Reactive Hello binding fix. See CHANGELOG.md."
```

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Material bundle bloats the demo significantly | Acceptable — demo is its own app, library remains zero-deps. Note in CHANGELOG. |
| `dist/kitchen-sink/browser` artifact path differs in current Angular builder | Verify locally before committing workflow; adjust path if needed. |
| Sidenav `BreakpointObserver` flickers on initial render | Use `toSignal` with `initialValue` matching server-rendered width OR accept one frame of layout shift on first paint (small demo, acceptable). |
| Roboto + Material Icons CDN unavailable | Acceptable failure mode (system fonts kick in); no critical path depends on CDN. |
| `t$` doesn't exist or has different signature than expected | Verify `node_modules/@tocdk/lingui-angular/dist/lingui-angular/index.d.ts` during implementation. Fallback: Option B (read `lingui.locale()` inside `computed`). |
| Light/dark toggle FOUC (flash of wrong theme on load) | Read localStorage in a tiny `<script>` in `index.html` head before Angular boots, applying the class server-side-like. ~5 LOC inline. |

## Open questions (deferred)

- Brand color: shipping with rose/sage default; swap during implementation if you want a tocDK brand color.
- Source-block slot on `DemoPageComponent`: deferred; not in this branch.
- Auto/system theme state: deferred; binary toggle only.

## Out-of-band

- This spec lives in `docs/superpowers/specs/` — first spec in this directory for `lingui-angular`. Sets the pattern for future personal-project specs in this repo.
