# @tocdk/lingui-angular

Angular 20+ bindings for [Lingui](https://lingui.dev/) — write English in source, extract via AST, ship PO catalogs. Signal-only, zoneless, standalone-first.

---

## Contents

1. [What & why](#what--why)
2. [Install](#install)
3. [60-second quickstart](#60-second-quickstart)
4. [Templates](#templates)
5. [Plural & select](#plural--select)
6. [Extraction setup](#extraction-setup)
7. [SSR](#ssr)
8. [Kitchen-sink reference](#kitchen-sink-reference)
9. [Comparison](#comparison)
10. [Contributing](#contributing)
11. [License](#license)

---

## What & why

`@tocdk/lingui-angular` lets you write all your user-facing strings as plain English directly in source (no message-ID keys to maintain), extract them at build time by walking Angular template ASTs, and ship the results as standard PO catalogs that any translator tool can edit. At runtime the library is a thin Signal-aware wrapper around `@lingui/core` — locale changes propagate reactively without Zone.js, and SSR catalog handoff is handled for you via Angular `TransferState`.

---

## Install

```bash
npm install github:tocDK/lingui-angular
```

The install runs `prepare`, which builds the library (~30 s first time). Subsequent installs skip the build when the `dist/` folder is already present.

**Peer dependencies** — install these yourself:

```bash
npm install @angular/core @angular/common @lingui/core
# For the extractor (dev only):
npm install --save-dev @angular/compiler @lingui/cli @lingui/format-po
```

---

## 60-second quickstart

### 1. Bootstrap with `provideLingui`

```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideLingui } from '@tocdk/lingui-angular';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideLingui({
      sourceLocale: 'en',
      locales: ['en', 'fr', 'da', 'es'],
      loader: async (locale) => {
        // Import pre-compiled .ts catalogs (run `lingui compile --typescript` first)
        switch (locale) {
          case 'fr': return import('./locales/fr');
          case 'da': return import('./locales/da');
          case 'es': return import('./locales/es');
          default:   return import('./locales/en');
        }
      },
    }),
  ],
});
```

### 2. Add a locale switcher

```typescript
// locale-switcher.component.ts
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

### 3. Translate in a component

```typescript
// greeting.component.ts
import { Component, computed, inject } from '@angular/core';
import { LinguiService, TPipe, TDirective } from '@tocdk/lingui-angular';

@Component({
  selector: 'app-greeting',
  standalone: true,
  imports: [TPipe, TDirective],
  template: `
    <h1>{{ greeting() }}</h1>
    <h2>{{ 'Welcome' | t }}</h2>
    <button [t]="'Sign in'"></button>
  `,
})
export class GreetingComponent {
  private readonly lingui = inject(LinguiService);
  protected greeting = computed(() => this.lingui.t('Hello'));
}
```

---

## Templates

### `| t` pipe — plain string

```html
<p>{{ 'Hello' | t }}</p>
```

### `| t` pipe — with interpolation

```html
<!-- Single placeholder -->
<p>{{ 'Hello, {name}' | t: { name: name() } }}</p>

<!-- $context is an extraction hint (verb vs. noun disambiguation); stripped at runtime -->
<button>{{ 'File' | t: { $context: 'verb' } }}</button>

<!-- $id overrides the message key (useful for long messages with a short ID) -->
<p>{{ 'Very long source string...' | t: { $id: 'long-msg' } }}</p>
```

### `[t]` directive — set `textContent`

```html
<span [t]="'About'"></span>
<button [t]="label()"></button>
```

The directive uses an Angular `effect()` internally so it re-runs reactively whenever the locale changes or the bound value changes.

### `LinguiService.t()` — one-shot translation in TypeScript

```typescript
const msg = this.lingui.t('Hello');
```

### `LinguiService.t$()` — reactive Signal translation

```typescript
// Re-evaluates automatically when locale changes
protected label = this.lingui.t$('Submit');
```

---

## Plural & select

### `| tPlural` — locale-aware plural rules

```html
<p>{{ count() | tPlural: { one: '# item', other: '# items' } }}</p>
```

`#` is replaced with the count. Supported keys: `zero`, `one`, `two`, `few`, `many`, `other` (CLDR rules).

### `| tSelect` — enumerated values

```html
<p>{{ status() | tSelect: { active: 'Online', away: 'Idle', other: 'Offline' } }}</p>
```

The `other` key is required as the fallback.

---

## Extraction setup

### 1. Configure Lingui

```typescript
// lingui.config.ts
import { defineConfig } from '@lingui/cli';
import { formatter } from '@lingui/format-po';

export default defineConfig({
  locales: ['en', 'fr', 'da', 'es'],
  sourceLocale: 'en',
  format: formatter({ lineNumbers: false }),
  catalogs: [
    {
      path: '<rootDir>/src/locales/{locale}',
      include: [
        '<rootDir>/src/**/*.ts',
        '<rootDir>/.lingui-extracted/**/*.ts',   // ← shims from the Angular extractor
      ],
    },
  ],
});
```

### 2. Run extraction

```bash
npm run extract
```

Under the hood this runs:

```bash
lingui-angular extract   # walks Angular templates, writes shims to .lingui-extracted/
lingui extract           # Lingui CLI picks up shims + .ts sources, updates .po files
lingui-angular clean     # removes the shim directory
```

Wire this up in `package.json`:

```json
{
  "scripts": {
    "extract": "lingui-angular extract && lingui extract && lingui-angular clean",
    "extract:check": "lingui compile --typescript && git diff --exit-code src/locales"
  }
}
```

### 3. Compile catalogs

Before building the app, compile PO files to TypeScript modules:

```bash
npx lingui compile --typescript
```

Then import them with a dynamic `switch` in your `loader` (see the quickstart above). Angular CLI's esbuild pipeline does not support `.po` imports natively.

### 4. Watch mode

```bash
lingui-angular extract --watch & lingui extract --watch
```

### Extractor CLI reference

```
lingui-angular extract [--watch]   Extract templates → .lingui-extracted/
lingui-angular clean               Remove .lingui-extracted/
```

---

## SSR

`LinguiService` automatically reads from Angular `TransferState` on the client — no FOUC (flash of untranslated content).

### Server bootstrap

```typescript
// main.server.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering } from '@angular/ssr';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideLingui } from '@tocdk/lingui-angular';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

const bootstrap = () =>
  bootstrapApplication(AppComponent, {
    providers: [
      provideZonelessChangeDetection(),
      provideServerRendering(),
      provideLingui({ /* same config as client */ }),
    ],
  });

export default bootstrap;
```

### Serializing the catalog on the server

Call `serializeCatalog` inside your request handler or an `APP_INITIALIZER` that runs on the server:

```typescript
import { inject, TransferState } from '@angular/core';
import { LinguiService, serializeCatalog } from '@tocdk/lingui-angular';

// In an APP_INITIALIZER or route resolver:
const lingui = inject(LinguiService);
const state  = inject(TransferState);
serializeCatalog(lingui.i18n, state, 'lingui-catalog');
```

The client-side `LinguiService` constructor automatically calls `hydrateCatalog` and skips the network fetch when the payload is present.

---

## Kitchen-sink reference

The [`projects/kitchen-sink/`](projects/kitchen-sink/) directory in this repo contains a full Angular SSR application covering every documented API:

| Route | Feature |
|---|---|
| `/basic` | `LinguiService.t()`, `| t` pipe, `[t]` directive |
| `/params` | `| t` with placeholders |
| `/plural` | `| tPlural` |
| `/select` | `| tSelect` |
| `/context` | `$context` extraction hint |
| `/explicit-id` | `$id` key override |
| `/lazy` | Lazily loaded route with its own catalog |
| `/ssr` | SSR `TransferState` handoff |
| `/cd` | Change-detection stress test |
| `/missing` | Missing-key fallback behaviour |

Run it locally:

```bash
npm start         # dev server — http://localhost:4200
npm run build:lib && npm run build:demo:ssr && node dist/kitchen-sink/server/server.mjs
```

A hosted GitHub Pages deployment is planned for v0.2.

---

## Comparison

| | `@tocdk/lingui-angular` | `ngx-translate` | `@angular/localize` |
|---|---|---|---|
| **Write strings as English** | Yes — extract from source | Message-ID keys | Message-ID keys |
| **Signal / zoneless** | Native | Observable-based | Compile-time only |
| **PO catalog format** | Yes | JSON (plugin for PO) | XLIFF |
| **Template extraction** | Angular AST walker | No | `ng extract-i18n` |
| **SSR hydration** | Built-in `TransferState` | Manual | Built-in |
| **Install** | `github:tocDK/lingui-angular` | npm | npm (Angular core) |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE).
