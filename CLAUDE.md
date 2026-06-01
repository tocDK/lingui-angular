# CLAUDE.md — `@tocdk/lingui-angular`

Rules and gotchas for Claude Code (and contributors) working in this repo.
Full design rationale lives in [`docs/superpowers/specs/`](docs/superpowers/specs/);
this file is the always-loaded summary of what's non-obvious.

## Workflow

- **PR-only.** Every change — code, docs, plan, spec — lands via a Pull Request.
  No direct commits to `main`. Branch naming: `toc/<topic>-<short-description>`.
- **One concern per commit.** Use conventional-commit prefixes: `feat:`, `fix:`,
  `docs:`, `chore:`, `ci:`, `test:`, `refactor:`.
- **Distribution is github-install only.** No npm publish. Consumers run
  `npm i github:tocDK/lingui-angular[#vX.Y.Z]`; the `prepare` script builds
  the lib on install. If considering an npm publish later, see
  [`docs/superpowers/specs/2026-06-01-lingui-angular-design.md` §7](docs/superpowers/specs/2026-06-01-lingui-angular-design.md).

## Top gotchas (will bite you if you forget)

1. **Pipes are `pure: false`.** Don't "fix" them to `pure: true` — Angular's
   pure-pipe cache uses `Object.is` on the pipe arguments, so signal reads
   inside `transform()` never re-fire when the locale signal flips and the
   string literal hasn't changed. Confirmed in Phase 3 review; documented in
   the spec § 2 commitment #2.

2. **`@lingui/core/macro` is not re-exported and must not be used in runtime
   code.** The macro exports (`t`, `plural`, `select` tagged templates) are
   Babel-time transforms; esbuild treats them as runtime imports and throws.
   For TypeScript use `LinguiService.t()` / `t$()`; for templates use the
   `| t` / `| tPlural` / `| tSelect` pipes and the `[t]` directive.

3. **`.po` files do not import in Angular CLI's esbuild.** Pre-compile via
   `npx lingui compile --typescript` and import the generated `.ts` modules
   in your `loader`. See `projects/kitchen-sink/src/main.ts` for the pattern.

## Test discipline

- Vitest with `@analogjs/vite-plugin-angular`. Three projects: `lib` (jsdom),
  `extractor` (node), `ssr` (node).
- **Every TestBed needs `provideZonelessChangeDetection()` in its providers**
  — Angular's `BrowserTestingModule` still defaults to zone CD.
- **`LinguiService` is NOT `providedIn: 'root'`** — it's scoped to the
  environment injector via `provideLingui()`. Tests that need it must call
  `provideLingui({ ... })`. This is intentional (micro-frontend isolation).
- Coverage thresholds in `vitest.config.ts`: ≥90% lines / ≥85% branches on
  `lib` + `extractor`. Don't lower them without a clear reason.

## Dev commands

```bash
npm start                # dev server (kitchen-sink demo) at :4200
npm test                 # vitest, all projects
npm run test:watch       # watch mode
npm run test:coverage    # with coverage thresholds enforced
npm run lint             # eslint flat config
npm run build:lib        # ng-packagr → dist/lingui-angular/
npm run build:demo       # demo client build
npm run build:demo:ssr   # demo SSR build
npm run extract          # walker → Lingui CLI → .po (writes to demo)
npm run extract:check    # drift guard used by CI
```

## Surprises documented in the spec

If a phase divergence makes you go "wait, why doesn't this work the obvious
way", check [the spec's "Open questions / deferred"](docs/superpowers/specs/2026-06-01-lingui-angular-design.md)
and the per-§ callouts. Known deferrals: HTML-comment extraction
(`<!-- i18n: -->` — `parseTemplate` strips them), GitHub Pages demo deploy,
Playwright e2e, npm publish.

## When in doubt

- Read the design spec before changing the public API surface.
- Pipes/services/directive shapes are locked for v0.x — bump minor for any
  breaking change until v1.0.0.
- If you find yourself disabling tests or coverage thresholds to land a
  change, stop and reconsider the change.
