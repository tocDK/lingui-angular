# Contributing to @tocdk/lingui-angular

Thanks for your interest. This is a personal library, but PRs are welcome.

## Setup

```bash
git clone https://github.com/tocDK/lingui-angular.git
cd lingui-angular
npm install      # installs deps; skips prepare in CI
```

## Common commands

| Command | What it does |
|---|---|
| `npm test` | Run all 44 tests |
| `npm run test:watch` | Watch mode |
| `npm run lint` | ESLint check |
| `npm run build:lib` | Build library + compile extractor to `dist/` |
| `npm run build:demo` | Build the kitchen-sink demo |
| `npm run extract` | Extract translations (needs compiled catalogs) |
| `npm run extract:check` | CI gate — fails if catalogs are out of date |

## Branch convention

```
toc/<phase|topic>-<short-description>
```

Examples: `toc/p8-docs`, `toc/fix-plural-edge-case`.

PRs go against `main`. One concern per commit; use [Conventional Commits](https://www.conventionalcommits.org/) prefixes (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).

## Adding a feature

1. Write the failing test first.
2. Implement the feature.
3. Run `npm test` and `npm run lint` — both must pass.
4. If you added a template-extraction case, run `npm run extract` and commit the updated `.po` files.
5. Open a PR with a clear description of the problem it solves.

## Versioning

This library follows [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/).
