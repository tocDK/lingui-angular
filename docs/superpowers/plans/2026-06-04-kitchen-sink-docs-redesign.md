# Kitchen-sink docs redesign — Implementation Plan

> **For agentic workers:** subagent-driven execution; the controller dispatches one fresh subagent per task with a focused brief, then verifies the build before moving on.

**Goal:** Mirror material.angular.io layout: per-primitive pages with Overview / API / Examples tabs and inline source-code reveal.

**Architecture:** Build-time codegen → `sources.generated.ts` map. Shell = `ApiPageComponent` (mat-tab-group + right-rail TOC). Card = `LinguiExampleComponent` (header icons + Prism-highlighted source pane). Content = hand-written modules per primitive.

**Tech stack additions:** `marked` (sync MD), `prismjs` (TS + ini), both `devDependencies`.

**Branch:** `toc/docs-redesign` (off updated `main`).

**Spec:** `docs/superpowers/specs/2026-06-04-kitchen-sink-docs-redesign-design.md` — read this for full architecture.

---

## Testing strategy

Kitchen-sink intentionally has no vitest project (library only). Verification = manual Playwright + the new `npm run check:docs` CI gate. Per-task verification = `npx ng build kitchen-sink --configuration=development` succeeds.

---

## Task 1: Scaffolding (deps, codegen, types, npm scripts)

**Files:**
- Modify: `package.json` — add `marked@^14`, `prismjs@^1`, `@types/prismjs` to `devDependencies`; add npm scripts (`prebuild:demo`, `prestart`, `check:docs`, modified `build:demo`)
- Modify: `.gitignore` — append `projects/kitchen-sink/src/app/examples/sources.generated.ts`
- Create: `scripts/generate-example-sources.mjs` — per spec Section 4
- Create: `scripts/check-docs.mjs` — per spec Section "Drift guard"
- Create: `projects/kitchen-sink/src/app/shared/page-content.types.ts` — `PageContent`, `OverviewTab`, `ApiTab`, `ApiItem`, `ExampleEntry`
- Create: `projects/kitchen-sink/src/app/shared/app-nav.ts` — nav data (extracted from `app.component.ts`)

**Acceptance:**
- `npm install` succeeds
- `node scripts/generate-example-sources.mjs` runs (output: warning about empty examples dir, exit 0)
- `node scripts/check-docs.mjs` runs (exits non-zero with "no content modules" — expected at this point)
- `npm run build:demo` does NOT yet succeed (examples not moved) — defer demo build verification to Task 2

Commit: `chore(deps,build): scaffold docs redesign (marked, prism, codegen, types)`

---

## Task 2: Move features/ → examples/, strip wrappers, barrel

**Files:**
- Create: `projects/kitchen-sink/src/app/examples/{basic,params,plural,select,context,explicit-id,lazy,ssr,cd,missing}.example.ts` — 10 files. Each:
  - One named class export (e.g., `BasicExample`)
  - Selector `lingui-example-<key>` (e.g., `lingui-example-basic`)
  - No `<app-demo-page>` wrapper
  - All template translations preserved exactly
  - All reactivity-correct patterns (`t$`, locale signal reads) preserved from the post-PR-#17 state of `features/*.component.ts`
- Create: `projects/kitchen-sink/src/app/examples/index.ts` — `EXAMPLE_COMPONENTS: Record<string, Type<unknown>>`
- Create: `projects/kitchen-sink/src/app/examples/basic.example.po`, `context.example.po`, `explicit-id.example.po` — short documentation snippets (~5-10 lines each, hand-authored from the matching real catalog entries)
- Delete: `projects/kitchen-sink/src/app/features/` (whole directory)
- Delete: `projects/kitchen-sink/src/app/shared/demo-page.component.ts`

**Important — preserve patterns from main:**
- `basic.example.ts`: `protected greeting = this.lingui.t$('Hello');` (NOT `computed(() => lingui.t(...))`)
- `context.example.ts`: `protected verb = this.lingui.t$('Open'); adj = this.lingui.t$('Open');`
- `explicit-id.example.ts`: `protected welcomeTs = this.lingui.t$({ id: 'auth.welcome', message: 'Welcome' });`
- `missing.example.ts`: keeps the `Active locale: {{ lingui.locale() }}` line that PR #17 added

**Don't compile yet** — app.routes.ts still references the deleted features. That's fixed in Task 6.

**Generate sources to validate codegen:**
```
node scripts/generate-example-sources.mjs
cat projects/kitchen-sink/src/app/examples/sources.generated.ts | head -20
```
Expect: 10 keys present, each with `.ts` content, 3 with `.po`.

Commit: `refactor(kitchen-sink): move features/ → examples/, strip wrappers`

---

## Task 3: Shared UI primitives (MarkdownRenderer, LinguiExample, PageContents, ApiItemCard)

**Files (all `projects/kitchen-sink/src/app/shared/`):**
- Create: `markdown-renderer.component.ts` — `MarkdownRendererComponent`, `safe-markdown` pipe optional (just use inline `computed` + `DomSanitizer`)
- Create: `lingui-example.component.ts` — `LinguiExampleComponent` per spec Section 3
- Create: `page-contents.component.ts` — `PageContentsComponent` with `IntersectionObserver`
- Create: `api-item-card.component.ts` — `ApiItemCardComponent`
- Modify: `projects/kitchen-sink/src/styles.scss` — Prism light/dark theme tokens, `.prose` typography, `.example-card` polish (will iterate; ship a first cut)

**Prism setup:** import only `prismjs/components/prism-typescript` and `prismjs/components/prism-ini` (covers .ts and .po). No `prismjs/themes/*.css` — write the colors via `var(--mat-sys-*)` tokens so they auto-flip on theme change.

**Markdown:** import `marked` directly. Sync mode (`{ async: false, gfm: true }`).

Commit: `feat(kitchen-sink): shared UI — MarkdownRenderer, LinguiExample, PageContents, ApiItemCard`

---

## Task 4: ApiPageComponent (tabbed shell)

**Files:**
- Create: `projects/kitchen-sink/src/app/pages/api-page.component.ts` — per spec Section "Page shell". Three `mat-tab` slots driven by route-data `content: PageContent`. Tab index synced with route fragment.
- Create: `projects/kitchen-sink/src/app/pages/api-page.resolver.ts` (or inline loader on route) — loads the content module pointed at by the active route.

**State sync:**
- On init: read `route.snapshot.fragment` → set initial tab via `#overview|#api|#examples` mapping.
- On tab change: `router.navigate([], { fragment: ['overview','api','examples'][i], replaceUrl: true })`.
- Inside each tab, sub-anchors (e.g., `#reactivity-contract`, `#t-dollar`) handled by `Router.events` + `viewportScroller.scrollToAnchor`.

**Example lookup:** use `EXAMPLE_COMPONENTS[key]` from `examples/index.ts` for `*ngComponentOutlet`.

Commit: `feat(kitchen-sink): ApiPage shell with tabbed Overview/API/Examples`

---

## Task 5: Content modules (10 files)

**Files (all `projects/kitchen-sink/src/app/content/`):**

- `getting-started.content.ts` — landing page. Overview only (no API, no examples), prose explaining install + `provideLingui` + a "Hello world" snippet.
- `lingui-service.content.ts` — pill=`service`. Overview: when-to-reach, reactivity-contract, inline `basic` example. API: properties (`locale`, `loading`, `sourceLocale`, `locales`, `i18n`) + methods (`t`, `t$`, `activate`). Examples: `basic`, `params`, `context`, `explicit-id`.
- `t-pipe.content.ts` — pill=`pipe`. Overview: bare-string form, $context, $id, parameter interpolation. API: `transform(message: string, options?: TPipeOptions): string` + `TPipeOptions` properties. Examples: `basic`, `params`, `context`, `explicit-id`.
- `t-plural-pipe.content.ts` — pill=`pipe`. Overview: CLDR plural-form, `#` substitution. API: `transform(count: number, rules: PluralRules): string` + `PluralRules`. Examples: `plural`.
- `t-select-pipe.content.ts` — pill=`pipe`. Overview: select rules + `other` requirement. API: `transform(key: string, rules: SelectRules): string`. Examples: `select`.
- `t-directive.content.ts` — pill=`directive`. Overview: bare-string `[t]` input, signal-input reactivity, why directive vs pipe. API: `t = input.required<string>()`. Examples: `basic`.
- `provide-lingui-ssr.content.ts` — pill=`provider`. Overview: SSR catalog handoff via TransferState. API: `provideLingui`, `serializeCatalog`, `hydrateCatalog`, `DEFAULT_SSR_TRANSFER_KEY`. Examples: `ssr`.
- `lazy-loading.content.ts` — pill=`guide`. Overview: lazy catalog import. Examples: `lazy`.
- `change-detection.content.ts` — pill=`guide`. Overview: zoneless CD, why `t$` matters, common pitfall. Examples: `cd`.
- `missing-translations.content.ts` — pill=`guide`. Overview: source-fallback behavior. Examples: `missing`.

**Content authoring style:**
- Markdown chunks under 200 words per section.
- Code blocks use ` ```ts ` or ` ```html `.
- Every API method signature is exact (copy from `projects/lingui-angular/src/lib/*.ts`).
- Each section has an explicit `id:` for anchor support.

Commit: `feat(kitchen-sink): content modules for 10 doc pages`

---

## Task 6: Wire new routes + sidenav categories + legacy redirects

**Files:**
- Modify: `projects/kitchen-sink/src/app/app.routes.ts` — full rewrite per spec Section "Route map". Use `loadComponent` for `ApiPageComponent` and `data: { content: () => import('./content/lingui-service.content').then(m => m.LINGUI_SERVICE_CONTENT) }` per route.
- Modify: `projects/kitchen-sink/src/app/app.component.ts` — sidenav `mat-nav-list` gets section subheaders. NAV array imported from `shared/app-nav.ts`.

**Sidenav structure** (subheaders via `<h3 matSubheader>`):

```
Getting started
  Quick start                /getting-started
Services
  LinguiService              /services/lingui-service
Pipes
  TPipe                      /pipes/t-pipe
  TPluralPipe                /pipes/t-plural-pipe
  TSelectPipe                /pipes/t-select-pipe
Directives
  TDirective                 /directives/t-directive
SSR
  provideLingui (SSR)        /ssr/provide-lingui-ssr
Guides
  Lazy catalog loading       /guides/lazy-loading
  Change detection           /guides/change-detection
  Missing translations       /guides/missing-translations
```

**Legacy redirects:** per spec Section "Route map" — all 10 mapped, fragment included.

**Verify dev build:** `npx ng build kitchen-sink --configuration=development` succeeds.

Commit: `feat(kitchen-sink): new routing + categorized sidenav + legacy redirects`

---

## Task 7: Drift-guard CI job

**Files:**
- Modify: `.github/workflows/ci.yml` — add `docs-check` job per spec Section "Drift guard"
- Existing `scripts/check-docs.mjs` from Task 1 — verify it works against the now-populated content/ directory:
  - Reads `projects/lingui-angular/src/public-api.ts`, extracts top-level export names
  - Recursively reads all `projects/kitchen-sink/src/app/content/*.content.ts`
  - For each export, asserts it appears as a token (substring match is fine for v1) in at least one content file
  - Exits 1 with a useful error if anything's missing

Commit: `ci: docs-drift guard`

---

## Task 8: Cold build + Playwright smoke + README/CHANGELOG

**Files:**
- Modify: `README.md` — update roadmap row
- Modify: `CHANGELOG.md` — `## [Unreleased]` entry with the redesign summary

**Build chain verification:**
```bash
cd /Users/toc/git/tivedo/lingui-angular
rm -rf dist
npm ci
npm run build:lib
npm run check:docs
npm run build:demo   # includes prebuild:demo
ls dist/kitchen-sink/browser/index.csr.html
```

**Playwright smoke (via the e2e-validator subagent or controller):**
1. Symlink dist into `/tmp/pages-serve/lingui-angular`, serve on port.
2. Open `/lingui-angular/` → expect redirect to `/getting-started`.
3. Click sidenav LinguiService → URL becomes `/services/lingui-service#overview`, Overview tab shown.
4. Click API tab → fragment → `#api`, API tab content visible (e.g., the `t$` signature).
5. Click Examples tab → see all 4 examples; click 〈/〉 on Basic → source pane expands with Prism-highlighted TypeScript.
6. Click 🔗 on Basic → snackbar appears.
7. Locale toggle: click DA — Basic example swaps strings to `Hej`/`Velkommen`/`Om` (regression check for PR #17).
8. Navigate `/basic` → redirect lands on `/services/lingui-service#basic`.
9. Resize to 720px → sidenav collapses to drawer; right-rail TOC collapses to `<details>`.

Commit: `docs: README + CHANGELOG for docs redesign`

---

## Final PR

Push `toc/docs-redesign`. Open PR with body summarizing:
- Reference screenshot (mirror Material's pattern)
- 11 logical commits
- Hard constraints respected (library untouched, zero-dep)
- Test plan checklist
- Out-of-scope items deferred
