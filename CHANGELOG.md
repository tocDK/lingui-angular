# Changelog

All notable changes to `@tocdk/lingui-angular` are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Changed
- kitchen-sink demo trimmed from 4 locales (en/fr/da/es) to 2 (en/da). Simpler scan: any future translation-pipeline regression is visible at a glance via the EN↔DA toggle.

[Unreleased]: https://github.com/tocDK/lingui-angular/compare/v0.1.2...HEAD

## [0.1.2] — 2026-06-04

### Fixed
- Runtime: `TPipe`, `TDirective`, and `LinguiService.t()` now hash bare-string source messages via `@lingui/message-utils generateMessageId` before catalog lookup, matching what `lingui compile --typescript` actually emits. Previously the runtime did `messages[sourceText]`, but the CLI keys bare-string entries by 6-char base64 hash — so every bare-string translation silently fell back to the English source. `$context` is now folded into the hash per Lingui's contract. Hand-forged source-keyed catalogs continue to resolve via a two-stage fallback (back-compat). Discovered by `tocDK/tivedo-app`'s FR-002 NFR-4 e2e smoke (clicking DA on `/admin/login` left every string in English).

[0.1.2]: https://github.com/tocDK/lingui-angular/releases/tag/v0.1.2

## [0.1.1] — 2026-06-04

### Fixed
- Template extractor: also extract `t` (and `tPlural` / `tSelect`) pipes from bound attributes like `[label]="'Foo' | t"`, `[attr.title]="'…' | t"`, `[attr.aria-label]="'…' | t"`. Previously these forms were silently ignored because `handleBoundAttr` only recognized the `[t]` directive form. Consumer impact: button labels, aria-labels, and other attribute-bound strings using the pipe form are now harvested into `.po` catalogs as expected.

[0.1.1]: https://github.com/tocDK/lingui-angular/releases/tag/v0.1.1

## [0.1.0] — 2026-06-01

### Added
- `provideLingui()` + `LinguiService` (signal-based active locale, lazy catalog loading, fallback locales, `LinguiUnknownLocaleError` for unknown locales)
- `LinguiService.t()` / `t$()` reactive translation methods
- `| t`, `| tPlural`, `| tSelect` pipes (impure, signal-aware) with `$context` / `$id` metadata support and CLDR-correct plural rules
- `[t]` signal-input directive (Angular 17+ `input.required()` shape) reacting to both locale and binding changes
- SSR helpers — `serializeCatalog` / `hydrateCatalog` via Angular `TransferState`; `LinguiService` constructor auto-hydrates from `TransferState` when present (no FOUC)
- Template extractor at `@tocdk/lingui-angular/extractor`: walks Angular template ASTs via `@angular/compiler`, emits TS shims into `.lingui-extracted/` for Lingui's CLI to ingest. Supports `| t`, `| tPlural`, `| tSelect`, and `[t]`. CLI: `lingui-angular extract|--watch|clean`.
- Kitchen-sink demo (`projects/kitchen-sink/`) with 10 feature routes covering every documented API, both client and SSR builds
- GitHub Actions CI: lint, vitest (44 tests, 90%+ coverage), library build, demo client+SSR build, extract-check drift guard
- MIT license; distributed via github-install (`npm i github:tocDK/lingui-angular`)

[0.1.0]: https://github.com/tocDK/lingui-angular/releases/tag/v0.1.0
