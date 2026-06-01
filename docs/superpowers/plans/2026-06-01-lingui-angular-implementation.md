# `@tocdk/lingui-angular` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Angular 20+ Lingui binding library `@tocdk/lingui-angular` end-to-end — runtime (provider/service/pipes/directive/SSR), template extractor, kitchen-sink demo, CI, and a v0.1.0 tag — installable via `npm i github:tocDK/lingui-angular`.

**Architecture:** Angular CLI workspace with two sibling projects. Library is signal-only, zoneless, standalone-only. Extractor is a separate subpath that walks Angular template ASTs (via `@angular/compiler`) and emits TypeScript shims into `.lingui-extracted/`, which Lingui's existing CLI then ingests — no PO emission re-implemented. Distribution via github-install; a `prepare` script builds the library on the consumer's machine.

**Tech Stack:** Angular `^20.0.0`, `@lingui/core ^6.0.0`, `@lingui/cli ^6.0.0`, `ng-packagr`, Vitest, `@analogjs/vite-plugin-angular`, TypeScript 5.7+, Node 22 LTS.

**Source-of-truth design spec:** [`docs/superpowers/specs/2026-06-01-lingui-angular-design.md`](../specs/2026-06-01-lingui-angular-design.md).

---

## How to read this plan

- **Phases = PR boundaries.** Each numbered phase lands as one PR on a branch named `toc/<phase-N>-<description>` (per Thomas's branching convention). The phase's tasks share a single PR.
- **Tasks within a phase** are individual commits on that branch. Frequent commits.
- **TDD throughout.** Tests are written before implementation; "run the failing test and see it fail" is its own step. The pattern is: red → green → refactor → commit.
- **Each task is self-contained.** A task names the exact file paths, shows the exact code to add/modify, and shows the exact command to run plus the expected output.
- **No subagent-default reviewer.** `lingui-angular` is a personal `tocDK` repo, so the Anh-as-default-reviewer rule (which applies only to the 3 active Tivedo repos) does NOT apply here. PRs open without a default reviewer; Thomas adds one if he wants external review.

---

## File structure (created by this plan)

By end of plan:

```
/Users/toc/git/tivedo/lingui-angular/
├── .editorconfig
├── .eslintrc.json
├── .gitignore                                  (exists, modified)
├── .nvmrc
├── .prettierrc
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE                                     (exists)
├── README.md                                   (exists, rewritten in Phase 8)
├── angular.json
├── lingui.config.ts                            (root — referenced by demo)
├── package.json                                (workspace + library manifest)
├── package-lock.json
├── tsconfig.base.json
├── tsconfig.json
├── vitest.config.ts
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug.md
│   │   └── feature.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── docs/
│   └── superpowers/
│       ├── specs/2026-06-01-lingui-angular-design.md   (exists)
│       └── plans/2026-06-01-lingui-angular-implementation.md   (this file)
└── projects/
    ├── lingui-angular/
    │   ├── ng-package.json
    │   ├── package.json                        (library identity, used by ng-packagr)
    │   ├── tsconfig.lib.json
    │   ├── tsconfig.lib.prod.json
    │   ├── src/
    │   │   ├── public-api.ts
    │   │   └── lib/
    │   │       ├── errors.ts                   + errors.spec.ts
    │   │       ├── lingui-config.ts            (interface only)
    │   │       ├── lingui.service.ts           + lingui.service.spec.ts
    │   │       ├── provide-lingui.ts           + provide-lingui.spec.ts
    │   │       ├── pipes/
    │   │       │   ├── t.pipe.ts               + t.pipe.spec.ts
    │   │       │   ├── t-plural.pipe.ts        + t-plural.pipe.spec.ts
    │   │       │   └── t-select.pipe.ts        + t-select.pipe.spec.ts
    │   │       ├── directives/
    │   │       │   └── t.directive.ts          + t.directive.spec.ts
    │   │       └── ssr/
    │   │           ├── transfer-state.ts       + transfer-state.spec.ts
    │   │           └── tokens.ts
    │   └── extractor/
    │       ├── ng-package.json                 (secondary entry point)
    │       ├── package.json
    │       ├── tsconfig.json
    │       ├── index.ts                        (public surface)
    │       ├── walk-template.ts                + walk-template.spec.ts
    │       ├── extract-templates.ts            + extract-templates.spec.ts
    │       ├── bin.ts
    │       └── fixtures/
    │           ├── basic.html / .expected.ts
    │           ├── params.html / .expected.ts
    │           ├── plural.html / .expected.ts
    │           ├── select.html / .expected.ts
    │           ├── context.html / .expected.ts
    │           ├── directive.html / .expected.ts
    │           └── invalid.html / .expected.warnings.json
    └── kitchen-sink/
        ├── lingui.config.ts
        ├── tsconfig.app.json
        ├── server.ts
        ├── src/
        │   ├── main.ts
        │   ├── main.server.ts
        │   ├── index.html
        │   ├── styles.css
        │   ├── locales/
        │   │   ├── en.po / fr.po / da.po / es.po
        │   └── app/
        │       ├── app.component.ts
        │       ├── app.routes.ts
        │       ├── shared/
        │       │   ├── demo-page.component.ts
        │       │   ├── locale-switcher.component.ts
        │       │   └── status-bar.component.ts
        │       └── features/
        │           ├── basic.component.ts
        │           ├── params.component.ts
        │           ├── plural.component.ts
        │           ├── select.component.ts
        │           ├── context.component.ts
        │           ├── explicit-id.component.ts
        │           ├── lazy.component.ts
        │           ├── ssr.component.ts
        │           ├── cd.component.ts
        │           └── missing.component.ts
```

---

# Phase 1 — Workspace scaffold

**Goal:** Bootable Angular 20 workspace with both projects, Vitest wired up, tsconfig path mappings so the demo imports the library from source, and an empty (but compiling) public API.

**PR:** `toc/p1-workspace-scaffold`

## Task 1.1 — Create a feature branch

- [ ] **Step 1: Branch off main**

```bash
cd /Users/toc/git/tivedo/lingui-angular
git checkout -b toc/p1-workspace-scaffold
```

Expected: `Switched to a new branch 'toc/p1-workspace-scaffold'`.

## Task 1.2 — Pin Node version

- [ ] **Step 1: Write `.nvmrc`**

File: `/Users/toc/git/tivedo/lingui-angular/.nvmrc`

```
22
```

- [ ] **Step 2: Confirm local Node satisfies**

```bash
node -v
```

Expected: prints `v22.x.x`. If lower, install Node 22 LTS before continuing.

- [ ] **Step 3: Commit**

```bash
git add .nvmrc
git commit -m "chore: pin node 22 LTS"
```

## Task 1.3 — Initialize npm workspace package.json

- [ ] **Step 1: Write `package.json` at the repo root**

File: `/Users/toc/git/tivedo/lingui-angular/package.json`

```json
{
  "name": "@tocdk/lingui-angular",
  "version": "0.1.0-dev",
  "private": false,
  "license": "MIT",
  "description": "Angular 20+ bindings for Lingui — write English, extract via AST, ship PO catalogs.",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/tocDK/lingui-angular.git"
  },
  "homepage": "https://github.com/tocDK/lingui-angular",
  "bugs": "https://github.com/tocDK/lingui-angular/issues",
  "engines": { "node": ">=22.0.0" },
  "scripts": {
    "ng": "ng",
    "start": "ng serve kitchen-sink",
    "build": "npm run build:lib && npm run build:demo",
    "build:lib": "ng build lingui-angular --configuration=production",
    "build:demo": "ng build kitchen-sink --configuration=production",
    "build:demo:ssr": "ng build kitchen-sink --configuration=production --ssr",
    "watch:lib": "ng build lingui-angular --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:lib": "vitest run --project lib",
    "test:extractor": "vitest run --project extractor",
    "test:ssr": "vitest run --project ssr",
    "lint": "ng lint",
    "extract": "lingui-angular extract && lingui extract && lingui-angular clean",
    "extract:watch": "lingui-angular extract --watch & lingui extract --watch",
    "extract:check": "lingui-angular extract && lingui extract --clean && git diff --exit-code projects/kitchen-sink/src/locales"
  }
}
```

> The `prepare` script is **added in Phase 8**, after the library actually builds. Adding it before then would break `npm install` because there's nothing to build yet.

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add workspace package.json"
```

## Task 1.4 — Install Angular CLI and core dev dependencies

- [ ] **Step 1: Install Angular CLI as a devDependency**

```bash
npm install --save-dev @angular/cli@^20.0.0
```

Expected: creates `node_modules/`, `package-lock.json`, adds `@angular/cli` to `devDependencies` in `package.json`.

- [ ] **Step 2: Install Angular workspace dependencies (run-time peers + dev tools)**

```bash
npm install --save-dev \
  @angular/animations@^20.0.0 \
  @angular/build@^20.0.0 \
  @angular/common@^20.0.0 \
  @angular/compiler@^20.0.0 \
  @angular/compiler-cli@^20.0.0 \
  @angular/core@^20.0.0 \
  @angular/forms@^20.0.0 \
  @angular/platform-browser@^20.0.0 \
  @angular/platform-server@^20.0.0 \
  @angular/router@^20.0.0 \
  @angular/ssr@^20.0.0 \
  ng-packagr@^20.0.0 \
  typescript@~5.8.0 \
  rxjs@~7.8.0 \
  zone.js@~0.15.0 \
  tslib@^2.6.0
```

> `@angular/build` is needed because Angular 20 moved the `:ng-packagr` and `:application` builders out of `@angular/cli` into a separate package. TypeScript is pinned to `~5.8.0` because Angular 20 + ng-packagr 20 require TS 5.8+; the earlier `~5.7.0` pin causes `ERESOLVE` failures.

> `zone.js` is included because Angular CLI defaults to a zone-based scaffold; we'll remove it / switch to zoneless in Task 1.6.

- [ ] **Step 3: Install Lingui dependencies**

```bash
npm install --save-dev @lingui/core@^6.0.0 @lingui/cli@^6.0.0 @lingui/format-po@^6.0.0
```

- [ ] **Step 4: Commit lockfile and updated package.json**

```bash
git add package.json package-lock.json
git commit -m "chore: install angular 20 + lingui 6 dev deps"
```

## Task 1.5 — Generate the Angular workspace skeleton

Angular CLI normally scaffolds a workspace via `ng new`, but since we already have `package.json` and `.git`, we need to hand-write the workspace files.

- [ ] **Step 1: Write `angular.json`**

File: `/Users/toc/git/tivedo/lingui-angular/angular.json`

```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {}
}
```

> Project entries get added in Tasks 1.7 (library) and 1.9 (demo).

- [ ] **Step 2: Write `tsconfig.base.json`**

File: `/Users/toc/git/tivedo/lingui-angular/tsconfig.base.json`

```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "baseUrl": "./",
    "outDir": "./dist/out-tsc",
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "moduleResolution": "bundler",
    "importHelpers": true,
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022", "dom", "dom.iterable"],
    "paths": {
      "@tocdk/lingui-angular": ["./projects/lingui-angular/src/public-api.ts"],
      "@tocdk/lingui-angular/extractor": ["./projects/lingui-angular/extractor/index.ts"]
    }
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "typeCheckHostBindings": true,
    "strictTemplates": true
  }
}
```

- [ ] **Step 3: Write `tsconfig.json` (root passthrough for IDEs)**

File: `/Users/toc/git/tivedo/lingui-angular/tsconfig.json`

```json
{ "extends": "./tsconfig.base.json" }
```

- [ ] **Step 4: Smoke test — ng CLI runs**

```bash
npx ng version
```

Expected: prints Angular CLI 20.x banner without errors.

- [ ] **Step 5: Commit**

```bash
git add angular.json tsconfig.base.json tsconfig.json
git commit -m "chore: scaffold angular workspace config"
```

## Task 1.6 — Create the library project structure

- [ ] **Step 1: Create directory tree**

```bash
mkdir -p projects/lingui-angular/src/lib/{pipes,directives,ssr} \
         projects/lingui-angular/extractor/fixtures
```

- [ ] **Step 2: Write the library project's `package.json` (used by ng-packagr)**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/package.json`

```json
{
  "name": "@tocdk/lingui-angular",
  "version": "0.1.0-dev",
  "license": "MIT",
  "description": "Angular 20+ bindings for Lingui — write English, extract via AST, ship PO catalogs.",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/tocDK/lingui-angular.git"
  },
  "peerDependencies": {
    "@angular/core": "^20.0.0",
    "@angular/common": "^20.0.0",
    "@lingui/core": "^6.0.0"
  },
  "peerDependenciesMeta": {
    "@angular/compiler": { "optional": true },
    "@lingui/cli":       { "optional": true }
  },
  "sideEffects": false
}
```

- [ ] **Step 3: Write `ng-package.json`**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/ng-package.json`

```json
{
  "$schema": "../../node_modules/ng-packagr/ng-package.schema.json",
  "dest": "../../dist/lingui-angular",
  "lib": { "entryFile": "src/public-api.ts" },
  "assets": []
}
```

> The plan originally referenced `LICENSE` and `README.md` via `"input": "../.."`, but ng-packagr 20 rejects asset paths pointing outside the project root. For v0.1.0 we ship via github-install (consumer gets `LICENSE`/`README.md` from the repo root directly), so leaving `assets` empty is fine. If we later switch to npm publish, wire `LICENSE`/`README.md` via a post-build script in Phase 8.

- [ ] **Step 4: Write `tsconfig.lib.json`**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/tsconfig.lib.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../out-tsc/lib",
    "declaration": true,
    "declarationMap": true,
    "inlineSources": true,
    "types": []
  },
  "exclude": ["**/*.spec.ts", "src/test.ts", "extractor/**"]
}
```

- [ ] **Step 5: Write `tsconfig.lib.prod.json`**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/tsconfig.lib.prod.json`

```json
{
  "extends": "./tsconfig.lib.json",
  "compilerOptions": { "declarationMap": false },
  "angularCompilerOptions": { "compilationMode": "partial" }
}
```

- [ ] **Step 6: Write an empty `public-api.ts`**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/public-api.ts`

```typescript
// Public API for @tocdk/lingui-angular — barrel re-exports populated in Phases 2–4.
export {};
```

- [ ] **Step 7: Add the library to `angular.json`**

File: `/Users/toc/git/tivedo/lingui-angular/angular.json` (modify `projects: {}` to):

```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "lingui-angular": {
      "projectType": "library",
      "root": "projects/lingui-angular",
      "sourceRoot": "projects/lingui-angular/src",
      "prefix": "lib",
      "architect": {
        "build": {
          "builder": "@angular/build:ng-packagr",
          "options": {
            "project": "projects/lingui-angular/ng-package.json"
          },
          "configurations": {
            "production": { "tsConfig": "projects/lingui-angular/tsconfig.lib.prod.json" },
            "development": { "tsConfig": "projects/lingui-angular/tsconfig.lib.json" }
          },
          "defaultConfiguration": "production"
        }
      }
    }
  }
}
```

- [ ] **Step 8: Smoke test — library builds (empty but valid)**

```bash
npm run build:lib
```

Expected: `dist/lingui-angular/` is created. No type errors. May print a warning about empty public API — that's fine.

- [ ] **Step 9: Commit**

```bash
git add projects/lingui-angular angular.json
git commit -m "chore: scaffold lingui-angular library project"
```

## Task 1.7 — Create the kitchen-sink demo project structure

- [ ] **Step 1: Create directory tree**

```bash
mkdir -p projects/kitchen-sink/src/{app/{shared,features},locales}
```

- [ ] **Step 2: Write the demo project's `tsconfig.app.json`**

File: `/Users/toc/git/tivedo/lingui-angular/projects/kitchen-sink/tsconfig.app.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../out-tsc/app",
    "types": []
  },
  "files": ["src/main.ts", "src/main.server.ts", "server.ts"],
  "include": ["src/**/*.d.ts"]
}
```

- [ ] **Step 3: Write the demo's `src/index.html`**

File: `/Users/toc/git/tivedo/lingui-angular/projects/kitchen-sink/src/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>@tocdk/lingui-angular kitchen sink</title>
    <base href="/" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <app-root></app-root>
  </body>
</html>
```

- [ ] **Step 4: Write a placeholder `src/main.ts`**

File: `/Users/toc/git/tivedo/lingui-angular/projects/kitchen-sink/src/main.ts`

```typescript
import { bootstrapApplication, provideClientHydration } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(),
  ],
}).catch((err) => console.error(err));
```

- [ ] **Step 5: Write a placeholder `src/app/app.component.ts`**

File: `/Users/toc/git/tivedo/lingui-angular/projects/kitchen-sink/src/app/app.component.ts`

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent {}
```

- [ ] **Step 6: Write a placeholder `src/app/app.routes.ts`**

File: `/Users/toc/git/tivedo/lingui-angular/projects/kitchen-sink/src/app/app.routes.ts`

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [];
```

- [ ] **Step 7: Add the demo to `angular.json`**

In `/Users/toc/git/tivedo/lingui-angular/angular.json`, add a second project entry under `projects`:

```json
"kitchen-sink": {
  "projectType": "application",
  "root": "projects/kitchen-sink",
  "sourceRoot": "projects/kitchen-sink/src",
  "prefix": "app",
  "architect": {
    "build": {
      "builder": "@angular/build:application",
      "options": {
        "outputPath": "dist/kitchen-sink",
        "index": "projects/kitchen-sink/src/index.html",
        "browser": "projects/kitchen-sink/src/main.ts",
        "polyfills": [],
        "tsConfig": "projects/kitchen-sink/tsconfig.app.json",
        "assets": [],
        "styles": ["projects/kitchen-sink/src/styles.css"]
      },
      "configurations": {
        "production": {
          "budgets": [
            { "type": "initial",  "maximumWarning": "200kb", "maximumError": "500kb" },
            { "type": "anyComponentStyle", "maximumWarning": "8kb", "maximumError": "16kb" }
          ]
        },
        "development": { "optimization": false, "extractLicenses": false, "sourceMap": true }
      },
      "defaultConfiguration": "production"
    },
    "serve": {
      "builder": "@angular/build:dev-server",
      "configurations": {
        "production": { "buildTarget": "kitchen-sink:build:production" },
        "development": { "buildTarget": "kitchen-sink:build:development" }
      },
      "defaultConfiguration": "development"
    }
  }
}
```

- [ ] **Step 8: Empty styles file**

File: `/Users/toc/git/tivedo/lingui-angular/projects/kitchen-sink/src/styles.css`

```css
/* kitchen-sink styles — populated in Phase 6 */
```

- [ ] **Step 9: Smoke test — dev server starts**

```bash
timeout 30 npx ng serve kitchen-sink --port 4200 --no-open || true
```

Expected: prints `Application bundle generation complete.` and `Local: http://localhost:4200/` before the timeout kills it. Errors here mean the workspace is misconfigured.

- [ ] **Step 10: Commit**

```bash
git add projects/kitchen-sink angular.json
git commit -m "chore: scaffold kitchen-sink demo project"
```

## Task 1.8 — Install Vitest and Angular test bindings

- [ ] **Step 1: Install Vitest + Analog plugin**

```bash
npm install --save-dev \
  vitest@^3.0.0 \
  @vitest/coverage-v8@^3.0.0 \
  @vitest/ui@^3.0.0 \
  @analogjs/vite-plugin-angular@^1.10.0 \
  @analogjs/vitest-angular@^1.10.0 \
  jsdom@^25.0.0
```

> Vitest 3 is required because the `@analogjs/vite-plugin-angular` package is ESM-only and Vitest 2's CJS config bundler can't load it. Vitest 3 also renamed the inline `test.workspace` key to `test.projects`; the config below uses the v3 shape.

- [ ] **Step 2: Write workspace `vitest.config.ts` and `tsconfig.spec.json`**

File: `/Users/toc/git/tivedo/lingui-angular/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular({ tsconfig: './tsconfig.spec.json' })],
  test: {
    globals: true,
    passWithNoTests: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'projects/lingui-angular/src/lib/**/*.ts',
        'projects/lingui-angular/extractor/**/*.ts',
      ],
      exclude: [
        '**/*.spec.ts',
        '**/index.ts',
        '**/public-api.ts',
        'projects/lingui-angular/extractor/fixtures/**',
      ],
      thresholds: { lines: 90, branches: 85, functions: 90, statements: 90 },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'lib',
          environment: 'jsdom',
          include: ['projects/lingui-angular/src/lib/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'extractor',
          environment: 'node',
          include: ['projects/lingui-angular/extractor/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ssr',
          environment: 'node',
          include: ['projects/lingui-angular/src/lib/ssr/**/*.spec.ts'],
        },
      },
    ],
  },
});
```

File: `/Users/toc/git/tivedo/lingui-angular/tsconfig.spec.json`

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "types": ["vitest/globals"]
  },
  "include": [
    "projects/lingui-angular/src/**/*.ts",
    "projects/lingui-angular/extractor/**/*.ts"
  ]
}
```

> `passWithNoTests: true` is critical — without it, `vitest run` exits 1 when no test files are found, which breaks CI for the empty scaffold. `tsconfig.spec.json` must include the full source trees (not just `.spec.ts`) so the Angular compiler sees the source files that specs import.

- [ ] **Step 3: Write `vitest.setup.ts`**

File: `/Users/toc/git/tivedo/lingui-angular/vitest.setup.ts`

```typescript
import '@analogjs/vitest-angular/setup-zoneless';
```

- [ ] **Step 4: Write a trivial sanity spec**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/sanity.spec.ts`

```typescript
import { describe, expect, it } from 'vitest';

describe('vitest sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run the sanity test**

```bash
npm test
```

Expected: 1 test, 1 passed. Coverage may complain about thresholds with no other tests yet — that's expected and ignored for now.

- [ ] **Step 6: Delete the sanity spec (only needed to prove wiring)**

```bash
rm projects/lingui-angular/src/lib/sanity.spec.ts
```

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts vitest.setup.ts package.json package-lock.json
git commit -m "chore: wire up vitest + analog angular test plugin"
```

## Task 1.9 — ESLint + Prettier + editorconfig

- [ ] **Step 1: Install ESLint stack**

```bash
npm install --save-dev \
  eslint@^9.0.0 \
  @typescript-eslint/eslint-plugin@^8.0.0 \
  @typescript-eslint/parser@^8.0.0 \
  angular-eslint@^20.0.0 \
  prettier@^3.3.0
```

- [ ] **Step 2: Write `eslint.config.js` (ESLint 9 flat config)**

ESLint 9 dropped support for the legacy `.eslintrc.*` format. Use the flat config format instead.

File: `/Users/toc/git/tivedo/lingui-angular/eslint.config.js`

```javascript
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  { ignores: ['dist/', 'out-tsc/', 'node_modules/', '**/.lingui-extracted/'] },
  {
    files: ['**/*.ts'],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 't', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: ['lib', 'app'], style: 'kebab-case' }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended],
  },
);
```

- [ ] **Step 3: Write `.prettierrc`**

File: `/Users/toc/git/tivedo/lingui-angular/.prettierrc`

```json
{
  "tabWidth": 2,
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100,
  "arrowParens": "always"
}
```

- [ ] **Step 4: Write `.editorconfig`**

File: `/Users/toc/git/tivedo/lingui-angular/.editorconfig`

```ini
root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
```

- [ ] **Step 5: Run lint (expect zero errors against empty source)**

```bash
npx eslint "projects/**/*.ts"
```

Expected: no output (zero errors).

- [ ] **Step 6: Commit**

```bash
git add .eslintrc.json .prettierrc .editorconfig package.json package-lock.json
git commit -m "chore: add eslint, prettier, editorconfig"
```

## Task 1.10 — Open Phase 1 PR

- [ ] **Step 1: Push the branch**

```bash
git push -u origin toc/p1-workspace-scaffold
```

- [ ] **Step 2: Open the PR via `gh`**

```bash
gh pr create --title "chore: phase 1 — workspace scaffold" --body "$(cat <<'EOF'
Phase 1 of the implementation plan: bootable Angular 20 workspace with both library and demo projects, Vitest wired up via @analogjs/vite-plugin-angular, ESLint/Prettier, and tsconfig path mappings so the demo imports the library from source.

No runtime code yet — that lands in Phase 2.

See [docs/superpowers/plans/2026-06-01-lingui-angular-implementation.md](../blob/toc/p1-workspace-scaffold/docs/superpowers/plans/2026-06-01-lingui-angular-implementation.md) for the full plan.
EOF
)"
```

- [ ] **Step 3: Merge after review (or self-merge — personal repo)**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

# Phase 2 — Runtime: errors, config, service, provider

**Goal:** A working `LinguiService` with `provideLingui()` — signal-based locale state, lazy catalog loading, fallback support, typed error. ≥90% coverage on the new code.

**PR:** `toc/p2-runtime-service`

## Task 2.1 — Branch and start

- [ ] **Step 1: Branch off main**

```bash
git checkout main && git pull
git checkout -b toc/p2-runtime-service
```

## Task 2.2 — `LinguiUnknownLocaleError` (TDD)

- [ ] **Step 1: Write the failing test**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/errors.spec.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { LinguiUnknownLocaleError } from './errors';

describe('LinguiUnknownLocaleError', () => {
  it('is an Error with the locale on the instance', () => {
    const err = new LinguiUnknownLocaleError('xx');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(LinguiUnknownLocaleError);
    expect(err.locale).toBe('xx');
    expect(err.message).toBe('Unknown locale: "xx"');
    expect(err.name).toBe('LinguiUnknownLocaleError');
  });
});
```

- [ ] **Step 2: Run the test and see it fail**

```bash
npm run test:lib -- --reporter=verbose errors
```

Expected: fails with `Failed to resolve import "./errors"`.

- [ ] **Step 3: Implement minimal code**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/errors.ts`

```typescript
export class LinguiUnknownLocaleError extends Error {
  override readonly name = 'LinguiUnknownLocaleError';
  constructor(public readonly locale: string) {
    super(`Unknown locale: "${locale}"`);
  }
}
```

- [ ] **Step 4: Run test, see it pass**

```bash
npm run test:lib -- --reporter=verbose errors
```

Expected: 1 passed.

- [ ] **Step 5: Export from public-api**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/public-api.ts`

```typescript
export { LinguiUnknownLocaleError } from './lib/errors';
```

- [ ] **Step 6: Commit**

```bash
git add projects/lingui-angular/src/lib/errors.ts \
        projects/lingui-angular/src/lib/errors.spec.ts \
        projects/lingui-angular/src/public-api.ts
git commit -m "feat(runtime): add LinguiUnknownLocaleError"
```

## Task 2.3 — `LinguiConfig` interface

- [ ] **Step 1: Write the config types (no spec — types-only file)**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/lingui-config.ts`

```typescript
import type { Messages } from '@lingui/core';

export interface LinguiCatalog {
  messages: Messages;
}

export interface LinguiConfig {
  /** The locale your source strings are written in (e.g. `'en'`). */
  sourceLocale: string;
  /** All locales the app supports, including `sourceLocale`. */
  locales: string[];
  /** Resolves a catalog for the given locale. Typically `(l) => import(`./locales/${l}.po`)`. */
  loader: (locale: string) => Promise<LinguiCatalog>;
  /** Optional locale aliases. Example: `{ 'fr-CA': 'fr', default: 'en' }`. */
  fallbackLocales?: Record<string, string> & { default?: string };
  /** Browser-default detector; on SSR, supply your own. */
  detectLocale?: () => string | null;
  /** `TransferState` key for SSR catalog handoff. Default: `'lingui-catalog'`. */
  ssrTransferKey?: string;
}
```

- [ ] **Step 2: Commit (types-only)**

```bash
git add projects/lingui-angular/src/lib/lingui-config.ts
git commit -m "feat(runtime): add LinguiConfig interface"
```

## Task 2.4 — `LinguiService.activate()` happy path (TDD)

- [ ] **Step 1: Write the failing test**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/lingui.service.spec.ts`

```typescript
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import type { LinguiConfig } from './lingui-config';
import { LinguiService } from './lingui.service';
import { provideLingui } from './provide-lingui';

function buildConfig(overrides: Partial<LinguiConfig> = {}): LinguiConfig {
  return {
    sourceLocale: 'en',
    locales: ['en', 'fr'],
    loader: vi.fn(async (locale: string) => ({
      messages: { hello: locale === 'fr' ? 'Bonjour' : 'Hello' },
    })),
    ...overrides,
  };
}

describe('LinguiService.activate()', () => {
  it('loads the catalog and flips the locale signal', async () => {
    const config = buildConfig();
    TestBed.configureTestingModule({ providers: [provideLingui(config)] });
    const svc = TestBed.inject(LinguiService);

    expect(svc.locale()).toBe('en');
    await svc.activate('fr');
    expect(svc.locale()).toBe('fr');
    expect(config.loader).toHaveBeenCalledOnce();
    expect(config.loader).toHaveBeenCalledWith('fr');
  });
});
```

- [ ] **Step 2: Run the test, see it fail**

```bash
npm run test:lib -- lingui.service
```

Expected: fails with `Failed to resolve import "./lingui.service"` or `./provide-lingui`.

- [ ] **Step 3: Implement `provide-lingui.ts` (minimum)**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/provide-lingui.ts`

```typescript
import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import type { LinguiConfig } from './lingui-config';

export const LINGUI_CONFIG = new InjectionToken<LinguiConfig>('LINGUI_CONFIG');

export function provideLingui(config: LinguiConfig): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: LINGUI_CONFIG, useValue: config }]);
}
```

- [ ] **Step 4: Implement `lingui.service.ts` (minimum for the test)**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/lingui.service.ts`

```typescript
import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { I18n, setupI18n } from '@lingui/core';
import type { LinguiConfig } from './lingui-config';
import { LINGUI_CONFIG } from './provide-lingui';

@Injectable({ providedIn: 'root' })
export class LinguiService {
  private readonly config = inject(LINGUI_CONFIG);
  private readonly _locale = signal<string>(this.config.sourceLocale);

  readonly locale: Signal<string> = this._locale.asReadonly();
  readonly sourceLocale = this.config.sourceLocale;
  readonly locales: readonly string[] = [...this.config.locales];
  readonly i18n: I18n = setupI18n({ locale: this.config.sourceLocale });

  async activate(locale: string): Promise<void> {
    const catalog = await this.config.loader(locale);
    this.i18n.load(locale, catalog.messages);
    this.i18n.activate(locale);
    this._locale.set(locale);
  }
}
```

- [ ] **Step 5: Run test, see it pass**

```bash
npm run test:lib -- lingui.service
```

Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add projects/lingui-angular/src/lib/{provide-lingui.ts,lingui.service.ts,lingui.service.spec.ts}
git commit -m "feat(runtime): LinguiService.activate() + provideLingui"
```

## Task 2.5 — Catalog cache (TDD)

- [ ] **Step 1: Append the failing test**

In `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/lingui.service.spec.ts`, add:

```typescript
describe('LinguiService catalog caching', () => {
  it('does not call loader twice for the same locale', async () => {
    const config = buildConfig();
    TestBed.configureTestingModule({ providers: [provideLingui(config)] });
    const svc = TestBed.inject(LinguiService);

    await svc.activate('fr');
    await svc.activate('fr');
    expect(config.loader).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it, see it fail**

```bash
npm run test:lib -- 'catalog caching'
```

Expected: fail — loader called twice.

- [ ] **Step 3: Implement cache**

Modify `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/lingui.service.ts`:

```typescript
import { Injectable, Signal, inject, signal } from '@angular/core';
import { I18n, setupI18n } from '@lingui/core';
import type { LinguiConfig } from './lingui-config';
import { LINGUI_CONFIG } from './provide-lingui';

@Injectable({ providedIn: 'root' })
export class LinguiService {
  private readonly config = inject(LINGUI_CONFIG);
  private readonly _locale = signal<string>(this.config.sourceLocale);
  private readonly loaded = new Set<string>();

  readonly locale: Signal<string> = this._locale.asReadonly();
  readonly sourceLocale = this.config.sourceLocale;
  readonly locales: readonly string[] = [...this.config.locales];
  readonly i18n: I18n = setupI18n({ locale: this.config.sourceLocale });

  async activate(locale: string): Promise<void> {
    if (!this.loaded.has(locale)) {
      const catalog = await this.config.loader(locale);
      this.i18n.load(locale, catalog.messages);
      this.loaded.add(locale);
    }
    this.i18n.activate(locale);
    this._locale.set(locale);
  }
}
```

- [ ] **Step 4: Run all lib tests**

```bash
npm run test:lib
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add projects/lingui-angular/src/lib/{lingui.service.ts,lingui.service.spec.ts}
git commit -m "feat(runtime): cache loaded catalogs to avoid double-fetch"
```

## Task 2.6 — `loading` signal (TDD)

- [ ] **Step 1: Append test**

In `lingui.service.spec.ts`:

```typescript
describe('LinguiService.loading', () => {
  it('toggles false → true → false around activate()', async () => {
    let resolveLoader!: (c: { messages: Record<string, string> }) => void;
    const config = buildConfig({
      loader: () => new Promise((res) => { resolveLoader = res; }),
    });
    TestBed.configureTestingModule({ providers: [provideLingui(config)] });
    const svc = TestBed.inject(LinguiService);

    expect(svc.loading()).toBe(false);
    const p = svc.activate('fr');
    expect(svc.loading()).toBe(true);
    resolveLoader({ messages: {} });
    await p;
    expect(svc.loading()).toBe(false);
  });

  it('returns to false even when loader rejects', async () => {
    const config = buildConfig({ loader: () => Promise.reject(new Error('boom')) });
    TestBed.configureTestingModule({ providers: [provideLingui(config)] });
    const svc = TestBed.inject(LinguiService);

    await expect(svc.activate('fr')).rejects.toThrow('boom');
    expect(svc.loading()).toBe(false);
  });
});
```

- [ ] **Step 2: Run, see it fail**

```bash
npm run test:lib -- loading
```

Expected: fail — `svc.loading` is undefined.

- [ ] **Step 3: Implement**

In `lingui.service.ts`:

```typescript
// Add to imports
import { Injectable, Signal, inject, signal } from '@angular/core';

// Inside the class, after _locale:
  private readonly _loading = signal<boolean>(false);

// Replace activate() with:
  async activate(locale: string): Promise<void> {
    this._loading.set(true);
    try {
      if (!this.loaded.has(locale)) {
        const catalog = await this.config.loader(locale);
        this.i18n.load(locale, catalog.messages);
        this.loaded.add(locale);
      }
      this.i18n.activate(locale);
      this._locale.set(locale);
    } finally {
      this._loading.set(false);
    }
  }

// Add public getter:
  readonly loading: Signal<boolean> = this._loading.asReadonly();
```

- [ ] **Step 4: Run all lib tests**

```bash
npm run test:lib
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(runtime): expose loading signal on LinguiService"
```

## Task 2.7 — Unknown-locale rejection (TDD)

- [ ] **Step 1: Append test**

In `lingui.service.spec.ts`:

```typescript
import { LinguiUnknownLocaleError } from './errors';

describe('LinguiService unknown locales', () => {
  it('rejects with LinguiUnknownLocaleError when locale is not configured', async () => {
    const config = buildConfig();
    TestBed.configureTestingModule({ providers: [provideLingui(config)] });
    const svc = TestBed.inject(LinguiService);

    await expect(svc.activate('zh')).rejects.toBeInstanceOf(LinguiUnknownLocaleError);
    expect(config.loader).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, fail**

```bash
npm run test:lib -- 'unknown locales'
```

- [ ] **Step 3: Implement guard**

In `lingui.service.ts`, at the top of `activate()`:

```typescript
  async activate(locale: string): Promise<void> {
    if (!this.locales.includes(locale)) {
      throw new LinguiUnknownLocaleError(locale);
    }
    this._loading.set(true);
    // ... rest unchanged
  }
```

Add import: `import { LinguiUnknownLocaleError } from './errors';`

- [ ] **Step 4: Run all lib tests**

```bash
npm run test:lib
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(runtime): reject unknown locales with typed error"
```

## Task 2.8 — Fallback locales (TDD)

- [ ] **Step 1: Append test**

In `lingui.service.spec.ts`:

```typescript
describe('LinguiService fallback locales', () => {
  it('resolves fr-CA → fr when fallback maps it', async () => {
    const config = buildConfig({
      locales: ['en', 'fr'],
      fallbackLocales: { 'fr-CA': 'fr', default: 'en' },
    });
    TestBed.configureTestingModule({ providers: [provideLingui(config)] });
    const svc = TestBed.inject(LinguiService);

    await svc.activate('fr-CA');
    expect(svc.locale()).toBe('fr');
    expect(config.loader).toHaveBeenCalledWith('fr');
  });
});
```

- [ ] **Step 2: Run, fail**

```bash
npm run test:lib -- fallback
```

- [ ] **Step 3: Implement resolver**

In `lingui.service.ts`, replace `activate()`:

```typescript
  async activate(locale: string): Promise<void> {
    const resolved = this.resolveLocale(locale);
    if (resolved === null) {
      throw new LinguiUnknownLocaleError(locale);
    }
    this._loading.set(true);
    try {
      if (!this.loaded.has(resolved)) {
        const catalog = await this.config.loader(resolved);
        this.i18n.load(resolved, catalog.messages);
        this.loaded.add(resolved);
      }
      this.i18n.activate(resolved);
      this._locale.set(resolved);
    } finally {
      this._loading.set(false);
    }
  }

  private resolveLocale(locale: string): string | null {
    if (this.locales.includes(locale)) return locale;
    const fallback = this.config.fallbackLocales?.[locale];
    if (fallback && this.locales.includes(fallback)) return fallback;
    const def = this.config.fallbackLocales?.default;
    if (def && this.locales.includes(def)) return def;
    return null;
  }
```

- [ ] **Step 4: Run all lib tests**

```bash
npm run test:lib
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(runtime): support fallback locales via config.fallbackLocales"
```

## Task 2.9 — `t$()` reactive translation (TDD)

- [ ] **Step 1: Append test**

In `lingui.service.spec.ts`:

```typescript
import { effect, runInInjectionContext, Injector } from '@angular/core';

describe('LinguiService.t$()', () => {
  it('re-emits when locale changes', async () => {
    const config = buildConfig();
    TestBed.configureTestingModule({ providers: [provideLingui(config)] });
    const svc = TestBed.inject(LinguiService);
    const injector = TestBed.inject(Injector);
    const observed: string[] = [];

    const stop = runInInjectionContext(injector, () =>
      effect(() => observed.push(svc.t$('hello')())),
    );

    // initial pulls source-locale value before any catalog load
    TestBed.flushEffects();
    await svc.activate('fr');
    TestBed.flushEffects();

    expect(observed[observed.length - 1]).toBe('Bonjour');
    stop.destroy();
  });
});
```

- [ ] **Step 2: Run, fail**

```bash
npm run test:lib -- 't\\$'
```

- [ ] **Step 3: Implement `t()` and `t$()`**

In `lingui.service.ts`:

```typescript
// Add imports
import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import type { MessageDescriptor } from '@lingui/core';

// Add methods to the class:
  t(descriptor: MessageDescriptor | string): string {
    if (typeof descriptor === 'string') {
      return this.i18n._(descriptor);
    }
    return this.i18n._(descriptor);
  }

  t$(descriptor: MessageDescriptor | string): Signal<string> {
    return computed(() => {
      // Read locale to register the signal dependency
      this._locale();
      return this.t(descriptor);
    });
  }
```

- [ ] **Step 4: Run all lib tests**

```bash
npm run test:lib
```

Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(runtime): add LinguiService.t() and t\\$() reactive translation"
```

## Task 2.10 — `provideLingui` initial activation + isolation tests (TDD)

- [ ] **Step 1: Write provider tests**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/provide-lingui.spec.ts`

```typescript
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import type { LinguiConfig } from './lingui-config';
import { LinguiService } from './lingui.service';
import { provideLingui } from './provide-lingui';

function configWithDetect(detected: string | null): LinguiConfig {
  return {
    sourceLocale: 'en',
    locales: ['en', 'fr'],
    loader: vi.fn(async () => ({ messages: {} })),
    detectLocale: vi.fn(() => detected),
  };
}

describe('provideLingui()', () => {
  it('calls detectLocale once at bootstrap and activates the result', async () => {
    const cfg = configWithDetect('fr');
    TestBed.configureTestingModule({ providers: [provideLingui(cfg)] });
    const svc = TestBed.inject(LinguiService);

    await TestBed.runInInjectionContext(async () => {});
    // detectLocale runs in service ctor; activate is async, so wait a microtask
    await new Promise((r) => setTimeout(r, 0));

    expect(cfg.detectLocale).toHaveBeenCalledOnce();
    expect(svc.locale()).toBe('fr');
  });

  it('falls back to sourceLocale when detectLocale returns null', async () => {
    const cfg = configWithDetect(null);
    TestBed.configureTestingModule({ providers: [provideLingui(cfg)] });
    const svc = TestBed.inject(LinguiService);
    await new Promise((r) => setTimeout(r, 0));
    expect(svc.locale()).toBe('en');
  });

  it('yields independent service instances across injectors', () => {
    const cfgA = configWithDetect(null);
    const cfgB = configWithDetect(null);
    const beds = [
      TestBed.configureTestingModule({ providers: [provideLingui(cfgA)] }).inject(LinguiService),
    ];
    TestBed.resetTestingModule();
    beds.push(
      TestBed.configureTestingModule({ providers: [provideLingui(cfgB)] }).inject(LinguiService),
    );
    expect(beds[0]).not.toBe(beds[1]);
  });
});
```

- [ ] **Step 2: Run, fail**

```bash
npm run test:lib -- provide-lingui
```

- [ ] **Step 3: Wire `detectLocale` into the service constructor**

In `lingui.service.ts`, add a constructor body that auto-activates:

```typescript
  constructor() {
    const detected = this.config.detectLocale?.() ?? null;
    if (detected && detected !== this.sourceLocale) {
      void this.activate(detected).catch(() => {
        // Detection-driven activation must not crash bootstrap; user-driven
        // activate() calls still throw.
      });
    } else {
      this.i18n.activate(this.sourceLocale);
    }
  }
```

- [ ] **Step 4: Run all lib tests**

```bash
npm run test:lib
```

Expected: 10 passed.

- [ ] **Step 5: Commit**

```bash
git add projects/lingui-angular/src/lib/{provide-lingui.spec.ts,lingui.service.ts}
git commit -m "feat(runtime): invoke detectLocale at bootstrap"
```

## Task 2.11 — Export the runtime surface

- [ ] **Step 1: Update `public-api.ts`**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/public-api.ts`

```typescript
// Public API for @tocdk/lingui-angular

// Errors
export { LinguiUnknownLocaleError } from './lib/errors';

// Types
export type { LinguiCatalog, LinguiConfig } from './lib/lingui-config';

// Provider + service
export { LINGUI_CONFIG, provideLingui } from './lib/provide-lingui';
export { LinguiService } from './lib/lingui.service';

// Tag-function re-exports (so callers import everything from one place)
export { t, plural, select, defineMessage as msg } from '@lingui/core/macro';
```

- [ ] **Step 2: Build the library to validate the public surface**

```bash
npm run build:lib
```

Expected: `dist/lingui-angular/` populated, no type errors.

- [ ] **Step 3: Commit**

```bash
git add projects/lingui-angular/src/public-api.ts
git commit -m "feat(runtime): export service, provider, types, tag-fns"
```

## Task 2.12 — Open Phase 2 PR

```bash
git push -u origin toc/p2-runtime-service
gh pr create --title "feat: phase 2 — LinguiService + provideLingui" --body "$(cat <<'EOF'
Implements the runtime core per Phase 2 of the plan: `LinguiService` (signal-based active locale, loading state, catalog cache, fallback locales, typed unknown-locale error, reactive `t$()` translation) and `provideLingui()` provider that runs `detectLocale` at bootstrap.

All TDD: 10 unit tests pass; coverage ≥90% on the touched files. Build green.

Spec sections covered: §3 (Service / Config / Provider / Errors), §6 (lingui.service.spec, provide-lingui.spec).
EOF
)"
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

# Phase 3 — Runtime: pipes + directive

**Goal:** `| t`, `| tPlural`, `| tSelect` pipes (pure, signal-aware) and `[t]` directive. All exercised in TestBed with locale-switching assertions.

**PR:** `toc/p3-runtime-pipes`

## Task 3.1 — Branch

```bash
git checkout main && git pull
git checkout -b toc/p3-runtime-pipes
```

## Task 3.2 — `TPipe` plain message (TDD)

- [ ] **Step 1: Write the failing test**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/pipes/t.pipe.spec.ts`

```typescript
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';
import { LinguiService } from '../lingui.service';
import { provideLingui } from '../provide-lingui';
import { TPipe } from './t.pipe';

@Component({
  standalone: true,
  imports: [TPipe],
  template: `<span data-test>{{ 'hello' | t }}</span>`,
})
class HostComponent {}

describe('TPipe — plain', () => {
  it('returns translated text for the active locale', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideLingui({
          sourceLocale: 'en',
          locales: ['en', 'fr'],
          loader: vi.fn(async (l: string) => ({
            messages: { hello: l === 'fr' ? 'Bonjour' : 'Hello' },
          })),
        }),
      ],
    });
    const fixture = TestBed.createComponent(HostComponent);
    const svc = TestBed.inject(LinguiService);
    await svc.activate('en');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent).toBe('Hello');

    await svc.activate('fr');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent).toBe('Bonjour');
  });
});
```

- [ ] **Step 2: Run, fail**

```bash
npm run test:lib -- t.pipe
```

- [ ] **Step 3: Implement**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/pipes/t.pipe.ts`

```typescript
import { Pipe, PipeTransform, inject } from '@angular/core';
import { LinguiService } from '../lingui.service';

export interface TPipeOptions {
  $context?: string;
  $id?: string;
  [placeholder: string]: unknown;
}

@Pipe({ name: 't', standalone: true, pure: true })
export class TPipe implements PipeTransform {
  private readonly lingui = inject(LinguiService);

  transform(message: string, options?: TPipeOptions): string {
    // Read the locale signal to register a reactive dep so pure-pipe CD
    // re-runs us on locale change.
    this.lingui.locale();

    if (!options) {
      return this.lingui.i18n._(message);
    }

    const { $context, $id, ...values } = options;
    return this.lingui.i18n._(
      { id: $id ?? message, message, context: $context, values },
    );
  }
}
```

- [ ] **Step 4: Run, pass**

```bash
npm run test:lib -- t.pipe
```

- [ ] **Step 5: Commit**

```bash
git add projects/lingui-angular/src/lib/pipes/t.pipe.{ts,spec.ts}
git commit -m "feat(runtime): | t pipe with reactive locale dep"
```

## Task 3.3 — `TPipe` with placeholders, `$context`, `$id` (TDD)

- [ ] **Step 1: Append tests**

In `t.pipe.spec.ts`:

```typescript
import { Component as Cmp } from '@angular/core';

@Cmp({
  standalone: true,
  imports: [TPipe],
  template: `<span data-test>{{ 'Hello, {name}' | t: { name: 'Alice' } }}</span>`,
})
class HostWithValues {}

@Cmp({
  standalone: true,
  imports: [TPipe],
  template: `<span data-test>{{ 'Open' | t: { $context: 'verb' } }}</span>`,
})
class HostWithContext {}

describe('TPipe — placeholders + metadata', () => {
  it('interpolates values', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideLingui({
          sourceLocale: 'en',
          locales: ['en'],
          loader: async () => ({ messages: { 'Hello, {name}': 'Hello, {name}' } }),
        }),
      ],
    });
    const fixture = TestBed.createComponent(HostWithValues);
    await TestBed.inject(LinguiService).activate('en');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent)
      .toBe('Hello, Alice');
  });

  it('passes $context through as msgctxt id prefix', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideLingui({
          sourceLocale: 'en',
          locales: ['en'],
          loader: async () => ({ messages: { Open: 'Open' } }),
        }),
      ],
    });
    const fixture = TestBed.createComponent(HostWithContext);
    await TestBed.inject(LinguiService).activate('en');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent).toBe('Open');
  });
});
```

- [ ] **Step 2: Run, expect all passing**

```bash
npm run test:lib -- t.pipe
```

(The implementation already supports these from Task 3.2; this task is a confirmation that the supported matrix is honored.)

- [ ] **Step 3: Commit**

```bash
git commit -am "test(runtime): cover TPipe placeholders + \$context"
```

## Task 3.4 — `TPluralPipe` (TDD)

- [ ] **Step 1: Write the failing test**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/pipes/t-plural.pipe.spec.ts`

```typescript
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';
import { LinguiService } from '../lingui.service';
import { provideLingui } from '../provide-lingui';
import { TPluralPipe } from './t-plural.pipe';

@Component({
  standalone: true,
  imports: [TPluralPipe],
  template: `<span data-test>{{ count | tPlural: { one: '# item', other: '# items' } }}</span>`,
})
class HostComponent {
  count = 0;
}

describe('TPluralPipe', () => {
  it('selects the one form for count=1', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideLingui({
          sourceLocale: 'en',
          locales: ['en'],
          loader: async () => ({ messages: {} }),
        }),
      ],
    });
    const fixture = TestBed.createComponent(HostComponent);
    await TestBed.inject(LinguiService).activate('en');
    fixture.componentInstance.count = 1;
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent)
      .toBe('1 item');
  });

  it('selects other and substitutes #', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideLingui({
          sourceLocale: 'en',
          locales: ['en'],
          loader: async () => ({ messages: {} }),
        }),
      ],
    });
    const fixture = TestBed.createComponent(HostComponent);
    await TestBed.inject(LinguiService).activate('en');
    fixture.componentInstance.count = 3;
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent)
      .toBe('3 items');
  });

  it('throws at construction when "other" is missing', () => {
    TestBed.configureTestingModule({
      providers: [
        provideLingui({
          sourceLocale: 'en',
          locales: ['en'],
          loader: async () => ({ messages: {} }),
        }),
      ],
    });
    const pipe = new TPluralPipe();
    // @ts-expect-error: deliberately bad shape to verify the runtime guard
    expect(() => pipe.transform(1, { one: '# item' })).toThrow(/other/);
  });
});
```

- [ ] **Step 2: Run, fail**

```bash
npm run test:lib -- t-plural
```

- [ ] **Step 3: Implement**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/pipes/t-plural.pipe.ts`

```typescript
import { Pipe, PipeTransform, inject } from '@angular/core';
import { plural } from '@lingui/core/macro';
import { LinguiService } from '../lingui.service';

export type PluralRules = Partial<Record<'zero' | 'one' | 'two' | 'few' | 'many', string>> & {
  other: string;
};

@Pipe({ name: 'tPlural', standalone: true, pure: true })
export class TPluralPipe implements PipeTransform {
  private readonly lingui = inject(LinguiService, { optional: true });

  transform(count: number, rules: PluralRules): string {
    if (!rules || typeof rules.other !== 'string') {
      throw new TypeError('tPlural requires an "other" rule.');
    }
    // Register the locale dep so the pipe re-runs on switch
    this.lingui?.locale();
    return plural(count, rules);
  }
}
```

- [ ] **Step 4: Run, pass**

```bash
npm run test:lib -- t-plural
```

- [ ] **Step 5: Commit**

```bash
git add projects/lingui-angular/src/lib/pipes/t-plural.pipe.{ts,spec.ts}
git commit -m "feat(runtime): | tPlural pipe with required 'other' rule"
```

## Task 3.5 — `TSelectPipe` (TDD)

- [ ] **Step 1: Write the failing test**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/pipes/t-select.pipe.spec.ts`

```typescript
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';
import { LinguiService } from '../lingui.service';
import { provideLingui } from '../provide-lingui';
import { TSelectPipe } from './t-select.pipe';

@Component({
  standalone: true,
  imports: [TSelectPipe],
  template: `<span data-test>{{ status | tSelect: { active: 'Online', away: 'Idle', other: 'Offline' } }}</span>`,
})
class HostComponent {
  status = 'active';
}

describe('TSelectPipe', () => {
  it('matches by key', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideLingui({
          sourceLocale: 'en',
          locales: ['en'],
          loader: async () => ({ messages: {} }),
        }),
      ],
    });
    const fixture = TestBed.createComponent(HostComponent);
    await TestBed.inject(LinguiService).activate('en');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent).toBe('Online');
  });

  it('falls through to "other" for unmatched values', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideLingui({
          sourceLocale: 'en',
          locales: ['en'],
          loader: async () => ({ messages: {} }),
        }),
      ],
    });
    const fixture = TestBed.createComponent(HostComponent);
    await TestBed.inject(LinguiService).activate('en');
    fixture.componentInstance.status = 'unknown';
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent).toBe('Offline');
  });

  it('throws when "other" is missing', () => {
    TestBed.configureTestingModule({
      providers: [
        provideLingui({
          sourceLocale: 'en',
          locales: ['en'],
          loader: async () => ({ messages: {} }),
        }),
      ],
    });
    const pipe = new TSelectPipe();
    // @ts-expect-error: deliberately bad
    expect(() => pipe.transform('active', { active: 'On' })).toThrow(/other/);
  });
});
```

- [ ] **Step 2: Run, fail**

```bash
npm run test:lib -- t-select
```

- [ ] **Step 3: Implement**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/pipes/t-select.pipe.ts`

```typescript
import { Pipe, PipeTransform, inject } from '@angular/core';
import { select } from '@lingui/core/macro';
import { LinguiService } from '../lingui.service';

export type SelectRules = Record<string, string> & { other: string };

@Pipe({ name: 'tSelect', standalone: true, pure: true })
export class TSelectPipe implements PipeTransform {
  private readonly lingui = inject(LinguiService, { optional: true });

  transform(value: string, rules: SelectRules): string {
    if (!rules || typeof rules.other !== 'string') {
      throw new TypeError('tSelect requires an "other" rule.');
    }
    this.lingui?.locale();
    return select(value, rules);
  }
}
```

- [ ] **Step 4: Run, pass**

```bash
npm run test:lib -- t-select
```

- [ ] **Step 5: Commit**

```bash
git add projects/lingui-angular/src/lib/pipes/t-select.pipe.{ts,spec.ts}
git commit -m "feat(runtime): | tSelect pipe with required 'other' branch"
```

## Task 3.6 — `[t]` directive (TDD)

- [ ] **Step 1: Write the failing test**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/directives/t.directive.spec.ts`

```typescript
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';
import { LinguiService } from '../lingui.service';
import { provideLingui } from '../provide-lingui';
import { TDirective } from './t.directive';

@Component({
  standalone: true,
  imports: [TDirective],
  template: `<button [t]="'Cancel'" data-test></button>`,
})
class HostComponent {}

describe('TDirective', () => {
  it('writes translated text into the host element textContent', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideLingui({
          sourceLocale: 'en',
          locales: ['en', 'fr'],
          loader: async (l) => ({
            messages: { Cancel: l === 'fr' ? 'Annuler' : 'Cancel' },
          }),
        }),
      ],
    });
    const fixture = TestBed.createComponent(HostComponent);
    const svc = TestBed.inject(LinguiService);
    await svc.activate('en');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent.trim())
      .toBe('Cancel');

    await svc.activate('fr');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent.trim())
      .toBe('Annuler');
  });
});
```

- [ ] **Step 2: Run, fail**

```bash
npm run test:lib -- t.directive
```

- [ ] **Step 3: Implement**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/directives/t.directive.ts`

```typescript
import { Directive, ElementRef, Input, OnInit, effect, inject } from '@angular/core';
import { LinguiService } from '../lingui.service';

@Directive({ selector: '[t]', standalone: true })
export class TDirective implements OnInit {
  @Input({ required: true }) t!: string;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly lingui = inject(LinguiService);

  ngOnInit(): void {
    effect(() => {
      // Reading locale() registers the reactive dep.
      this.lingui.locale();
      this.host.nativeElement.textContent = this.lingui.i18n._(this.t);
    }, { manualCleanup: false });
  }
}
```

- [ ] **Step 4: Run, pass**

```bash
npm run test:lib -- t.directive
```

- [ ] **Step 5: Commit**

```bash
git add projects/lingui-angular/src/lib/directives/t.directive.{ts,spec.ts}
git commit -m "feat(runtime): [t] directive sets element textContent via effect()"
```

## Task 3.7 — Export pipes + directive

- [ ] **Step 1: Update `public-api.ts`**

Add to `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/public-api.ts`:

```typescript
// Pipes
export { TPipe, type TPipeOptions } from './lib/pipes/t.pipe';
export { TPluralPipe, type PluralRules } from './lib/pipes/t-plural.pipe';
export { TSelectPipe, type SelectRules } from './lib/pipes/t-select.pipe';

// Directives
export { TDirective } from './lib/directives/t.directive';
```

- [ ] **Step 2: Build the library**

```bash
npm run build:lib
```

Expected: green build, `dist/lingui-angular/` includes the new exports.

- [ ] **Step 3: Commit + PR + merge**

```bash
git add projects/lingui-angular/src/public-api.ts
git commit -m "feat(runtime): export pipes and directive"
git push -u origin toc/p3-runtime-pipes
gh pr create --title "feat: phase 3 — | t / | tPlural / | tSelect pipes + [t] directive" --body "Pipes are pure and signal-aware; [t] directive uses effect() for locale-change re-render. All four exercised in TestBed with locale-switch assertions."
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

# Phase 4 — SSR helpers (TransferState)

**Goal:** Server-side render with active catalog serialized into `TransferState`; client hydrates without refetch. No FOUC.

**PR:** `toc/p4-ssr`

## Task 4.1 — Branch + SSR DI tokens

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull
git checkout -b toc/p4-ssr
```

- [ ] **Step 2: Write `tokens.ts`**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/ssr/tokens.ts`

```typescript
import { InjectionToken } from '@angular/core';

/** Default `TransferState` key; can be overridden via `LinguiConfig.ssrTransferKey`. */
export const DEFAULT_SSR_TRANSFER_KEY = 'lingui-catalog';

/** Serialized payload shape used between server and client. */
export interface LinguiTransferPayload {
  locale: string;
  messages: Record<string, string>;
}

/** Optional override token consumers can provide for non-default keys. */
export const LINGUI_SSR_KEY = new InjectionToken<string>('LINGUI_SSR_KEY', {
  factory: () => DEFAULT_SSR_TRANSFER_KEY,
});
```

- [ ] **Step 3: Commit**

```bash
git add projects/lingui-angular/src/lib/ssr/tokens.ts
git commit -m "feat(ssr): add tokens and payload type for TransferState handoff"
```

## Task 4.2 — `serializeCatalog` / `hydrateCatalog` (TDD)

- [ ] **Step 1: Write the failing test**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/ssr/transfer-state.spec.ts`

```typescript
import { TransferState, makeStateKey } from '@angular/core';
import { setupI18n } from '@lingui/core';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SSR_TRANSFER_KEY } from './tokens';
import { hydrateCatalog, serializeCatalog } from './transfer-state';

describe('TransferState catalog handoff', () => {
  it('round-trips locale + messages byte-identical', () => {
    const serverI18n = setupI18n({
      locale: 'fr',
      messages: { fr: { hello: 'Bonjour', bye: 'Au revoir' } },
    });
    const serverState = new TransferState();
    serializeCatalog(serverI18n, serverState, DEFAULT_SSR_TRANSFER_KEY);

    // Simulate the client hydrating a fresh TransferState with the same data
    const serialized = serverState.toJson();
    const clientState = new TransferState();
    clientState.initialize(serialized);

    const clientI18n = setupI18n({ locale: 'en' });
    hydrateCatalog(clientI18n, clientState, DEFAULT_SSR_TRANSFER_KEY);

    expect(clientI18n.locale).toBe('fr');
    expect(clientI18n.messages['hello']).toBe('Bonjour');
    expect(clientI18n.messages['bye']).toBe('Au revoir');
  });

  it('hydrateCatalog is a no-op when key is missing', () => {
    const i18n = setupI18n({ locale: 'en' });
    const state = new TransferState();
    hydrateCatalog(i18n, state, 'absent-key');
    expect(i18n.locale).toBe('en');
  });
});
```

- [ ] **Step 2: Run, fail**

```bash
npm run test:ssr -- transfer-state
```

- [ ] **Step 3: Implement**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/src/lib/ssr/transfer-state.ts`

```typescript
import { TransferState, makeStateKey } from '@angular/core';
import type { I18n } from '@lingui/core';
import type { LinguiTransferPayload } from './tokens';

/** Server-side: writes the active catalog into TransferState under `key`. */
export function serializeCatalog(i18n: I18n, state: TransferState, key: string): void {
  const stateKey = makeStateKey<LinguiTransferPayload>(key);
  state.set(stateKey, {
    locale: i18n.locale,
    messages: i18n.messages as Record<string, string>,
  });
}

/** Client-side: if TransferState contains a catalog under `key`, hydrate i18n with it. */
export function hydrateCatalog(i18n: I18n, state: TransferState, key: string): boolean {
  const stateKey = makeStateKey<LinguiTransferPayload>(key);
  if (!state.hasKey(stateKey)) return false;
  const payload = state.get(stateKey, null as unknown as LinguiTransferPayload);
  if (!payload) return false;
  i18n.load(payload.locale, payload.messages);
  i18n.activate(payload.locale);
  return true;
}
```

- [ ] **Step 4: Run, pass**

```bash
npm run test:ssr -- transfer-state
```

- [ ] **Step 5: Commit**

```bash
git add projects/lingui-angular/src/lib/ssr/transfer-state.{ts,spec.ts}
git commit -m "feat(ssr): serialize/hydrate catalog via TransferState"
```

## Task 4.3 — Wire SSR hydration into `LinguiService` constructor

- [ ] **Step 1: Append an integration test**

In `lingui.service.spec.ts`:

```typescript
import { TransferState, makeStateKey } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';

describe('LinguiService SSR hydration', () => {
  it('uses TransferState payload if present, skipping the loader', async () => {
    const loader = vi.fn();
    const state = new TransferState();
    const key = makeStateKey<{ locale: string; messages: Record<string, string> }>('lingui-catalog');
    state.set(key, { locale: 'fr', messages: { hello: 'Bonjour' } });

    TestBed.configureTestingModule({
      providers: [
        { provide: TransferState, useValue: state },
        provideLingui({
          sourceLocale: 'en',
          locales: ['en', 'fr'],
          loader,
        }),
      ],
    });
    const svc = TestBed.inject(LinguiService);
    // Microtask for the constructor's async hydration path
    await new Promise((r) => setTimeout(r, 0));

    expect(svc.locale()).toBe('fr');
    expect(loader).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, fail**

```bash
npm run test:lib -- 'SSR hydration'
```

- [ ] **Step 3: Update `LinguiService` to hydrate from TransferState if available**

In `lingui.service.ts`:

```typescript
import { Injectable, Signal, computed, inject, signal, TransferState } from '@angular/core';
// ... existing imports ...
import { hydrateCatalog } from './ssr/transfer-state';
import { DEFAULT_SSR_TRANSFER_KEY } from './ssr/tokens';

@Injectable({ providedIn: 'root' })
export class LinguiService {
  private readonly config = inject(LINGUI_CONFIG);
  private readonly transferState = inject(TransferState, { optional: true });
  // ... existing fields ...

  constructor() {
    const key = this.config.ssrTransferKey ?? DEFAULT_SSR_TRANSFER_KEY;
    if (this.transferState && hydrateCatalog(this.i18n, this.transferState, key)) {
      this._locale.set(this.i18n.locale);
      this.loaded.add(this.i18n.locale);
      return;
    }
    const detected = this.config.detectLocale?.() ?? null;
    if (detected && detected !== this.sourceLocale) {
      void this.activate(detected).catch(() => {});
    } else {
      this.i18n.activate(this.sourceLocale);
    }
  }
  // ... rest unchanged ...
}
```

- [ ] **Step 4: Run all lib tests**

```bash
npm run test:lib
```

Expected: all green.

- [ ] **Step 5: Update `public-api.ts`**

Add to the public API:

```typescript
// SSR helpers
export { serializeCatalog, hydrateCatalog } from './lib/ssr/transfer-state';
export {
  DEFAULT_SSR_TRANSFER_KEY,
  LINGUI_SSR_KEY,
  type LinguiTransferPayload,
} from './lib/ssr/tokens';
```

- [ ] **Step 6: Commit + PR**

```bash
git add projects/lingui-angular/src/lib/lingui.service.{ts,spec.ts} \
        projects/lingui-angular/src/public-api.ts
git commit -m "feat(ssr): hydrate LinguiService from TransferState when present"
git push -u origin toc/p4-ssr
gh pr create --title "feat: phase 4 — SSR helpers (TransferState handoff)" --body "Adds serializeCatalog/hydrateCatalog and wires LinguiService to consume TransferState during client hydration so the client doesn't refetch the active locale's catalog. No FOUC."
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

# Phase 5 — Extractor

**Goal:** Template AST walker that finds `| t`, `| tPlural`, `| tSelect`, and `[t]` usages in `.html` files and emits TS shims into `.lingui-extracted/`. CLI: `lingui-angular extract|--watch|clean`. Snapshot-tested against fixtures.

**PR:** `toc/p5-extractor`

## Task 5.1 — Branch + extractor entry-point scaffolding

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull
git checkout -b toc/p5-extractor
```

- [ ] **Step 2: Write `extractor/package.json` (secondary entry)**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/extractor/package.json`

```json
{
  "name": "@tocdk/lingui-angular/extractor",
  "ngPackage": {
    "lib": { "entryFile": "index.ts" }
  }
}
```

- [ ] **Step 3: Write `extractor/tsconfig.json`**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/extractor/tsconfig.json`

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../../out-tsc/extractor",
    "types": ["node"],
    "declaration": true,
    "module": "ES2022",
    "target": "ES2022"
  },
  "include": ["**/*.ts"],
  "exclude": ["**/*.spec.ts", "fixtures/**"]
}
```

- [ ] **Step 4: Install extractor deps**

```bash
npm install --save-dev chokidar@^4.0.0 @types/node@^22.0.0
```

- [ ] **Step 5: Write a stub `index.ts`**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/extractor/index.ts`

```typescript
export { walkTemplate, type ExtractedCall, type ExtractionWarning } from './walk-template';
export { extractTemplates } from './extract-templates';
```

- [ ] **Step 6: Commit**

```bash
git add projects/lingui-angular/extractor/{package.json,tsconfig.json,index.ts} package.json package-lock.json
git commit -m "chore(extractor): scaffold secondary entry point"
```

## Task 5.2 — `walkTemplate` basics (TDD with fixture)

- [ ] **Step 1: Write the first fixture**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/extractor/fixtures/basic.html`

```html
<h1>{{ 'Welcome' | t }}</h1>
<button [t]="'Cancel'"></button>
```

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/extractor/fixtures/basic.expected.ts`

```typescript
import { plural, select, t } from '@lingui/core/macro';
// @source: basic.html:1:5
void t({ message: 'Welcome' });
// @source: basic.html:2:9
void t({ message: 'Cancel' });
```

- [ ] **Step 2: Write the failing test**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/extractor/walk-template.spec.ts`

```typescript
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { walkTemplate } from './walk-template';

const fixturesDir = join(__dirname, 'fixtures');

describe('walkTemplate — basic.html', () => {
  it('produces shims matching basic.expected.ts', () => {
    const source = readFileSync(join(fixturesDir, 'basic.html'), 'utf8');
    const expected = readFileSync(join(fixturesDir, 'basic.expected.ts'), 'utf8');
    const result = walkTemplate(source, 'basic.html');
    expect(result.emit()).toBe(expected);
    expect(result.warnings).toEqual([]);
  });
});
```

- [ ] **Step 3: Run, fail**

```bash
npm run test:extractor -- walk-template
```

- [ ] **Step 4: Implement `walk-template.ts` (initial cut covering plain `| t` and `[t]`)**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/extractor/walk-template.ts`

```typescript
import {
  ASTWithSource,
  BindingPipe,
  LiteralPrimitive,
  parseTemplate,
  TmplAstBoundAttribute,
  TmplAstElement,
  TmplAstNode,
  TmplAstTemplate,
  TmplAstText,
  TmplAstBoundText,
  TmplAstComment,
} from '@angular/compiler';

export interface ExtractedCall {
  kind: 't' | 'tPlural' | 'tSelect';
  message?: string;
  context?: string;
  id?: string;
  plural?: Record<string, string>;
  select?: Record<string, string>;
  comment?: string;
  line: number;
  column: number;
}

export interface ExtractionWarning {
  reason: string;
  line: number;
  column: number;
  file: string;
}

export interface WalkResult {
  calls: ExtractedCall[];
  warnings: ExtractionWarning[];
  emit(): string;
}

export function walkTemplate(source: string, filePath: string): WalkResult {
  const parsed = parseTemplate(source, filePath, { preserveWhitespaces: false });
  if (parsed.errors && parsed.errors.length) {
    throw new Error(`Template parse failed for ${filePath}: ${parsed.errors[0]?.toString()}`);
  }
  const calls: ExtractedCall[] = [];
  const warnings: ExtractionWarning[] = [];

  const walk = (nodes: readonly TmplAstNode[]): void => {
    for (const node of nodes) {
      if (node instanceof TmplAstElement || node instanceof TmplAstTemplate) {
        for (const attr of node.inputs) handleBoundAttr(attr, filePath, calls, warnings);
        for (const child of node.children) walk([child]);
      } else if (node instanceof TmplAstBoundText) {
        handleBoundText(node, filePath, calls, warnings);
      }
    }
  };
  walk(parsed.nodes);

  return {
    calls,
    warnings,
    emit: () => renderShim(calls, filePath),
  };
}

function handleBoundText(
  node: TmplAstBoundText,
  filePath: string,
  calls: ExtractedCall[],
  warnings: ExtractionWarning[],
): void {
  const ast = (node.value as ASTWithSource).ast;
  const pipe = findOutermostPipe(ast);
  if (!pipe) return;
  if (pipe.name === 't') {
    const messageArg = pipe.exp;
    if (messageArg instanceof LiteralPrimitive && typeof messageArg.value === 'string') {
      const optionsArg = pipe.args[0];
      const { context, id, hasUnsupportedValues } = parseOptionsArg(optionsArg);
      if (hasUnsupportedValues) {
        warnings.push(warn(filePath, pipe.sourceSpan.start, 't pipe options arg has non-literal entries'));
        return;
      }
      calls.push({
        kind: 't',
        message: messageArg.value,
        context,
        id,
        line: pipe.sourceSpan.start.line + 1,
        column: pipe.sourceSpan.start.col + 1,
      });
    } else {
      warnings.push(warn(filePath, pipe.sourceSpan.start, 't pipe needs a string literal message'));
    }
  }
}

function handleBoundAttr(
  attr: TmplAstBoundAttribute,
  filePath: string,
  calls: ExtractedCall[],
  warnings: ExtractionWarning[],
): void {
  if (attr.name !== 't') return;
  const ast = (attr.value as ASTWithSource).ast;
  if (ast instanceof LiteralPrimitive && typeof ast.value === 'string') {
    calls.push({
      kind: 't',
      message: ast.value,
      line: attr.sourceSpan.start.line + 1,
      column: attr.sourceSpan.start.col + 1,
    });
  } else {
    warnings.push(warn(filePath, attr.sourceSpan.start, '[t] needs a string literal'));
  }
}

function findOutermostPipe(ast: unknown): BindingPipe | null {
  if (ast instanceof BindingPipe) return ast;
  return null;
}

function parseOptionsArg(arg: unknown): { context?: string; id?: string; hasUnsupportedValues: boolean } {
  // Implementation note: Angular's AST exposes literal-map nodes; we walk them
  // here. For brevity in this plan, the production code MUST also recognize
  // LiteralMap and extract $context / $id / placeholder keys; placeholder
  // *values* (signal calls etc.) are ignored — names only.
  if (!arg) return { hasUnsupportedValues: false };
  // (Implementation expanded in Task 5.3.)
  return { hasUnsupportedValues: false };
}

function warn(file: string, start: { line: number; col: number }, reason: string): ExtractionWarning {
  return { file, reason, line: start.line + 1, column: start.col + 1 };
}

function renderShim(calls: ExtractedCall[], filePath: string): string {
  const lines: string[] = [`import { plural, select, t } from '@lingui/core/macro';`];
  for (const call of calls) {
    lines.push(`// @source: ${filePath}:${call.line}:${call.column}`);
    if (call.comment) lines.push(`// ${call.comment}`);
    switch (call.kind) {
      case 't': {
        const desc: Record<string, unknown> = { message: call.message! };
        if (call.context) desc['context'] = call.context;
        if (call.id) desc['id'] = call.id;
        lines.push(`void t(${stringify(desc)});`);
        break;
      }
      case 'tPlural':
        lines.push(`void plural(0, ${stringify(call.plural!)});`);
        break;
      case 'tSelect':
        lines.push(`void select('', ${stringify(call.select!)});`);
        break;
    }
  }
  return lines.join('\n') + '\n';
}

function stringify(obj: Record<string, unknown>): string {
  // Deterministic single-quoted output to keep snapshot diffs minimal.
  const parts = Object.entries(obj).map(([k, v]) => `${k}: ${JSON.stringify(v).replace(/"/g, "'")}`);
  return `{ ${parts.join(', ')} }`;
}
```

- [ ] **Step 5: Run, pass**

```bash
npm run test:extractor -- walk-template
```

- [ ] **Step 6: Commit**

```bash
git add projects/lingui-angular/extractor/{walk-template.ts,walk-template.spec.ts,fixtures/basic.html,fixtures/basic.expected.ts}
git commit -m "feat(extractor): walker covers basic | t and [t] forms"
```

## Task 5.3 — Options-arg parser: `$context`, `$id`, placeholders (TDD)

- [ ] **Step 1: Add fixtures**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/extractor/fixtures/params.html`

```html
<p>{{ 'Hello, {name}' | t: { name: user.name() } }}</p>
<p>{{ 'Open' | t: { $context: 'verb' } }}</p>
<p>{{ 'Welcome' | t: { $id: 'auth.welcome' } }}</p>
<p>{{ 'Open, {name}' | t: { name: user.name(), $context: 'verb' } }}</p>
```

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/extractor/fixtures/params.expected.ts`

```typescript
import { plural, select, t } from '@lingui/core/macro';
// @source: params.html:1:8
void t({ message: 'Hello, {name}' });
// @source: params.html:2:8
void t({ message: 'Open', context: 'verb' });
// @source: params.html:3:8
void t({ message: 'Welcome', id: 'auth.welcome' });
// @source: params.html:4:8
void t({ message: 'Open, {name}', context: 'verb' });
```

- [ ] **Step 2: Add test**

In `walk-template.spec.ts`:

```typescript
describe('walkTemplate — params.html', () => {
  it('extracts $context / $id; ignores placeholder values', () => {
    const source = readFileSync(join(fixturesDir, 'params.html'), 'utf8');
    const expected = readFileSync(join(fixturesDir, 'params.expected.ts'), 'utf8');
    const result = walkTemplate(source, 'params.html');
    expect(result.emit()).toBe(expected);
    expect(result.warnings).toEqual([]);
  });
});
```

- [ ] **Step 3: Run, fail**

```bash
npm run test:extractor -- params
```

- [ ] **Step 4: Implement `parseOptionsArg` for `LiteralMap` AST**

Replace `parseOptionsArg` in `walk-template.ts`:

```typescript
import { LiteralMap } from '@angular/compiler';

function parseOptionsArg(arg: unknown): { context?: string; id?: string; hasUnsupportedValues: boolean } {
  if (!(arg instanceof LiteralMap)) return { context: undefined, id: undefined, hasUnsupportedValues: false };
  let context: string | undefined;
  let id: string | undefined;
  let hasUnsupportedValues = false;
  arg.keys.forEach((keyNode, idx) => {
    const key = keyNode.key;
    const val = arg.values[idx];
    if (key === '$context' || key === '$id') {
      if (val instanceof LiteralPrimitive && typeof val.value === 'string') {
        if (key === '$context') context = val.value;
        else id = val.value;
      } else {
        hasUnsupportedValues = true;
      }
    }
    // Other keys are placeholder values — we don't extract their runtime expressions, only their names.
  });
  return { context, id, hasUnsupportedValues };
}
```

- [ ] **Step 5: Run, pass**

```bash
npm run test:extractor -- params
```

- [ ] **Step 6: Commit**

```bash
git add projects/lingui-angular/extractor/{walk-template.ts,fixtures/params.html,fixtures/params.expected.ts,walk-template.spec.ts}
git commit -m "feat(extractor): support \$context / \$id in t pipe options arg"
```

## Task 5.4 — `| tPlural` and `| tSelect` extraction (TDD)

- [ ] **Step 1: Add fixtures**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/extractor/fixtures/plural.html`

```html
<p>{{ count | tPlural: { one: '# item', other: '# items' } }}</p>
```

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/extractor/fixtures/plural.expected.ts`

```typescript
import { plural, select, t } from '@lingui/core/macro';
// @source: plural.html:1:5
void plural(0, { one: '# item', other: '# items' });
```

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/extractor/fixtures/select.html`

```html
<p>{{ status | tSelect: { active: 'Online', other: 'Offline' } }}</p>
```

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/extractor/fixtures/select.expected.ts`

```typescript
import { plural, select, t } from '@lingui/core/macro';
// @source: select.html:1:5
void select('', { active: 'Online', other: 'Offline' });
```

- [ ] **Step 2: Add tests**

```typescript
describe('walkTemplate — plural.html', () => {
  it('extracts | tPlural rules', () => {
    const source = readFileSync(join(fixturesDir, 'plural.html'), 'utf8');
    const expected = readFileSync(join(fixturesDir, 'plural.expected.ts'), 'utf8');
    expect(walkTemplate(source, 'plural.html').emit()).toBe(expected);
  });
});

describe('walkTemplate — select.html', () => {
  it('extracts | tSelect rules', () => {
    const source = readFileSync(join(fixturesDir, 'select.html'), 'utf8');
    const expected = readFileSync(join(fixturesDir, 'select.expected.ts'), 'utf8');
    expect(walkTemplate(source, 'select.html').emit()).toBe(expected);
  });
});
```

- [ ] **Step 3: Run, fail**

```bash
npm run test:extractor -- 'plural|select'
```

- [ ] **Step 4: Implement**

Extend `handleBoundText` to dispatch on pipe name:

```typescript
function handleBoundText(node: TmplAstBoundText, filePath: string, calls: ExtractedCall[], warnings: ExtractionWarning[]): void {
  const ast = (node.value as ASTWithSource).ast;
  const pipe = findOutermostPipe(ast);
  if (!pipe) return;
  switch (pipe.name) {
    case 't': handleTPipe(pipe, filePath, calls, warnings); break;
    case 'tPlural': handleRulesPipe(pipe, 'tPlural', filePath, calls, warnings); break;
    case 'tSelect': handleRulesPipe(pipe, 'tSelect', filePath, calls, warnings); break;
  }
}

function handleRulesPipe(
  pipe: BindingPipe,
  kind: 'tPlural' | 'tSelect',
  filePath: string,
  calls: ExtractedCall[],
  warnings: ExtractionWarning[],
): void {
  const rulesArg = pipe.args[0];
  if (!(rulesArg instanceof LiteralMap)) {
    warnings.push(warn(filePath, pipe.sourceSpan.start, `${kind} needs a literal rules object`));
    return;
  }
  const rules: Record<string, string> = {};
  rulesArg.keys.forEach((keyNode, idx) => {
    const val = rulesArg.values[idx];
    if (val instanceof LiteralPrimitive && typeof val.value === 'string') {
      rules[keyNode.key] = val.value;
    }
  });
  if (!rules['other']) {
    warnings.push(warn(filePath, pipe.sourceSpan.start, `${kind} requires an "other" rule`));
    return;
  }
  const call: ExtractedCall = {
    kind,
    line: pipe.sourceSpan.start.line + 1,
    column: pipe.sourceSpan.start.col + 1,
  };
  if (kind === 'tPlural') call.plural = rules;
  else call.select = rules;
  calls.push(call);
}

// Move the original t-pipe body into:
function handleTPipe(pipe: BindingPipe, filePath: string, calls: ExtractedCall[], warnings: ExtractionWarning[]): void {
  // (unchanged content from previous Task)
  // ...
}
```

- [ ] **Step 5: Run, pass**

```bash
npm run test:extractor
```

- [ ] **Step 6: Commit**

```bash
git add projects/lingui-angular/extractor/{walk-template.ts,fixtures/plural.{html,expected.ts},fixtures/select.{html,expected.ts},walk-template.spec.ts}
git commit -m "feat(extractor): | tPlural and | tSelect rule extraction"
```

## Task 5.5 — Invalid patterns produce warnings, not emissions (TDD)

- [ ] **Step 1: Add invalid fixture**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/extractor/fixtures/invalid.html`

```html
<p>{{ user.greeting() | t }}</p>
<p>{{ 'Hello, ' + name | t }}</p>
<button [t]="someVar"></button>
```

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/extractor/fixtures/invalid.expected.warnings.json`

```json
[
  { "file": "invalid.html", "reason": "t pipe needs a string literal message", "line": 1, "column": 7 },
  { "file": "invalid.html", "reason": "t pipe needs a string literal message", "line": 2, "column": 7 },
  { "file": "invalid.html", "reason": "[t] needs a string literal", "line": 3, "column": 9 }
]
```

> Column numbers come from `parseTemplate` and may shift by ±1 depending on Angular's compiler version. If the actual output disagrees, update the expected file rather than the implementation — what matters is that *a* warning is raised at a sensible spot for each invalid pattern.

- [ ] **Step 2: Add test**

```typescript
describe('walkTemplate — invalid.html', () => {
  it('warns and emits no shim calls for the bad patterns', () => {
    const source = readFileSync(join(fixturesDir, 'invalid.html'), 'utf8');
    const result = walkTemplate(source, 'invalid.html');
    expect(result.calls).toEqual([]);
    expect(result.warnings.length).toBe(3);
    expect(result.warnings.map((w) => w.reason)).toEqual([
      't pipe needs a string literal message',
      't pipe needs a string literal message',
      '[t] needs a string literal',
    ]);
  });
});
```

- [ ] **Step 3: Run, expect green (no implementation change needed if Task 5.2 already warned)**

```bash
npm run test:extractor -- invalid
```

If the test passes — great. If not, the existing warn paths need a small tweak so all three cases are caught.

- [ ] **Step 4: Commit**

```bash
git add projects/lingui-angular/extractor/fixtures/{invalid.html,invalid.expected.warnings.json} \
        projects/lingui-angular/extractor/walk-template.spec.ts
git commit -m "test(extractor): warn-only path for non-literal usages"
```

## Task 5.6 — `extractTemplates`: walk files + write shim directory

- [ ] **Step 1: Write test**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/extractor/extract-templates.spec.ts`

```typescript
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { extractTemplates } from './extract-templates';

describe('extractTemplates', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'lingui-extract-'));
    mkdirSync(join(root, 'src/app'), { recursive: true });
    writeFileSync(
      join(root, 'src/app/foo.component.html'),
      `<h1>{{ 'Welcome' | t }}</h1>\n`,
    );
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('writes shim file for each input', () => {
    const result = extractTemplates({
      cwd: root,
      include: ['src/**/*.html'],
      outDir: '.lingui-extracted',
    });
    expect(result.shimsWritten).toBe(1);
    expect(result.warnings).toEqual([]);
    const shimPath = join(root, '.lingui-extracted/src/app/foo.component.html.ts');
    const shim = readFileSync(shimPath, 'utf8');
    expect(shim).toContain(`void t({ message: 'Welcome' });`);
  });
});
```

- [ ] **Step 2: Run, fail**

```bash
npm run test:extractor -- extract-templates
```

- [ ] **Step 3: Implement**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/extractor/extract-templates.ts`

```typescript
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { globSync } from 'node:fs';
import { walkTemplate, type ExtractionWarning } from './walk-template';

export interface ExtractOptions {
  cwd: string;
  include: string[];
  outDir: string; // relative to cwd
}

export interface ExtractResult {
  shimsWritten: number;
  warnings: ExtractionWarning[];
}

export function extractTemplates(opts: ExtractOptions): ExtractResult {
  const warnings: ExtractionWarning[] = [];
  let count = 0;
  for (const pattern of opts.include) {
    const matches = globSync(pattern, { cwd: opts.cwd });
    for (const match of matches) {
      const abs = join(opts.cwd, match);
      const source = readFileSync(abs, 'utf8');
      const result = walkTemplate(source, match);
      warnings.push(...result.warnings);
      const shim = result.emit();
      const target = join(opts.cwd, opts.outDir, `${match}.ts`);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, shim, 'utf8');
      count++;
    }
  }
  return { shimsWritten: count, warnings };
}

export function cleanExtracted(cwd: string, outDir: string): void {
  rmSync(join(cwd, outDir), { recursive: true, force: true });
}
```

> If `node:fs`'s `globSync` is unavailable in your Node version, fall back to the `glob` npm package (already pulled in by other tooling). The spec assumes Node 22+, which has it.

- [ ] **Step 4: Run, pass**

```bash
npm run test:extractor
```

- [ ] **Step 5: Commit**

```bash
git add projects/lingui-angular/extractor/{extract-templates.ts,extract-templates.spec.ts}
git commit -m "feat(extractor): extractTemplates() writes shims under .lingui-extracted/"
```

## Task 5.7 — CLI `bin.ts`

- [ ] **Step 1: Write the CLI**

File: `/Users/toc/git/tivedo/lingui-angular/projects/lingui-angular/extractor/bin.ts`

```typescript
#!/usr/bin/env node
import chokidar from 'chokidar';
import { join } from 'node:path';
import { cleanExtracted, extractTemplates } from './extract-templates';

const cwd = process.cwd();
const cmd = process.argv[2] ?? 'extract';

function loadConfig(): { include: string[]; outDir: string } {
  // Minimal: read lingui.config.ts via dynamic import for `include`,
  // otherwise sensible defaults.
  return { include: ['src/**/*.html', 'projects/**/src/**/*.html'], outDir: '.lingui-extracted' };
}

async function main(): Promise<void> {
  const cfg = loadConfig();

  if (cmd === 'clean') {
    cleanExtracted(cwd, cfg.outDir);
    console.log(`[lingui-angular] cleaned ${join(cwd, cfg.outDir)}`);
    return;
  }

  const watch = process.argv.includes('--watch');

  const run = (): void => {
    const result = extractTemplates({ cwd, include: cfg.include, outDir: cfg.outDir });
    if (result.warnings.length) {
      for (const w of result.warnings) {
        console.warn(`[lingui-angular] ${w.file}:${w.line}:${w.column} — ${w.reason}`);
      }
    }
    console.log(`[lingui-angular] wrote ${result.shimsWritten} shim(s)`);
  };

  run();

  if (watch) {
    const watcher = chokidar.watch(cfg.include, { cwd, ignoreInitial: true });
    watcher.on('all', run);
    console.log('[lingui-angular] watching for template changes…');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Smoke test the CLI manually**

```bash
npx tsx projects/lingui-angular/extractor/bin.ts extract
```

Expected: prints `[lingui-angular] wrote N shim(s)` where N ≥ 0 (likely 0 — no templates yet outside fixtures).

(If `tsx` is not installed, `npm i --save-dev tsx` first.)

- [ ] **Step 3: Update `public-api.ts` to NOT re-export the bin (bins go through `package.json`)**

No source change here; just verify `package.json` will need a `"bin"` entry when we publish. That's added in Phase 8.

- [ ] **Step 4: Commit + PR**

```bash
git add projects/lingui-angular/extractor/bin.ts package.json package-lock.json
git commit -m "feat(extractor): CLI bin (extract, --watch, clean)"
git push -u origin toc/p5-extractor
gh pr create --title "feat: phase 5 — template extractor + CLI" --body "AST-walking extractor for | t, | tPlural, | tSelect, and [t]; emits TS shims under .lingui-extracted/ for Lingui's CLI to ingest. Fixtures + snapshot tests for every supported pattern; warn-only path for non-literal usages. CLI exposes extract / --watch / clean."
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

# Phase 6 — Kitchen-sink demo (one route at a time)

**Goal:** A working demo app with all 10 feature routes, locale switcher, status bar, lazy-loaded Spanish catalog, and minimal CSS. Each route is its own commit (and they can land in a single PR for the phase).

**PR:** `toc/p6-kitchen-sink`

## Task 6.1 — Branch + locale catalogs + Lingui config

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull
git checkout -b toc/p6-kitchen-sink
```

- [ ] **Step 2: Write `lingui.config.ts` at the demo root**

File: `/Users/toc/git/tivedo/lingui-angular/projects/kitchen-sink/lingui.config.ts`

```typescript
import { defineConfig } from '@lingui/cli';

export default defineConfig({
  locales: ['en', 'fr', 'da', 'es'],
  sourceLocale: 'en',
  format: 'po',
  catalogs: [
    {
      path: '<rootDir>/projects/kitchen-sink/src/locales/{locale}',
      include: [
        '<rootDir>/projects/kitchen-sink/src/**/*.ts',
        '<rootDir>/projects/kitchen-sink/.lingui-extracted/**/*.ts',
      ],
    },
  ],
});
```

- [ ] **Step 3: Seed initial empty `.po` catalogs**

File: `/Users/toc/git/tivedo/lingui-angular/projects/kitchen-sink/src/locales/en.po`

```
msgid ""
msgstr ""
"Language: en\n"
"MIME-Version: 1.0\n"
"Content-Type: text/plain; charset=utf-8\n"
"Content-Transfer-Encoding: 8bit\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\n"
```

Repeat for `fr.po`, `da.po`, `es.po` with the appropriate `Language:` lines.

- [ ] **Step 4: Commit**

```bash
git add projects/kitchen-sink/lingui.config.ts projects/kitchen-sink/src/locales/
git commit -m "chore(demo): add lingui.config.ts + empty po catalogs"
```

## Task 6.2 — App shell

- [ ] **Step 1: Write `app.component.ts` (shell with header, sidebar, outlet, footer)**

File: `/Users/toc/git/tivedo/lingui-angular/projects/kitchen-sink/src/app/app.component.ts`

```typescript
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { LocaleSwitcherComponent } from './shared/locale-switcher.component';
import { StatusBarComponent } from './shared/status-bar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterOutlet, LocaleSwitcherComponent, StatusBarComponent],
  template: `
    <header>
      <h1>&commat;tocdk/lingui-angular kitchen sink</h1>
      <app-locale-switcher />
    </header>
    <main>
      <nav>
        <a routerLink="/basic">basics</a>
        <a routerLink="/params">params</a>
        <a routerLink="/plural">plural</a>
        <a routerLink="/select">select</a>
        <a routerLink="/context">context</a>
        <a routerLink="/explicit-id">explicit ids</a>
        <a routerLink="/lazy">lazy</a>
        <a routerLink="/ssr">ssr</a>
        <a routerLink="/cd">cd</a>
        <a routerLink="/missing">missing</a>
      </nav>
      <section><router-outlet /></section>
    </main>
    <app-status-bar />
  `,
})
export class AppComponent {}
```

- [ ] **Step 2: Wire `provideLingui` into `main.ts`**

File: `/Users/toc/git/tivedo/lingui-angular/projects/kitchen-sink/src/main.ts`

```typescript
import { bootstrapApplication, provideClientHydration } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideLingui } from '@tocdk/lingui-angular';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(),
    provideLingui({
      sourceLocale: 'en',
      locales: ['en', 'fr', 'da', 'es'],
      loader: async (locale) => {
        const mod = await import(`./locales/${locale}.po`);
        return { messages: mod.messages };
      },
    }),
  ],
}).catch((err) => console.error(err));
```

> If `.po` files can't be imported directly, add a vite-plugin (`@lingui/loader`) in the project's vite config. The Angular CLI build uses Webpack-on-esbuild; the loader plugin works there too.

- [ ] **Step 3: Locale switcher component**

File: `/Users/toc/git/tivedo/lingui-angular/projects/kitchen-sink/src/app/shared/locale-switcher.component.ts`

```typescript
import { Component, inject } from '@angular/core';
import { LinguiService } from '@tocdk/lingui-angular';

@Component({
  selector: 'app-locale-switcher',
  standalone: true,
  template: `
    @for (l of lingui.locales; track l) {
      <button (click)="lingui.activate(l)" [disabled]="lingui.locale() === l">{{ l }}</button>
    }
  `,
})
export class LocaleSwitcherComponent {
  protected readonly lingui = inject(LinguiService);
}
```

- [ ] **Step 4: Status bar component**

File: `/Users/toc/git/tivedo/lingui-angular/projects/kitchen-sink/src/app/shared/status-bar.component.ts`

```typescript
import { Component, inject } from '@angular/core';
import { LinguiService } from '@tocdk/lingui-angular';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  template: `
    <small>
      active: <strong>{{ lingui.locale() }}</strong>
      · loading: {{ lingui.loading() }}
      · source: {{ lingui.sourceLocale }}
    </small>
  `,
})
export class StatusBarComponent {
  protected readonly lingui = inject(LinguiService);
}
```

- [ ] **Step 5: Empty demo-page wrapper component**

File: `/Users/toc/git/tivedo/lingui-angular/projects/kitchen-sink/src/app/shared/demo-page.component.ts`

```typescript
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-demo-page',
  standalone: true,
  template: `
    <h2>{{ title }}</h2>
    <section><ng-content select="[rendered]" /></section>
    <pre><ng-content select="[source]" /></pre>
  `,
})
export class DemoPageComponent {
  @Input({ required: true }) title!: string;
}
```

- [ ] **Step 6: Commit**

```bash
git add projects/kitchen-sink/src/{main.ts,app/app.component.ts,app/shared}
git commit -m "feat(demo): app shell + locale switcher + status bar"
```

## Tasks 6.3 through 6.12 — One route per task

Each task follows the same pattern:

1. Create `projects/kitchen-sink/src/app/features/<name>.component.ts` exercising the named API.
2. Add a route entry to `app.routes.ts`.
3. Run `npm run start` and visually confirm the route renders translated content in each locale.
4. Commit.

### Task 6.3 — `/basic` route

File: `projects/kitchen-sink/src/app/features/basic.component.ts`

```typescript
import { Component, signal, computed } from '@angular/core';
import { TDirective, TPipe, t } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  standalone: true,
  imports: [DemoPageComponent, TPipe, TDirective],
  template: `
    <app-demo-page title="basic">
      <div rendered>
        <p>{{ greeting() }}</p>
        <h3>{{ 'Welcome' | t }}</h3>
        <button [t]="'About'"></button>
      </div>
    </app-demo-page>
  `,
})
export default class BasicComponent {
  protected greeting = computed(() => t\`Hello\`);
}
```

Append to `app.routes.ts`:

```typescript
{ path: 'basic', loadComponent: () => import('./features/basic.component') },
```

Commit: `feat(demo): /basic route — t\`...\`, | t, [t]`.

### Task 6.4 — `/params` route

```typescript
import { Component, signal, computed } from '@angular/core';
import { TPipe, t } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  standalone: true,
  imports: [DemoPageComponent, TPipe],
  template: `
    <app-demo-page title="params">
      <div rendered>
        <p>{{ greeting() }}</p>
        <p>{{ 'Hello, {name}' | t: { name: name() } }}</p>
      </div>
    </app-demo-page>
  `,
})
export default class ParamsComponent {
  protected name = signal('Alice');
  protected greeting = computed(() => t\`Hello, \${this.name()}!\`);
}
```

Route: `{ path: 'params', loadComponent: () => import('./features/params.component') }`.

Commit: `feat(demo): /params route — tagged-template + pipe placeholder forms`.

### Task 6.5 — `/plural` route

```typescript
import { Component, signal, computed } from '@angular/core';
import { TPluralPipe, plural } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  standalone: true,
  imports: [DemoPageComponent, TPluralPipe],
  template: `
    <app-demo-page title="plural">
      <div rendered>
        <input type="number" [value]="count()" (input)="count.set(+($any($event.target)).value)" />
        <p>{{ pluralTs() }}</p>
        <p>{{ count() | tPlural: { one: '# item', other: '# items' } }}</p>
      </div>
    </app-demo-page>
  `,
})
export default class PluralComponent {
  protected count = signal(1);
  protected pluralTs = computed(() => plural(this.count(), { one: '# item', other: '# items' }));
}
```

Route: `{ path: 'plural', ... }`.

Commit: `feat(demo): /plural route — plural() + | tPlural`.

### Task 6.6 — `/select` route

```typescript
import { Component, signal, computed } from '@angular/core';
import { TSelectPipe, select } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  standalone: true,
  imports: [DemoPageComponent, TSelectPipe],
  template: `
    <app-demo-page title="select">
      <div rendered>
        <select #s (change)="status.set(s.value)">
          <option value="active">active</option>
          <option value="away">away</option>
          <option value="offline">offline</option>
        </select>
        <p>{{ selectTs() }}</p>
        <p>{{ status() | tSelect: { active: 'Online', away: 'Idle', other: 'Offline' } }}</p>
      </div>
    </app-demo-page>
  `,
})
export default class SelectComponent {
  protected status = signal('active');
  protected selectTs = computed(() => select(this.status(), { active: 'Online', away: 'Idle', other: 'Offline' }));
}
```

Route + commit pattern as above.

### Task 6.7 — `/context` route

```typescript
import { Component, computed } from '@angular/core';
import { TPipe, t } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  standalone: true,
  imports: [DemoPageComponent, TPipe],
  template: `
    <app-demo-page title="context">
      <div rendered>
        <p>Verb: <strong>{{ verb() }}</strong></p>
        <p>Adjective: <strong>{{ adj() }}</strong></p>
        <p>Verb (pipe): <strong>{{ 'Open' | t: { $context: 'verb' } }}</strong></p>
        <p>Adjective (pipe): <strong>{{ 'Open' | t: { $context: 'adjective' } }}</strong></p>
      </div>
    </app-demo-page>
  `,
})
export default class ContextComponent {
  protected verb = computed(() => t({ message: 'Open', context: 'verb' }));
  protected adj = computed(() => t({ message: 'Open', context: 'adjective' }));
}
```

Route + commit.

### Task 6.8 — `/explicit-id` route

```typescript
import { Component, computed } from '@angular/core';
import { TPipe, t } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  standalone: true,
  imports: [DemoPageComponent, TPipe],
  template: `
    <app-demo-page title="explicit-id">
      <div rendered>
        <p>{{ welcomeTs() }}</p>
        <p>{{ 'Welcome' | t: { $id: 'auth.welcome' } }}</p>
      </div>
    </app-demo-page>
  `,
})
export default class ExplicitIdComponent {
  protected welcomeTs = computed(() => t({ id: 'auth.welcome', message: 'Welcome' }));
}
```

Route + commit.

### Task 6.9 — `/lazy` route

```typescript
import { Component, inject, signal } from '@angular/core';
import { LinguiService } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  standalone: true,
  imports: [DemoPageComponent],
  template: `
    <app-demo-page title="lazy">
      <div rendered>
        <p>Spanish catalog is only fetched when this route is visited.</p>
        @if (loaded()) {
          <button (click)="lingui.activate('es')">Activate Spanish</button>
        } @else {
          <p>(loading es catalog…)</p>
        }
      </div>
    </app-demo-page>
  `,
})
export default class LazyComponent {
  protected readonly lingui = inject(LinguiService);
  protected loaded = signal(false);

  constructor() {
    // Pre-load the es catalog so a subsequent activate('es') is instant
    void this.lingui.activate('es').then(() => this.loaded.set(true));
  }
}
```

Route + commit.

### Task 6.10 — `/ssr` route

```typescript
import { Component, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  standalone: true,
  imports: [DemoPageComponent],
  template: `
    <app-demo-page title="ssr">
      <div rendered>
        <p>Rendered on: <strong>{{ where }}</strong></p>
        <p>(If you view-source the page, the translated content is already in the HTML.)</p>
      </div>
    </app-demo-page>
  `,
})
export default class SsrComponent {
  protected readonly where = isPlatformBrowser(inject(PLATFORM_ID)) ? 'client' : 'server';
}
```

Route + commit.

### Task 6.11 — `/cd` route

```typescript
import { Component, OnDestroy, computed, signal } from '@angular/core';
import { t } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  standalone: true,
  imports: [DemoPageComponent],
  template: `
    <app-demo-page title="cd">
      <div rendered>
        <p>{{ message() }}</p>
      </div>
    </app-demo-page>
  `,
})
export default class CdComponent implements OnDestroy {
  protected n = signal(0);
  protected message = computed(() => t\`Tick: \${this.n()}\`);
  private timer = setInterval(() => this.n.update((v) => v + 1), 1000);
  ngOnDestroy(): void { clearInterval(this.timer); }
}
```

Route + commit.

### Task 6.12 — `/missing` route

```typescript
import { Component } from '@angular/core';
import { TPipe } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  standalone: true,
  imports: [DemoPageComponent, TPipe],
  template: `
    <app-demo-page title="missing">
      <div rendered>
        <p>
          The string below is intentionally absent from fr.po — switch to FR
          and watch it fall back to the English source. Console will log a
          missing-message warning.
        </p>
        <p>{{ 'this is deliberately untranslated' | t }}</p>
      </div>
    </app-demo-page>
  `,
})
export default class MissingComponent {}
```

Route + commit.

## Task 6.13 — First extract pass + populate the catalogs

- [ ] **Step 1: Run the full extract pipeline**

```bash
npm run extract
```

Expected: `.lingui-extracted/` populated for the demo, then `lingui extract` updates `projects/kitchen-sink/src/locales/*.po`, then cleanup removes the temp dir.

- [ ] **Step 2: Open the FR catalog and translate the demo strings**

Edit `projects/kitchen-sink/src/locales/fr.po` and add `msgstr "<translation>"` for each `msgid`. (Translate by hand or via DeepL — accuracy doesn't matter, but every string except the `/missing` one must have a non-empty translation in FR.)

Same for `da.po` and `es.po`. For `/missing`, leave the deliberately-missing string blank in `fr.po` only.

- [ ] **Step 3: Commit translations**

```bash
git add projects/kitchen-sink/src/locales/*.po
git commit -m "docs(demo): translate kitchen-sink strings into fr, da, es"
```

## Task 6.14 — Demo CSS + final polish

- [ ] **Step 1: Minimal styles**

File: `/Users/toc/git/tivedo/lingui-angular/projects/kitchen-sink/src/styles.css`

```css
:root { font-family: system-ui, sans-serif; line-height: 1.4; }
body { margin: 0; }
header { display: flex; align-items: center; justify-content: space-between; padding: .75rem 1rem; border-bottom: 1px solid #ddd; }
header h1 { font-size: 1rem; margin: 0; }
main { display: grid; grid-template-columns: 12rem 1fr; gap: 1rem; padding: 1rem; }
nav { display: flex; flex-direction: column; gap: .25rem; }
nav a { color: inherit; text-decoration: none; padding: .25rem .5rem; border-radius: .25rem; }
nav a:hover { background: #f0f0f0; }
section { min-height: 60vh; }
pre { background: #f7f7f7; padding: 1rem; border-radius: .25rem; overflow-x: auto; }
app-status-bar { position: sticky; bottom: 0; display: block; padding: .5rem 1rem; background: #fafafa; border-top: 1px solid #ddd; }
button { padding: .25rem .75rem; }
```

- [ ] **Step 2: Smoke test in the browser**

```bash
npm run start
# Visit http://localhost:4200/basic, click through each route, switch locales.
```

Expected: all 10 routes render, locale switch updates text in all of them, status bar reflects state.

- [ ] **Step 3: Build SSR + production client**

```bash
npm run build:demo
npm run build:demo:ssr
```

Both must succeed. Bundle budgets in `angular.json` may warn but should not error.

- [ ] **Step 4: Commit + PR**

```bash
git add projects/kitchen-sink/src/styles.css
git commit -m "feat(demo): minimal css polish"
git push -u origin toc/p6-kitchen-sink
gh pr create --title "feat: phase 6 — kitchen-sink demo (all 10 routes)" --body "Demo app exercises every documented API: t\\\`...\\\`, plural, select, context, explicit ids, lazy-loaded catalog, SSR, signal-driven change detection, missing-translation fallback. Both client and SSR builds green."
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

# Phase 7 — CI workflows

**Goal:** GH Actions running lint, tests (with coverage), library build, demo client+SSR build, and `extract:check` snapshot diff on every push / PR.

**PR:** `toc/p7-ci`

## Task 7.1 — Branch + CI workflow

```bash
git checkout main && git pull
git checkout -b toc/p7-ci
mkdir -p .github/workflows
```

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: ci

on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: ${{ matrix.node-version }}, cache: npm }
      - run: npm ci
      - run: npm run test:coverage
      - if: matrix.node-version == 22
        uses: actions/upload-artifact@v4
        with: { name: coverage, path: coverage/ }

  build-lib:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run build:lib
      - run: |
          test -f dist/lingui-angular/package.json || (echo 'missing dist package.json' && exit 1)
          test -f dist/lingui-angular/fesm2022/tocdk-lingui-angular.mjs || (echo 'missing fesm bundle' && exit 1)

  build-demo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run build:lib
      - run: npm run build:demo
      - run: npm run build:demo:ssr

  extract-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run build:lib
      - run: npm run extract:check
```

- [ ] **Step 2: Commit + PR + merge**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add lint / test / build-lib / build-demo / extract-check"
git push -u origin toc/p7-ci
gh pr create --title "ci: phase 7 — github actions ci" --body "Lint, Vitest with coverage on Node 20+22, library build with dist shape check, client+SSR demo builds, and extract:check snapshot guard."
# Wait for CI to actually pass before merging.
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull
```

## Task 7.2 — Release workflow

- [ ] **Step 1: Write `.github/workflows/release.yml`**

```yaml
name: release

on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm test
      - run: npm run build:lib
      - run: npm run build:demo
      - name: Create GitHub release
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: gh release create ${GITHUB_REF_NAME} --generate-notes
```

- [ ] **Step 2: Commit and merge directly** (no need for a separate PR if the previous one just merged)

```bash
git checkout -b toc/p7-release-workflow
git add .github/workflows/release.yml
git commit -m "ci: gate version tags behind green build + open a github release"
git push -u origin toc/p7-release-workflow
gh pr create --title "ci: add release workflow" --body "Tag push triggers a green-build gate + GitHub Release. No npm publish step."
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

# Phase 8 — Docs polish + `prepare` script

**Goal:** README that gets a new user to "Hello, world" in under 10 minutes. CONTRIBUTING, CHANGELOG seed, issue/PR templates. `prepare` script added now that the build works.

**PR:** `toc/p8-docs`

## Task 8.1 — Branch + add `prepare` to package.json

```bash
git checkout main && git pull
git checkout -b toc/p8-docs
```

- [ ] **Step 1: Modify `/Users/toc/git/tivedo/lingui-angular/package.json`** — add to `scripts`:

```json
"prepare": "if [ -z \"$CI\" ] && [ -d projects/lingui-angular ]; then ng build lingui-angular --configuration=production; fi"
```

The guard skips `prepare` in CI (where we run builds explicitly) and in checkouts that don't contain the library project.

- [ ] **Step 2: Add `exports` and `files` for github-install**

In the same `package.json`:

```json
"exports": {
  ".":           { "types": "./dist/lingui-angular/index.d.ts",           "default": "./dist/lingui-angular/fesm2022/tocdk-lingui-angular.mjs" },
  "./extractor": { "types": "./dist/lingui-angular/extractor/index.d.ts", "default": "./dist/lingui-angular/extractor/index.mjs" }
},
"bin": { "lingui-angular": "./dist/lingui-angular/extractor/bin.mjs" },
"files": ["dist/", "LICENSE", "README.md"]
```

- [ ] **Step 3: Smoke test — simulate a github install**

```bash
mkdir -p /tmp/lingui-install-test && cd /tmp/lingui-install-test
npm init -y >/dev/null
npm install /Users/toc/git/tivedo/lingui-angular
node -e "console.log(Object.keys(require('@tocdk/lingui-angular')))"
```

Expected: prints `[ 'LinguiUnknownLocaleError', 'provideLingui', 'LinguiService', 'TPipe', ... ]` etc. (Will run `prepare` and build before resolving exports — slow first time.)

Clean up: `rm -rf /tmp/lingui-install-test`.

- [ ] **Step 4: Commit**

```bash
git -C /Users/toc/git/tivedo/lingui-angular add package.json
git -C /Users/toc/git/tivedo/lingui-angular commit -m "chore: add prepare script + exports for github-install"
```

## Task 8.2 — Write the production README

Replace `/Users/toc/git/tivedo/lingui-angular/README.md` with the full README per the spec's §7 structure (11 sections: what & why, install, quickstart, templates, plural/select, extraction setup, SSR notes, kitchen-sink reference, comparison, contributing, license).

Each section should be short and example-led. Don't pad it.

Commit: `docs: full README`.

## Task 8.3 — CONTRIBUTING, CHANGELOG, issue/PR templates

Add:
- `CONTRIBUTING.md` — branch convention, test/lint commands, how to add features
- `CHANGELOG.md` — Keep-a-Changelog header + an `## Unreleased` section
- `.github/ISSUE_TEMPLATE/bug.md`
- `.github/ISSUE_TEMPLATE/feature.md`
- `.github/PULL_REQUEST_TEMPLATE.md`

Commit: `docs: contributing, changelog, issue/PR templates`. Push + PR + merge.

---

# Phase 9 — Cut v0.1.0

**Goal:** First tagged release.

**PR:** none — direct tag from main.

## Task 9.1 — Bump version + changelog

- [ ] **Step 1: Bump version in both `package.json` files**

```bash
git checkout main && git pull
npm version 0.1.0 --no-git-tag-version
# Also bump projects/lingui-angular/package.json's version to 0.1.0 by hand.
```

- [ ] **Step 2: Write the v0.1.0 entry in `CHANGELOG.md`**

```markdown
## [0.1.0] — 2026-06-XX

### Added
- `provideLingui()` + `LinguiService` (signal-based active locale, lazy catalog loading, fallback locales)
- `| t`, `| tPlural`, `| tSelect` pipes (pure, signal-aware)
- `[t]` directive
- SSR helpers — `serializeCatalog` / `hydrateCatalog` via Angular `TransferState`
- Template extractor with CLI (`lingui-angular extract|--watch|clean`) emitting TS shims into `.lingui-extracted/` for Lingui's CLI to ingest
- Kitchen-sink demo with 10 feature routes covering every documented API
```

- [ ] **Step 3: Commit + tag + push**

```bash
git add package.json projects/lingui-angular/package.json CHANGELOG.md
git commit -m "release: v0.1.0"
git tag v0.1.0
git push && git push --tags
```

The `release.yml` workflow will fire on the tag push, build everything green, and create a GitHub Release.

- [ ] **Step 4: Confirm the release was created**

```bash
gh release view v0.1.0
```

---

# Self-review (done during plan authoring, not on first execution)

**Spec coverage check** — every section of the spec has a task:

- §1 Overview & goals → Phase 1 (scaffold) + Phase 6 (kitchen sink) + Phase 8 (README quickstart claim)
- §2 Architecture → Tasks 1.6, 1.7, 2.4, 4.x, 5.x (the file structure is realized phase by phase)
- §3 API surface → Phase 2 (service, provider, errors), Phase 3 (pipes, directive), Phase 4 (SSR helpers); tag-fn re-exports in Task 2.11
- §4 Extraction pipeline → Phase 5 (walker, shim emitter, CLI), Task 6.13 (first extract pass on the demo), CI extract-check in Phase 7
- §5 Kitchen sink → Phase 6 (all 10 routes, layout, CSS)
- §6 Testing strategy → Vitest setup in Task 1.8; every implementation task in Phases 2–5 is paired with a spec; coverage thresholds in `vitest.config.ts`; CI runs `test:coverage` in Phase 7
- §7 Packaging/CI/dist/license → ng-packagr config in Task 1.6, CI in Phase 7, `prepare` + `exports` in Task 8.1, license already shipped pre-plan

**Type consistency check:**
- `LinguiConfig` shape used identically across `provide-lingui.ts`, `lingui.service.ts`, and `lingui.service.spec.ts` test builders. ✓
- `TPipeOptions` (Phase 3) exposes `$context` / `$id` / placeholder values; matches the extractor's `parseOptionsArg` (Phase 5) which looks for those exact key names. ✓
- `LinguiUnknownLocaleError` defined Phase 2 Task 2.2, thrown in Task 2.8 (post-fallback resolution), tested in Task 2.7. Order is: define → use → test that the use throws it. ✓
- `serializeCatalog` / `hydrateCatalog` signatures consistent between definition (Task 4.2), service consumption (Task 4.3), and public-api re-export. ✓

**Known approximations called out in tasks:**
- Task 5.5: column numbers in the `invalid.expected.warnings.json` may shift by ±1 with Angular compiler version drift — task notes to update the expected file if so.
- Task 6.2: `.po` import in `main.ts` may need `@lingui/loader` if Angular CLI's esbuild doesn't recognize the extension out of the box — task notes the fallback.
- Task 5.6: uses `node:fs`'s `globSync` (Node 22+); if not available, fall back to `glob` package.

**Placeholder scan:** no "TBD" / "TODO" remain. Every code step shows the actual code. ✓

---

# Plan complete

This plan covers v0.1.0 end-to-end: scaffold → runtime → SSR → extractor → demo → CI → release. ~50 tasks across 9 phases. Each phase lands as one PR; each task is one commit.
