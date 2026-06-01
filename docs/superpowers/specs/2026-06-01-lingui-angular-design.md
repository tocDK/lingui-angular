---
title: "@tocdk/lingui-angular — design spec"
date: 2026-06-01
status: approved
owner: Thomas Christensen (@tocDK)
---

# `@tocdk/lingui-angular` — design spec

Angular 20+ bindings for [Lingui](https://lingui.dev/). Provides Angular-idiomatic
DI, pipes, a directive, and a template-aware extractor so developers can write
English in source, extract via AST, and ship PO catalogs through the existing
Lingui CLI.

---

## 1. Overview & goals

### What it is

An Angular-idiomatic wrapper around `@lingui/core` that gives Angular 20+ apps
Lingui's "write English, extract via AST, ship PO" developer experience.

### What it isn't

- **Not a fork of Lingui.** `@lingui/core` is a peer dependency; we stay aligned
  with its API. When Lingui ships a feature, we don't have to.
- **Not a competitor to ngx-translate / transloco.** Those load JSON catalogs at
  runtime with explicit keys. Different DX entirely.
- **Not an `@angular/localize` replacement.** We target apps that want runtime
  switching with PO files, not build-per-locale.

### MVP scope (v1.0.0)

- Signal-based `LinguiService` (active locale, current catalog) — zoneless-correct,
  change-detection-correct.
- `provideLingui()` provider function (standalone-only).
- `t` / `plural` / `select` re-exported from `@lingui/core` for TypeScript usage.
- `| t`, `| tPlural`, `| tSelect` pipes for templates (pure, signal-aware).
- `[t]` directive as an alternative to the pipe for full-element text.
- Lazy-loadable catalogs via `await import('./locales/<lang>.po')`.
- SSR-safe (Angular SSR with `TransferState` so the client doesn't refetch the
  active-locale catalog).
- Template extractor: ~150-LoC AST walker that finds `| t` (and friends) in
  `.html` files and emits TS shims into a temp file Lingui's CLI consumes — all
  extraction goes through Lingui's existing pipeline.

### Out of scope for v1

- Full `i18n` attribute parsing (`<h1 i18n>Hello</h1>`). Considered for v2 if
  there's demand.
- ICU MessageFormat in templates beyond `plural` / `select`.
- Other framework bindings (Vue / Svelte are Lingui's problem, not ours).
- Playwright e2e tests against the demo (Vitest + extractor snapshot diffs cover
  regression for v1).

### Success criteria

1. A developer can `npm install @tocdk/lingui-angular`, follow the README
   quickstart, and have a working English↔French switch in under 10 minutes.
2. The kitchen-sink demo exercises every documented API and runs in CI as both
   a client build and an SSR build.
3. ≥90% unit-test coverage on library code; ≥90% on the extractor.

---

## 2. Architecture

### Three layers

1. **Runtime** — service, provider, pipes, directive (ships in the published
   package's root entry).
2. **Build-time** — extractor: Angular template walker → TS shim → Lingui CLI
   (ships as a separate subpath entry: `@tocdk/lingui-angular/extractor`).
3. **Toolchain** — ng-packagr build, Vitest tests, GH Actions CI.

### Library file layout

```
projects/lingui-angular/
├── src/lib/
│   ├── lingui.service.ts          # signal-based service (~80 LoC)
│   ├── provide-lingui.ts          # provideLingui() + DI tokens (~40 LoC)
│   ├── pipes/
│   │   ├── t.pipe.ts              # | t       — pure, signal-aware
│   │   ├── t-plural.pipe.ts       # | tPlural:count:rules
│   │   └── t-select.pipe.ts       # | tSelect:value:rules
│   ├── directives/
│   │   └── t.directive.ts         # [t]="'Hello'"   element-text variant
│   ├── ssr/
│   │   └── transfer-state.ts      # SSR catalog handoff (no FOUC)
│   └── public-api.ts
├── extractor/                     # separate entry point — depends on @angular/compiler
│   ├── walk-template.ts           # template AST walker (~80 LoC)
│   ├── extract-templates.ts       # writes .lingui-extracted.ts shim (~70 LoC)
│   └── bin.ts                     # CLI: lingui-angular extract
├── ng-package.json
└── package.json                   # exports: '.', './extractor'
```

### Data flow on locale change

```
user clicks "fr"
  → LinguiService.activate('fr')
  → loader('fr') resolves to PO catalog (dynamic import — lazy)
  → @lingui/core: i18n.load('fr', messages) + i18n.activate('fr')
  → LinguiService.locale signal flips to 'fr'
  → all pure pipes that read locale() re-evaluate
  → views re-render (zoneless, signal CD)
```

### Five architectural commitments

1. **Signals end-to-end.** `LinguiService.locale: Signal<string>`. Pipes read it.
   No RxJS in the public API. Internal SSR module may use Promises; that's it.
2. **Pure pipes only.** Reading `locale()` inside a pure pipe's `transform()` is
   enough — Angular's reactive CD re-runs the pipe on signal change. No
   `Pipe({ pure: false })` anywhere.
3. **DI-scoped, no globals.** `provideLingui()` creates one `@lingui/core`
   instance per injector and stores it in a token. Two apps in one bundle
   (micro-frontends) just work.
4. **Runtime is template-engine-free.** The runtime package has zero dependency
   on `@angular/compiler`. The extractor — which does parse templates — is a
   separate subpath export. Runtime bundle stays tiny.
5. **SSR uses `TransferState`.** Server renders with the active locale's catalog;
   serializes the catalog into the response; client hydrates instantly. No
   flash-of-untranslated-content, no double-fetch.

### Dependency map

- **peer:** `@angular/core ^20.0.0`, `@angular/common ^20.0.0`, `@lingui/core ^6.0.0`
- **peer (extractor only, optional):** `@angular/compiler ^20.0.0`, `@lingui/cli ^6.0.0`
- **dev:** ng-packagr, vitest, `@analogjs/vite-plugin-angular`, typescript,
  `@lingui/cli`

---

## 3. API surface

### Bootstrap

```typescript
bootstrapApplication(AppComponent, {
  providers: [
    provideLingui({
      sourceLocale: 'en',
      locales: ['en', 'fr', 'da'],
      loader: (locale) => import(`./locales/${locale}.po`),
    }),
  ],
});
```

### Config

```typescript
export interface LinguiConfig {
  sourceLocale: string;                       // 'en'
  locales: string[];                          // ['en', 'fr', 'da']
  loader: (locale: string) => Promise<{ messages: Messages }>;
  fallbackLocales?: Record<string, string>;   // { 'fr-CA': 'fr', default: 'en' }
  detectLocale?: () => string | null;         // default: navigator.language → first match
  ssrTransferKey?: string;                    // default: 'lingui-catalog'
}

export function provideLingui(config: LinguiConfig): EnvironmentProviders;
```

### Service

```typescript
@Injectable({ providedIn: 'root' })
export class LinguiService {
  readonly locale: Signal<string>;
  readonly sourceLocale: string;
  readonly locales: readonly string[];
  readonly loading: Signal<boolean>;
  readonly i18n: I18n;                        // raw @lingui/core handle for power users

  activate(locale: string): Promise<void>;    // lazy-loads catalog if needed
  t(descriptor: MessageDescriptor | string): string;          // one-shot
  t$(descriptor: MessageDescriptor | string): Signal<string>; // reactive
}
```

### Errors

```typescript
// Thrown by LinguiService.activate(locale) when locale is not in config.locales
// and no fallbackLocales entry matches.
export class LinguiUnknownLocaleError extends Error {
  constructor(public readonly locale: string);
}
```

### Tag functions

Re-exported from `@lingui/core/macro` so callers import everything from one place:

```typescript
export { t, plural, select, defineMessage as msg } from '@lingui/core/macro';
```

### Pipes

All standalone, all pure, all signal-aware.

```typescript
// | t
@Pipe({ name: 't', standalone: true, pure: true })
class TPipe {
  // values: placeholder map; $context / $id are reserved metadata keys
  transform(
    message: string,
    values?: Record<string, unknown> & { $context?: string; $id?: string },
  ): string;
}

// | tPlural: rules
@Pipe({ name: 'tPlural', standalone: true, pure: true })
class TPluralPipe {
  transform(
    count: number,
    rules: Partial<Record<'zero' | 'one' | 'two' | 'few' | 'many' | 'other', string>>,
  ): string;
}

// | tSelect: rules
@Pipe({ name: 'tSelect', standalone: true, pure: true })
class TSelectPipe {
  transform(value: string, rules: Record<string, string> & { other: string }): string;
}
```

### Directive

Alternative to the pipe; sets element `textContent`.

```typescript
@Directive({ selector: '[t]', standalone: true })
class TDirective {
  @Input({ required: true }) t!: string;
  // an effect() on LinguiService.locale rewrites textContent on locale change
}
```

### Usage examples

**TS-first (signal-friendly):**

```typescript
@Component({ standalone: true, template: `<h1>{{ greeting() }}</h1>` })
class HelloComponent {
  name = signal('world');
  greeting = computed(() => t`Hello, ${this.name()}!`);
}
```

**Template-side:**

```html
{{ 'Welcome' | t }}                                          <!-- plain -->
{{ 'Hello, {name}' | t: { name: name() } }}                  <!-- with placeholder -->
{{ 'Open' | t: { $context: 'verb' } }}                       <!-- with msgctxt -->
{{ 'Welcome' | t: { $id: 'auth.welcome' } }}                 <!-- with explicit id -->
{{ 'Open, {name}' | t: { name: name(), $context: 'verb' } }} <!-- combined -->
{{ itemCount() | tPlural: { one: '# item', other: '# items' } }}
{{ status() | tSelect: { active: 'Online', away: 'Idle', other: 'Offline' } }}
<button [t]="'Cancel'"></button>
```

**Locale switch:**

```typescript
class LocaleSwitcher {
  private lingui = inject(LinguiService);
  switch(locale: string) { return this.lingui.activate(locale); }
}
```

### Three deliberate omissions

- **No `Trans` component / `<trans>` selector.** Angular's structural-directive
  ecosystem is already crowded; the pipe + directive cover every case.
- **No RxJS public API.** If someone wants an `Observable<string>`, they can
  `toObservable(service.t$(...))`.
- **No `loadAll(locales)` helper.** Lazy-load is the default; eager-load is
  `Promise.all(locales.map(l => service.activate(l)))`.

### Reserved metadata keys (`$`-prefix)

`$context` and `$id` are reserved keys in the `| t` pipe's values map. Placeholder
keys must not start with `$`. Documented in README as a constraint.

---

## 4. Extraction pipeline

We do not emit PO files. We emit TypeScript shims that Lingui's CLI then extracts
the same way it does hand-written TS. Lingui owns PO emission, plural-form
tables, msgctxt, source references; we just feed it equivalent code from
templates.

### Pipeline

```
src/**/*.html
  ↓  @angular/compiler parseTemplate()  (in our extractor)
  ↓  walk AST: find { | t, | tPlural, | tSelect, [t]="..." } with literal args
  ↓  emit src/.lingui-extracted/<hash>.ts  ← TS shims
  ↓
src/**/*.ts (real source) + src/.lingui-extracted/*.ts (generated shims)
  ↓  @lingui/cli extract  (untouched, upstream)
  ↓
src/locales/{en,fr,da}.po
```

### Shim emission example

**Input** (`src/app/foo.component.html`):

```html
<h1>{{ 'Welcome' | t }}</h1>
<p>{{ count | tPlural: { one: '# item', other: '# items' } }}</p>
<p>{{ status | tSelect: { active: 'Online', away: 'Idle', other: 'Offline' } }}</p>
<button [t]="'Cancel'"></button>
<!-- i18n: action verb, not noun -->
<span>{{ 'Open' | t: { $context: 'verb' } }}</span>
<span>{{ 'Hello, {name}' | t: { name: userName() } }}</span>
```

**Output** (`src/.lingui-extracted/foo.component.html.ts`):

```typescript
import { t, plural, select } from '@lingui/core/macro';
// @source: src/app/foo.component.html:1:5
void t`Welcome`;
// @source: src/app/foo.component.html:2:13
void plural(0, { one: '# item', other: '# items' });
// @source: src/app/foo.component.html:3:14
void select('', { active: 'Online', away: 'Idle', other: 'Offline' });
// @source: src/app/foo.component.html:4:9
void t`Cancel`;
// @source: src/app/foo.component.html:6:11
// context: verb, not noun
void t({ message: 'Open', context: 'verb' });
// @source: src/app/foo.component.html:7:11
void t({ message: 'Hello, {name}' });
```

Note: placeholder *values* (e.g. `userName()`) are not extracted, only the
*names* (`{name}`). Values are runtime-only. Matches Lingui's behavior for
`t\`Hello, ${name}\``.

### CLI surface

```bash
lingui-angular extract              # walk .html, write shims
lingui-angular extract --watch      # chokidar on .html, regenerate on change
lingui-angular clean                # remove .lingui-extracted/
```

### Composed user workflow

```json
"scripts": {
  "extract":       "lingui-angular extract && lingui extract && lingui-angular clean",
  "extract:watch": "lingui-angular extract --watch & lingui extract --watch"
}
```

### Supported template patterns

| Pattern | Status |
|---|---|
| `{{ 'Welcome' \| t }}` | ✅ extracted as `msgid "Welcome"` |
| `{{ 'Hello, {name}' \| t: { name: name() } }}` | ✅ extracted as `msgid "Hello, {name}"` |
| `{{ 'Open' \| t: { $context: 'verb' } }}` | ✅ extracted with msgctxt |
| `{{ 'Open, {name}' \| t: { name: name(), $context: 'verb' } }}` | ✅ extracted, combined |
| `{{ 'Welcome' \| t: { $id: 'auth.welcome' } }}` | ✅ extracted with explicit id |
| `{{ count \| tPlural: { one: '# item', other: '# items' } }}` | ✅ extracted as plural |
| `{{ status \| tSelect: { active: 'On', other: 'Off' } }}` | ✅ extracted as select |
| `[t]="'Cancel'"` | ✅ extracted |
| `{{ var \| t }}` | ⚠ skipped, warn |
| `{{ 'Hello, ' + name \| t }}` | ⚠ skipped, warn — point to placeholder form |
| `[t]="someVar"` | ⚠ skipped, warn |

### Why we skip concatenation

`'Hello, ' + name | t` cannot be translated correctly: the msgid is incomplete,
word order is hardcoded in the template by the `+` operator, and the pipe
receives a pre-concatenated string at runtime with no boundary information.
The same reason every gettext-style library (Lingui, ttag, react-intl, GNU
xgettext) refuses to extract concatenations. Developers needing parameterized
strings have two ergonomic options, both extractable:

- **TS-side:** `greeting = computed(() => t\`Hello, ${name()}\`)`, then `{{ greeting() }}`
- **Template-side:** `{{ 'Hello, {name}' | t: { name: name() } }}`

### Translator metadata (opt-in)

- `<!-- i18n: explanation for translator -->` — preceding sibling HTML comment
  becomes a Lingui translator comment.
- `{{ 'Open' | t: { $context: 'verb' } }}` — `$context` key is `msgctxt`.
- `{{ 'Welcome' | t: { $id: 'auth.welcome' } }}` — `$id` key is the explicit
  message id (escape hatch for ambiguous source strings).

### ICU in templates

Angular templates can embed raw ICU (`{count, plural, =0 {none} other {#}}`).
v1 rule: ignore raw ICU in templates — developers should use `| tPlural` or
`| tSelect` instead. Documented explicitly in the extractor's README and warned
on at extraction time.

---

## 5. Kitchen-sink demo

A single standalone Angular app, routed. Every route is a small demo of one
API; the sidebar nav is the feature checklist made browsable. Doubles as living
documentation — to learn feature X, click route X.

### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ @tocdk/lingui-angular kitchen sink   [EN] [FR] [DA] [ES (lazy)]      │
├──────────────┬───────────────────────────────────────────────────────┤
│ basics       │                                                       │
│ params       │   <router-outlet />                                   │
│ plural       │                                                       │
│ select       │   ┌─ rendered output ──────────────────────────────┐  │
│ context      │   │ (live translated content)                      │  │
│ explicit ids │   └────────────────────────────────────────────────┘  │
│ lazy load    │                                                       │
│ ssr proof    │   ┌─ source ───────────────────────────────────────┐  │
│ cd proof     │   │ // syntax-highlighted, pulled from the actual  │  │
│ missing      │   │ // source file via import.meta.glob('?raw')    │  │
│              │   └────────────────────────────────────────────────┘  │
├──────────────┴───────────────────────────────────────────────────────┤
│ active: fr · loading: false · catalogs loaded: en, fr, da            │
└──────────────────────────────────────────────────────────────────────┘
```

### Feature checklist (every demo cell)

| # | Route | API exercised |
|---|---|---|
| 1 | `/basic` | `t\`Hello\`` in TS via `computed()` + `{{ 'Welcome' \| t }}` + `[t]="'About'"` |
| 2 | `/params` | `t\`Hello, ${name()}\`` (TS) + `{{ 'Hello, {name}' \| t: { name: name() } }}` (template) |
| 3 | `/plural` | `plural(count, { one, other })` (TS) + `\| tPlural` (template) |
| 4 | `/select` | `select(value, { ..., other })` (TS) + `\| tSelect` (template) |
| 5 | `/context` | Same word `"Open"` translated differently with two `$context` values |
| 6 | `/explicit-id` | `$id: 'auth.welcome'` — escape hatch when the source string is ambiguous |
| 7 | `/lazy` | Spanish catalog only `import()`-ed when this route is visited; route guard awaits `activate('es')` |
| 8 | `/ssr` | "Rendered on: server / client" banner; translated content visible before hydration (proves `TransferState`) |
| 9 | `/cd` | A `setInterval` increments a signal every 1s, embedded in a translated `t\`Count: ${n()}\``; smooth re-render proves zoneless + signals + Lingui play together |
| 10 | `/missing` | A string deliberately absent from the FR catalog; demo shows fallback to source locale + the expected console warning |

### Shell file layout

```
projects/kitchen-sink/
├── src/
│   ├── app/
│   │   ├── app.component.ts                # shell: header + sidebar + outlet + status-bar
│   │   ├── app.routes.ts
│   │   ├── shared/
│   │   │   ├── locale-switcher.component.ts
│   │   │   ├── demo-page.component.ts      # wrapper: rendered output + source view
│   │   │   └── status-bar.component.ts
│   │   └── features/
│   │       ├── basic.component.ts
│   │       ├── params.component.ts
│   │       ├── plural.component.ts
│   │       ├── select.component.ts
│   │       ├── context.component.ts
│   │       ├── explicit-id.component.ts
│   │       ├── lazy.component.ts
│   │       ├── ssr.component.ts
│   │       ├── cd.component.ts
│   │       └── missing.component.ts
│   ├── locales/
│   │   ├── en.po    ├── fr.po    ├── da.po    ├── es.po
│   ├── main.ts                              # client entry
│   └── main.server.ts                       # SSR entry
├── server.ts                                # Express/H3 SSR
├── lingui.config.ts                         # Lingui CLI config
└── README.md
```

### CI checks against the demo

- `npm run build:demo` — client production build, must succeed and stay within
  a budget tracked in `angular.json` (exact threshold set at scaffold time, not
  in this spec — Angular shell + router + Lingui realistically lands in the
  100–200 KB initial-JS range).
- `npm run build:demo:ssr` — SSR build, must succeed.
- `npm run extract:check` — runs the extractor and diffs against committed
  expected PO snapshots; fails if any feature route's strings drift unexpectedly.

### Explicitly out of scope for v1

- Playwright e2e against the demo. Vitest + extractor snapshot tests cover
  regression at a fraction of the CI cost. Add later if usage warrants.
- Visual polish / theming. The kitchen sink is a reference, not a marketing
  page. Minimal CSS, default fonts, clean enough.

---

## 6. Testing strategy

### Framework

Vitest with `@analogjs/vite-plugin-angular` for everything that needs Angular
DI / change detection. Node environment for the extractor (pure Node code),
jsdom for everything Angular.

### Vitest projects (mixed environments)

```typescript
// vitest.config.ts (workspace root)
export default defineConfig({
  plugins: [angular()],
  test: {
    coverage: {
      provider: 'v8',
      include: ['projects/lingui-angular/src/lib/**', 'projects/lingui-angular/extractor/**'],
      thresholds: { lines: 90, branches: 85, functions: 90, statements: 90 },
    },
    projects: [
      { name: 'lib',       root: 'projects/lingui-angular/src/lib',     environment: 'jsdom' },
      { name: 'extractor', root: 'projects/lingui-angular/extractor',   environment: 'node' },
      { name: 'ssr',       root: 'projects/lingui-angular/src/lib/ssr', environment: 'node' },
    ],
  },
});
```

### Test layout (colocated specs, mirror of source)

```
projects/lingui-angular/
├── src/lib/
│   ├── lingui.service.ts          + .spec.ts
│   ├── provide-lingui.ts          + .spec.ts
│   ├── pipes/
│   │   ├── t.pipe.ts              + .spec.ts
│   │   ├── t-plural.pipe.ts       + .spec.ts
│   │   └── t-select.pipe.ts       + .spec.ts
│   ├── directives/
│   │   └── t.directive.ts         + .spec.ts
│   └── ssr/
│       └── transfer-state.ts      + .spec.ts
└── extractor/
    ├── walk-template.ts           + .spec.ts
    ├── extract-templates.ts       + .spec.ts
    └── fixtures/
        ├── basic.html             → basic.expected.ts
        ├── params.html            → params.expected.ts
        ├── plural.html            → plural.expected.ts
        ├── context.html           → context.expected.ts
        ├── select.html            → select.expected.ts
        ├── directive.html         → directive.expected.ts
        └── invalid.html           → invalid.expected.warnings.json
```

### Per-spec invariants

#### `lingui.service.spec.ts`

- `activate('fr')` calls `loader('fr')` exactly once, then `i18n.load + i18n.activate`,
  then flips the `locale` signal.
- `activate('fr')` called twice → loader invoked once (catalog cache).
- `activate('xx')` for unknown locale rejects with a typed `LinguiUnknownLocaleError`.
- `loading` signal sequence: `false → true → false`, both on success and on rejection.
- `t$('msg')` is a `Signal<string>` that re-emits on locale change.
- Fallback: `'fr-CA' → 'fr'` via `fallbackLocales`.

#### `provide-lingui.spec.ts`

- `detectLocale` is invoked once at bootstrap; result is fed to initial `activate()`.
- Without `detectLocale`, `sourceLocale` becomes the initial active locale.
- Two separate injectors → two independent `LinguiService` instances (micro-frontend safety).

#### `t.pipe.spec.ts`

- Pure: same `(message, values)` twice → identical reference (cache hit).
- Reactive: render in TestBed, switch locale, expect text updated within one CD tick.
- Handles `$context`, `$id`, and combined `{ ...values, $context }`.
- Untranslated key falls through to source-locale message.

#### `t-plural.pipe.spec.ts`

- Resolves correct plural form for active locale's rules (English: 0/1/n; Polish: 0/1/2–4/many).
- `0` resolves to `'zero'` when defined, else `'other'`.
- Missing `'other'` is a typed error caught at pipe construction (config error, fail loud).

#### `t-select.pipe.spec.ts`

- Matches by key, falls through to `'other'`.
- Missing `'other'` → typed error.

#### `t.directive.spec.ts`

- `[t]="'Hello'"` sets `host.textContent` to translated string.
- Locale change triggers re-render (via `effect()` reading `locale` signal).
- Required input enforced (compile time + runtime guard).

#### `transfer-state.spec.ts`

- Server: `serializeCatalog(i18n, key)` writes `{ locale, messages }` into `TransferState`.
- Client: `hydrateCatalog(state, key)` populates `i18n` without a network fetch.
- Round-trip: server serialize → client hydrate produces byte-identical `i18n.messages`.

#### `walk-template.spec.ts` + `extract-templates.spec.ts`

- Each `fixtures/<name>.html` → emit matches `fixtures/<name>.expected.ts` (file
  snapshot via `toMatchFileSnapshot`).
- `invalid.html` → no shim; warnings match `invalid.expected.warnings.json`
  (capture: line, column, reason).
- `<!-- i18n: comment -->` preceding sibling becomes a Lingui translator comment.
- `// @source:` location pragmas point to the right `.html:line:col`.

### Coverage targets

- Library `src/lib/`: ≥90% lines, ≥85% branches.
- Extractor: ≥90% lines (fixtures should hit every walker branch).
- Kitchen sink: **no coverage requirement** — exercised by `npm run build:demo` succeeding.

### Test commands

```json
{
  "test":             "vitest run",
  "test:watch":       "vitest",
  "test:coverage":    "vitest run --coverage",
  "test:lib":         "vitest run --project lib",
  "test:extractor":   "vitest run --project extractor",
  "test:ssr":         "vitest run --project ssr"
}
```

### Out of scope (trusted upstream)

- `@lingui/core` itself — peer dep, has its own tests.
- Angular's signal CD / standalone APIs — trusted upstream.
- ng-packagr build output beyond "produces a valid `package.json` with the right
  entry points" — one-line CI smoke.

---

## 7. Packaging, CI, distribution, license

### Distribution: github-install, no npm publish

**The package is not published to npm.** Consumers install from the GitHub
repo directly:

```bash
# latest from main
npm i github:tocDK/lingui-angular

# pinned to a release tag
npm i github:tocDK/lingui-angular#v0.1.0
```

Trade-offs of this choice (made deliberately):

- ✅ No `@tocdk` npm scope to register, no `NPM_TOKEN` to manage, no publish workflow.
- ✅ Consumers can install any commit, branch, or tag — easy for dogfooding.
- ⚠ Each install builds the library locally via a `prepare` script (~30s, one-time).
- ⚠ Consumers pull in our `devDependencies` (ng-packagr, typescript, etc.) — ~hundreds of MB of nested deps. Acceptable for a personal/internal-leaning library; would change if we later open to wide adoption.

### Build: ng-packagr

The only sane choice for an Angular library. One workspace, two entry points
(root runtime, `./extractor` subpath).

The **workspace-root `package.json`** doubles as the library's package.json
(since `npm i github:...` installs the repo root). A `prepare` script builds
the library on install; `exports` points into the built `dist/` tree.

```json
// /package.json  (workspace root + library entry)
{
  "name": "@tocdk/lingui-angular",
  "version": "0.1.0",
  "license": "MIT",
  "scripts": {
    "prepare": "ng build lingui-angular --configuration=production",
    "...": "..."
  },
  "exports": {
    ".":           { "types": "./dist/lingui-angular/index.d.ts",           "default": "./dist/lingui-angular/fesm2022/tocdk-lingui-angular.mjs" },
    "./extractor": { "types": "./dist/lingui-angular/extractor/index.d.ts", "default": "./dist/lingui-angular/extractor/index.mjs" }
  },
  "bin": { "lingui-angular": "./dist/lingui-angular/extractor/bin.mjs" },
  "peerDependencies": {
    "@angular/core": "^20.0.0",
    "@angular/common": "^20.0.0",
    "@lingui/core": "^6.0.0"
  },
  "peerDependenciesMeta": {
    "@angular/compiler": { "optional": true },
    "@lingui/cli":       { "optional": true }
  }
}
```

The `./extractor` subpath needs `@angular/compiler` and `@lingui/cli` at
build-time only; optional-peer keeps them out of the runtime install footprint.

> npm DOES install `devDependencies` when running `prepare` on a git install
> (per the npm install lifecycle), so ng-packagr et al. will be available.

### Workspace `tsconfig.json` paths

So the kitchen sink imports the library from source during dev, no rebuild loop:

```json
"paths": {
  "@tocdk/lingui-angular":           ["./projects/lingui-angular/src/public-api.ts"],
  "@tocdk/lingui-angular/extractor": ["./projects/lingui-angular/extractor/index.ts"]
}
```

### Scripts (root `package.json`)

```json
{
  "start":          "ng serve kitchen-sink",
  "build":          "npm run build:lib && npm run build:demo",
  "build:lib":      "ng build lingui-angular --configuration=production",
  "build:demo":     "ng build kitchen-sink --configuration=production",
  "build:demo:ssr": "ng build kitchen-sink --configuration=production --ssr",
  "watch:lib":      "ng build lingui-angular --watch",
  "test":           "vitest run",
  "test:watch":     "vitest",
  "test:coverage":  "vitest run --coverage",
  "lint":           "ng lint",
  "extract":        "lingui-angular extract && lingui extract && lingui-angular clean",
  "extract:watch":  "lingui-angular extract --watch & lingui extract --watch",
  "extract:check":  "lingui-angular extract && lingui extract --clean && git diff --exit-code projects/kitchen-sink/src/locales"
}
```

`extract:check` is the extractor regression test in CI — it re-extracts the
kitchen sink, then `git diff` fails if the PO catalogs drift unexpectedly.

### License

**MIT.** Single `LICENSE` file at repo root, copied into `dist/` by ng-packagr.
Matches Lingui's license and existing tocDK repos.

### CI — GitHub Actions

`.github/workflows/ci.yml` — push to main, PRs:

```yaml
jobs:
  lint:          # ng lint
  test:          # vitest run --coverage (matrix: node 20, 22)
  build-lib:     # ng build lingui-angular + validate dist/ shape
  build-demo:    # ng build kitchen-sink (client) + ng build kitchen-sink --ssr
  extract-check: # npm run extract:check
```

`.github/workflows/release.yml` — tag push `v*`:

```yaml
jobs:
  release:
    - npm ci
    - npm test
    - npm run build:lib
    - npm run build:demo
    - gh release create ${TAG} --generate-notes
```

No npm publish step, no `NPM_TOKEN` secret. The release workflow exists to
gate tags behind a green build and produce a GitHub Release for changelog
visibility — that's it. Consumers install via `npm i github:tocDK/lingui-angular#${TAG}`.

### Versioning & releases

- SemVer.
- Start at `v0.1.0`; pre-`v1.0.0` allows breaking changes on minor bumps.
- `v1.0.0` after first external user or 4 weeks of dogfooding without API change.
- Manual `npm version <patch|minor|major>` → `git push --follow-tags` triggers
  the release workflow (creates a GitHub Release; does NOT publish to npm).
- Hand-curated `CHANGELOG.md` (Keep-a-Changelog format). No changesets / no
  semantic-release until the project earns the tooling overhead.
- If we later decide to publish to npm, the `prepare` script is removed and a
  `npm publish dist/lingui-angular --access public` step is added. The
  workspace-root vs library `package.json` split would also be re-introduced.

### Code conventions

- ESLint: `@angular-eslint/recommended` + `@typescript-eslint/strict`.
- Prettier: Angular CLI defaults (2-space, single quotes, semicolons).
- Conventional Commits enforced **socially**, not via Husky/commitlint at v0
  (one-person project — hooks are noise).

### README structure (ships day one alongside scaffold)

1. **What & why** — one paragraph.
2. **Install** — `npm i github:tocDK/lingui-angular @lingui/core` + peer-dep
   note + a short callout that the package is not on npm and the install
   builds the library locally on first run.
3. **60-second quickstart** — bootstrap → component → switcher.
4. **Templates** — `| t` pipe and `[t]` directive (placeholder + context examples).
5. **Plural / select.**
6. **Extraction setup** — `lingui.config.ts` + scripts.
7. **SSR notes** — `TransferState` wired up, no FOUC.
8. **Reference: kitchen sink** — link to GitHub Pages deployment of the built demo.
9. **Comparison with ngx-translate / transloco / @angular/localize** — 3-row table.
10. **Contributing** — link to `CONTRIBUTING.md`.
11. **License (MIT).**

### Repo housekeeping files

- `LICENSE` (MIT)
- `README.md`
- `CONTRIBUTING.md` — brief: how to run tests, how to extract, branch conventions.
- `CHANGELOG.md` — starts empty.
- `.editorconfig`, `.prettierrc`, `.eslintrc`, `.gitignore`, `.nvmrc` (node 22)
- `.github/ISSUE_TEMPLATE/{bug,feature}.md`, `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/{ci,release}.yml`

---

## Decision summary

| | |
|---|---|
| **GitHub** | `tocDK/lingui-angular` (public) |
| **Distribution** | github-install only — `npm i github:tocDK/lingui-angular[#tag]`; not published to npm. Package `name` stays `@tocdk/lingui-angular` for cosmetic lockfile identity. Subpath `./extractor` exposed via `exports`. |
| **License** | MIT |
| **Angular target** | `^20.0.0`, zoneless, signal-only, standalone-only |
| **Workspace** | Angular CLI, `projects/lingui-angular/` + `projects/kitchen-sink/` |
| **Test framework** | Vitest + `@analogjs/vite-plugin-angular` |
| **Build** | ng-packagr (FESM2022, two entry points) |
| **Extraction** | Lingui CLI for TS, custom ~150-LoC walker for templates (emits TS shims) |
| **API** | `provideLingui`, `LinguiService` (signals), `\| t` + `\| tPlural` + `\| tSelect` pipes (pure), `[t]` directive, `t/plural/select` re-exports |
| **Template DX** | `{{ 'Hello, {name}' \| t: { name: name(), $context: 'verb' } }}` |
| **SSR** | `TransferState` handoff, no FOUC |
| **Local dev path** | `/Users/toc/git/tivedo/lingui-angular/` |
| **CI** | GH Actions: lint, test, build-lib, build-demo (client + SSR), extract-check; release on tag |

---

## Open questions / deferred

- **GitHub Pages deployment of the kitchen sink** — README references it, but
  the deploy workflow is out of v1 scope. Add as v0.2 follow-up.
- **Lingui peer range** — current peer is `^6.0.0` (`@lingui/core` is at v6.1.0
  as of June 2026). Re-validate at scaffold time and broaden to `^6.0.0 || ^7.0.0`
  if a v7 ships before our first release.
- **`prepare`-on-install footprint** — every consumer install rebuilds the
  library and pulls our devDeps. If footprint becomes a problem (CI cost,
  install times on shared machines), switch to a dedicated `release` branch
  with built `dist/` committed, installed via `#release/v0.1.0`.
- **v2: full `i18n` attribute extraction** — `<h1 i18n>Hello</h1>` parsing.
  Multi-month subproject; revisit only if community asks.
- **v2: migrate to npm publish** — if the library gets external users, switch
  to a proper npm publish flow (remove `prepare`, re-split workspace-root
  and library `package.json`, add `NPM_TOKEN` + publish step to release.yml).
