# Kitchen-sink docs redesign — Material-style component pages

**Date:** 2026-06-04
**Status:** approved
**Branch:** `toc/docs-redesign`
**Reference:** material.angular.io component-page layout (Overview / API / Examples tabs)

## Why

The current kitchen-sink demo has one route per feature (`/basic`, `/params`, `/plural`, …) and shows only the *rendered output*. There's no way to view the source code, no API reference, no anchoring per-method. For a library doc site, that's a missed signal: a visitor lands, sees a translation rendered, and has to leave to `node_modules` or GitHub to figure out how to use it.

Goal: turn the kitchen-sink into a real component-reference site, mirroring material.angular.io's layout. Each library primitive (service / pipe / directive / SSR helper) gets its own page with three tabs:

- **Overview** — prose intro, reactivity contract, when-to-reach-for-it, 1-2 inline examples.
- **API** — method/property signatures with descriptions.
- **Examples** — full example gallery, each with inline source-code reveal.

## Hard constraints

- **No changes to runtime library code.** All work lives in `projects/kitchen-sink/` + repo-root scripts / configs.
- **Library remains zero-runtime-dependency.** `marked` + `prismjs` go to `devDependencies` (demo-only).
- No `--no-verify`, no force-push.

## Scope

### In scope

- New IA: API-surface-based sidenav (Services / Pipes / Directives / SSR / Guides) with a "Getting started" landing route.
- Per-primitive page shell with `mat-tab-group` (Overview / API / Examples) + right-rail TOC (`PageContentsComponent`).
- Reusable `<lingui-example>` card with header (title + 3 action icons) and inline source-reveal pane.
- Build-time codegen script (`scripts/generate-example-sources.mjs`) producing `projects/kitchen-sink/src/app/examples/sources.generated.ts` — a `Record<string, {ts, po?}>` map.
- Move all 10 existing feature components into `projects/kitchen-sink/src/app/examples/` as `*.example.ts` files; strip the `<app-demo-page>` wrapper (the new card replaces it).
- Hand-written structured content per primitive in `projects/kitchen-sink/src/app/content/<key>.content.ts`. Schema in `shared/page-content.types.ts`.
- Markdown rendering via `marked` (sync, no plugins) inside a small `MarkdownRendererComponent` + `safe-markdown` pipe.
- Syntax highlighting via `prismjs` (TypeScript + ini grammars only).
- Legacy route redirects so `/basic`, `/params`, etc. keep working (resolve to the new home + fragment).
- `npm run check:docs` drift guard: greps `projects/lingui-angular/src/public-api.ts` for exports and asserts each has a content module.
- README + CHANGELOG entry under `## [Unreleased]`.

### Out of scope (deferred to later PRs)

- TypeDoc-generated API tab.
- StackBlitz / CodeSandbox embed.
- Standalone `/examples/<key>` full-screen view (the ⧉ action icon ships hidden in v1).
- Cross-doc search.
- Multi-version doc selector (Material's `22.0.0` dropdown).

## Architecture

### Route map

```
/                            → redirectTo: '/getting-started'
/getting-started             → GettingStartedPageComponent
/services/lingui-service     → ApiPageComponent + LINGUI_SERVICE_CONTENT
/pipes/t-pipe                → ApiPageComponent + T_PIPE_CONTENT
/pipes/t-plural-pipe         → ApiPageComponent + T_PLURAL_PIPE_CONTENT
/pipes/t-select-pipe         → ApiPageComponent + T_SELECT_PIPE_CONTENT
/directives/t-directive      → ApiPageComponent + T_DIRECTIVE_CONTENT
/ssr/provide-lingui-ssr      → ApiPageComponent + SSR_CONTENT
/guides/lazy-loading         → ApiPageComponent + LAZY_LOADING_CONTENT
/guides/change-detection     → ApiPageComponent + CHANGE_DETECTION_CONTENT
/guides/missing-translations → ApiPageComponent + MISSING_TRANSLATIONS_CONTENT

# Legacy redirects (preserve external links)
/basic        → /services/lingui-service#basic
/params       → /services/lingui-service#params
/plural       → /pipes/t-plural-pipe#plural
/select       → /pipes/t-select-pipe#select
/context      → /services/lingui-service#context
/explicit-id  → /services/lingui-service#explicit-id
/lazy         → /guides/lazy-loading
/ssr          → /ssr/provide-lingui-ssr#ssr
/cd           → /guides/change-detection
/missing      → /guides/missing-translations
```

Content modules are bound to routes via `data: { content: () => import('./content/lingui-service.content').then(m => m.LINGUI_SERVICE_CONTENT) }` so each is code-split.

### Sidenav

`AppComponent` template gets a categorized nav list (Material `mat-nav-list` with `<h3 mat-subheader>` between groups):

```
GETTING STARTED
  Quick start
SERVICES
  LinguiService
PIPES
  TPipe
  TPluralPipe
  TSelectPipe
DIRECTIVES
  TDirective
SSR
  provideLingui (SSR)
GUIDES
  Lazy catalog loading
  Change detection
  Missing translations
```

`NAV` array moves into a new `app-nav.ts` to keep `AppComponent` clean.

### Page shell — `ApiPageComponent`

Component path: `projects/kitchen-sink/src/app/shared/api-page.component.ts`.

```html
<header class="page-header">
  <span class="pill">{{ content.pill }}</span>
  <h1>{{ content.title }}</h1>
</header>

<mat-tab-group
  [(selectedIndex)]="tabIndex"
  (selectedIndexChange)="onTabChange($event)"
  mat-stretch-tabs="false"
  class="page-tabs"
>
  <mat-tab label="Overview">
    <div class="page-body">
      <div class="page-main">
        @for (section of content.overview.sections; track section.id) {
          <section [id]="section.id">
            <h2>{{ section.title }}</h2>
            <markdown-renderer [source]="section.markdown" />
          </section>
        }
        @for (key of content.overview.examples; track key) {
          <lingui-example [sourceKey]="key" [title]="exampleTitle(key)">
            <ng-container *ngComponentOutlet="exampleComponent(key)" />
          </lingui-example>
        }
      </div>
      <page-contents [items]="overviewContents()" />
    </div>
  </mat-tab>

  <mat-tab label="API">
    <div class="page-body">
      <div class="page-main">
        @for (section of content.api.sections; track section.id) {
          <section [id]="section.id">
            <h2>{{ section.title }}</h2>
            @for (item of section.items; track item.id) {
              <api-item-card [item]="item" />
            }
          </section>
        }
      </div>
      <page-contents [items]="apiContents()" />
    </div>
  </mat-tab>

  <mat-tab label="Examples">
    <div class="page-body">
      <div class="page-main">
        @for (ex of content.examples; track ex.key) {
          <lingui-example
            [sourceKey]="ex.key"
            [title]="ex.title"
            [showCatalog]="ex.showCatalog"
            [defaultExpanded]="true"
          >
            <ng-container *ngComponentOutlet="exampleComponent(ex.key)" />
          </lingui-example>
        }
      </div>
      <page-contents [items]="examplesContents()" />
    </div>
  </mat-tab>
</mat-tab-group>
```

Inputs (via route data):
- `content: PageContent` — full content object for the active page.

State:
- `tabIndex: WritableSignal<number>` — synced with route fragment (`#overview` / `#api` / `#examples` → 0/1/2).

Example component lookup: a `Map<string, Type<unknown>>` defined in `examples/index.ts` (a tiny barrel file). `exampleComponent(key)` returns the Angular component class for `*ngComponentOutlet`.

### Example card — `LinguiExampleComponent`

Component path: `projects/kitchen-sink/src/app/shared/lingui-example.component.ts`.

```html
<mat-card appearance="outlined" class="example-card" [id]="sourceKey">
  <div class="example-header">
    <span class="title">{{ title }}</span>
    <button mat-icon-button (click)="copyLink()" aria-label="Copy link to example">
      <mat-icon>link</mat-icon>
    </button>
    <button mat-icon-button (click)="toggleSource()" [attr.aria-pressed]="expanded()" aria-label="Toggle source">
      <mat-icon>code</mat-icon>
    </button>
  </div>
  <div class="example-demo">
    <ng-content />
  </div>
  @if (expanded()) {
    <div class="example-source">
      @if (sources?.ts) {
        <div class="source-file">
          <header>{{ sourceKey }}.example.ts</header>
          <pre><code class="language-typescript" [innerHTML]="highlightedTs()"></code></pre>
        </div>
      }
      @if (showCatalog && sources?.po) {
        <div class="source-file">
          <header>{{ sourceKey }}.example.po</header>
          <pre><code class="language-ini" [innerHTML]="highlightedPo()"></code></pre>
        </div>
      }
    </div>
  }
</mat-card>
```

Inputs:
- `title: string` (required)
- `sourceKey: string` (required) — used for source lookup, anchor id, copy link
- `showCatalog: boolean = false`
- `defaultExpanded: boolean = false`

Internal:
- `expanded = signal<boolean>(this.defaultExpanded)`
- `sources = computed(() => SOURCES[this.sourceKey])`
- `highlightedTs / highlightedPo = computed(() => Prism.highlight(...))`

Snack-bar feedback on copy: `MatSnackBar.open('Link copied', 'Dismiss', {duration: 1500})`.

### Right-rail TOC — `PageContentsComponent`

Component path: `projects/kitchen-sink/src/app/shared/page-contents.component.ts`.

```html
<aside class="page-contents">
  <header>Page contents</header>
  <ul>
    @for (item of items; track item.id) {
      <li [class.active]="item.id === activeId()">
        <a [routerLink]="[]" [fragment]="item.id">{{ item.title }}</a>
      </li>
    }
  </ul>
</aside>
```

Inputs:
- `items: { id: string; title: string }[]`

Active-section tracking: `IntersectionObserver` watches all `[id]` elements rendered in the main column. The most-visible one drives `activeId()`.

Mobile (<960px): replaced by an `<details>` block above the content. Same items, no active highlight.

### Example components — new `examples/` directory

Each file: `projects/kitchen-sink/src/app/examples/<key>.example.ts`, exporting a single component class:

```ts
import { Component, inject } from '@angular/core';
import { LinguiService, TPipe, TDirective } from '@tocdk/lingui-angular';

@Component({
  selector: 'lingui-example-basic',
  standalone: true,
  imports: [TPipe, TDirective],
  template: `
    <p>LinguiService.t(): <strong>{{ greeting() }}</strong></p>
    <h3>{{ 'Welcome' | t }}</h3>
    <button [t]="'About'"></button>
  `,
})
export class BasicExample {
  private readonly lingui = inject(LinguiService);
  protected greeting = this.lingui.t$('Hello');
}
```

Notable changes from the current `features/*.component.ts`:
- Drop the `<app-demo-page>` wrapper.
- Drop the `default export` (each is a named export now; the barrel `examples/index.ts` exposes them).
- Rename class: `BasicComponent` → `BasicExample`, etc.
- Selector renamed: `app-basic` → `lingui-example-basic`.

Reactivity-fix patterns from PR #17 (`t$(...)` instead of `computed(() => lingui.t(...))`) are preserved.

### Barrel — `examples/index.ts`

```ts
import { Type } from '@angular/core';
import { BasicExample } from './basic.example';
import { ParamsExample } from './params.example';
// ...one import per file

export const EXAMPLE_COMPONENTS: Record<string, Type<unknown>> = {
  basic: BasicExample,
  params: ParamsExample,
  plural: PluralExample,
  select: SelectExample,
  context: ContextExample,
  'explicit-id': ExplicitIdExample,
  lazy: LazyExample,
  ssr: SsrExample,
  cd: CdExample,
  missing: MissingExample,
};
```

### Source-code loader — codegen

Script: `scripts/generate-example-sources.mjs`. Walks `projects/kitchen-sink/src/app/examples/`, reads every `<key>.example.ts` and optional `<key>.example.po`, emits:

```ts
/* AUTO-GENERATED by scripts/generate-example-sources.mjs */
export type ExampleSources = { ts: string; po?: string };
export const SOURCES: Record<string, ExampleSources> = {
  basic: { ts: "...", po: "..." },
  params: { ts: "..." },
  // ...
};
```

Output path: `projects/kitchen-sink/src/app/examples/sources.generated.ts`.

**Gitignored.** Regenerated on every build via npm scripts:

```json
"scripts": {
  "prebuild:demo": "node scripts/generate-example-sources.mjs",
  "prestart": "node scripts/generate-example-sources.mjs"
}
```

Also runs automatically before `ng build kitchen-sink` because the workflow uses `npm run build:demo` (via `npx ng build`, we need to invoke the prebuild explicitly in the workflow OR use `npm run build:demo` instead). **Decision:** workflow changes from `npx ng build kitchen-sink ...` to `npm run build:demo` so the `prebuild:demo` hook fires. The base-href flag moves into the `build:demo` npm script.

**Catalog snippets** — `*.example.po` files live next to their components and contain only the relevant lines (e.g., for `basic.example.po`: just the `msgid "Hello" / msgstr "Hej"` entries). These are NOT consumed by the Lingui CLI — they're documentation snippets shown in the source pane. Authors maintain them by hand, kept short.

### Content modules

One per route: `projects/kitchen-sink/src/app/content/<key>.content.ts`. Each exports a single `PageContent` constant. Schema lives in `shared/page-content.types.ts`:

```ts
export interface PageContent {
  title: string;
  pill: 'service' | 'pipe' | 'directive' | 'provider' | 'guide';
  overview: OverviewTab;
  api: ApiTab;
  examples: ExampleEntry[];
}

export interface OverviewTab {
  sections: { id: string; title: string; markdown: string }[];
  examples: string[]; // keys into EXAMPLE_COMPONENTS
}

export interface ApiTab {
  sections: { id: string; title: string; items: ApiItem[] }[];
}

export interface ApiItem {
  id: string;
  signature: string;        // e.g., "t$(descriptor: MessageDescriptor | string): Signal<string>"
  description: string;      // short prose (markdown)
  example?: string;         // optional sourceKey for an inline mini-example
}

export interface ExampleEntry {
  key: string;
  title: string;
  showCatalog?: boolean;
}
```

Content files: 10 total (one per route).

### Markdown rendering — `MarkdownRendererComponent` + `safe-markdown` pipe

Component path: `projects/kitchen-sink/src/app/shared/markdown-renderer.component.ts`.

```ts
@Component({
  selector: 'markdown-renderer',
  standalone: true,
  imports: [],
  template: `<div class="prose" [innerHTML]="html()"></div>`,
})
export class MarkdownRendererComponent {
  source = input.required<string>();
  protected html = computed(() => {
    const raw = marked.parse(this.source(), { async: false, gfm: true, breaks: false });
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  });
  private readonly sanitizer = inject(DomSanitizer);
}
```

`marked` is `devDependency`, sync API. Code fences (` ```ts `) get post-processed by walking the rendered HTML and running Prism on each `<code class="language-...">`.

**Why not `@angular/marked` or `ngx-markdown`:** those bring `MarkedModule`, transitive RxJS subscribers, and zone hooks. We need a 3-line wrapper around `marked.parse()` — that's it.

### API tab card — `ApiItemCardComponent`

Component path: `projects/kitchen-sink/src/app/shared/api-item-card.component.ts`.

Renders a single `ApiItem`:

```html
<article class="api-item" [id]="item.id">
  <code class="signature">{{ item.signature }}</code>
  <markdown-renderer [source]="item.description" />
  @if (item.example) {
    <lingui-example sourceKey="item.example" title="example" defaultExpanded>
      <ng-container *ngComponentOutlet="exampleComponent(item.example)" />
    </lingui-example>
  }
</article>
```

### Drift guard — `npm run check:docs`

Script: `scripts/check-docs.mjs`. Reads `projects/lingui-angular/src/public-api.ts`, extracts top-level export names, asserts each is mentioned in **at least one** content file under `projects/kitchen-sink/src/app/content/`. Fails CI if a public export has no doc entry.

Wired into CI as a new `docs-check` job in `.github/workflows/ci.yml`:

```yaml
docs-check:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 22, cache: npm }
    - run: npm ci
    - run: npm run check:docs
```

## File inventory

### New files

- `docs/superpowers/specs/2026-06-04-kitchen-sink-docs-redesign-design.md` (this file)
- `docs/superpowers/plans/2026-06-04-kitchen-sink-docs-redesign.md` (next, from writing-plans)
- `scripts/generate-example-sources.mjs`
- `scripts/check-docs.mjs`
- `projects/kitchen-sink/src/app/shared/api-page.component.ts`
- `projects/kitchen-sink/src/app/shared/lingui-example.component.ts`
- `projects/kitchen-sink/src/app/shared/page-contents.component.ts`
- `projects/kitchen-sink/src/app/shared/markdown-renderer.component.ts`
- `projects/kitchen-sink/src/app/shared/api-item-card.component.ts`
- `projects/kitchen-sink/src/app/shared/page-content.types.ts`
- `projects/kitchen-sink/src/app/shared/app-nav.ts`
- `projects/kitchen-sink/src/app/examples/index.ts`
- `projects/kitchen-sink/src/app/examples/{basic,params,plural,select,context,explicit-id,lazy,ssr,cd,missing}.example.ts` (10 files)
- `projects/kitchen-sink/src/app/examples/{basic,context,explicit-id}.example.po` (3 catalog snippets — minimal set; others added later if needed)
- `projects/kitchen-sink/src/app/content/{getting-started,lingui-service,t-pipe,t-plural-pipe,t-select-pipe,t-directive,provide-lingui-ssr,lazy-loading,change-detection,missing-translations}.content.ts` (10 files)
- `projects/kitchen-sink/src/app/pages/api-page.resolver.ts` — resolver that loads the right content module per route

### Modified files

- `package.json` — add `marked` + `prismjs` to devDeps; add `prebuild:demo`, `prestart`, `check:docs` scripts; modify `build:demo` to include base-href so the workflow can call it
- `.gitignore` — add `projects/kitchen-sink/src/app/examples/sources.generated.ts`
- `projects/kitchen-sink/src/app/app.routes.ts` — full rewrite with new routes + legacy redirects
- `projects/kitchen-sink/src/app/app.component.ts` — sidenav restructured with section headers (`<h3 mat-subheader>`)
- `projects/kitchen-sink/src/styles.scss` — add Prism's theme tokens (light + dark variants), prose typography defaults, `.example-card` polish
- `.github/workflows/deploy-pages.yml` — call `npm run build:demo` (which now bundles the prebuild step)
- `.github/workflows/ci.yml` — add `docs-check` job
- `README.md` — update roadmap mark (Material-redesign + Pages already done; can mark "kitchen-sink as a docs site" as v0.2.x)
- `CHANGELOG.md` — `## [Unreleased]` entry

### Deleted files

- `projects/kitchen-sink/src/app/features/{basic,params,plural,select,context,explicit-id,lazy,ssr,cd,missing}.component.ts` — content moves to `examples/`
- `projects/kitchen-sink/src/app/features/` — directory removed
- `projects/kitchen-sink/src/app/shared/demo-page.component.ts` — replaced by `lingui-example.component.ts`

## Verification

### Local

1. `npm ci`
2. `npm run build:lib`
3. `npm run check:docs` — no drift
4. `npm run build:demo` — calls prebuild + ng build successfully
5. `ls projects/kitchen-sink/src/app/examples/sources.generated.ts` — exists, contains expected keys
6. Serve `dist/kitchen-sink/browser/` (with the `index.csr.html` → `index.html` rename) under `/lingui-angular/` and via Playwright:
   - `/` redirects to `/getting-started`
   - `/services/lingui-service` shows three tabs; switching tabs updates the fragment
   - Each example card's `code` icon expands a Prism-highlighted source pane
   - `link` icon copies a URL with `#<sourceKey>` to clipboard and shows a snackbar
   - Right-rail TOC highlights the current section on scroll
   - Mobile (<960px): TOC collapses to `<details>`
   - Legacy `/basic` redirect lands on `/services/lingui-service#basic` and scrolls there
   - Locale toggle still works on every example (regression check from PR #17)

### CI

- `ci/lint`, `ci/test`, `ci/build-lib`, `ci/build-demo`, `ci/extract-check` — all must pass.
- New `ci/docs-check` — passes.
- `deploy-pages` workflow runs `npm run build:demo` end-to-end without errors.

## PR + commit strategy

Single PR off `toc/docs-redesign`, base `main`. Logical commits:

1. `chore(deps): marked + prismjs (devDependencies, demo-only)`
2. `chore(build): example-sources codegen + npm scripts`
3. `docs(types): PageContent / ApiItem / ExampleEntry types`
4. `feat(kitchen-sink): MarkdownRenderer + Prism integration`
5. `feat(kitchen-sink): LinguiExample card with inline source reveal`
6. `feat(kitchen-sink): ApiPage shell + PageContents TOC`
7. `refactor(kitchen-sink): move features/ → examples/, strip wrappers`
8. `feat(kitchen-sink): per-primitive content modules (10 routes)`
9. `feat(kitchen-sink): wire new routes + sidenav categories + legacy redirects`
10. `ci: docs-drift guard job`
11. `docs: README roadmap + CHANGELOG`

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| `marked` + `prismjs` push the bundle past current 600KB error budget | Lazy-import Prism in `LinguiExampleComponent` constructor; check sizes after each commit; bump `maximumError` if needed (documented in CHANGELOG) |
| Codegen script's output diff churn confuses reviewers | `.gitignore` the generated file; CI regenerates; document in CONTRIBUTING |
| Marked's HTML output is XSS-risky (we control the content but defensive sanitization is cheap) | Pipe through Angular's `DomSanitizer.bypassSecurityTrustHtml` only after running `DOMPurify`-like marked options (`gfm: true, headerIds: true`) — or accept the risk since content is hand-authored, not user input |
| `mat-tab-group` re-mounts content on tab change → loses example state | Use `[preserveContent]="true"` (Material 17+) so example components keep their state across tab switches |
| Right-rail TOC fights with route fragment routing | Use `RouterLink` with `[fragment]` so scroll behavior is Angular-router-managed; suppress `IntersectionObserver` updates during programmatic scroll |
| Codegen runs but the `.example.po` snippets drift from the real catalogs | Out of scope for v1 — manual maintenance. Future: a check script that asserts the snippet's `msgid` exists in the real `.po` |

## Open questions (resolved during brainstorm — recorded for posterity)

- ✅ IA: API-surface-based, not feature-based
- ✅ Tabs: Overview / API / Examples (no Styling)
- ✅ Source reveal: inline expand per example
- ✅ API content: hand-written (with CI drift guard)
- ✅ Sources file: gitignored, regenerated on build
- ✅ Standalone `/examples/<key>` view: deferred to a later PR
