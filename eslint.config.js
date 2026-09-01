// @ts-check
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const angularEslint = require('angular-eslint');

module.exports = [
  {
    ignores: ['dist/', 'out-tsc/', 'node_modules/', '**/.lingui-extracted/', 'coverage/', '**/locales/*.ts'],
  },
  {
    files: ['**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint,
      '@angular-eslint': angularEslint.tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['tsconfig.base.json'],
      },
    },
    rules: {
      ...tseslint.configs['recommended-type-checked'].rules,
      ...angularEslint.configs.tsRecommended.reduce(
        (acc, cfg) => ({ ...acc, ...(cfg.rules ?? {}) }),
        {},
      ),
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 't', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: ['lib', 'app'], style: 'kebab-case' },
      ],
    },
  },
  // Test / spec files and generated fixtures: relax rules that clash with common test patterns.
  {
    files: ['**/*.spec.ts', '**/*.spec-util.ts', '**/fixtures/**/*.ts'],
    rules: {
      // `async () => ({ ... })` loader stubs don't need an await expression.
      '@typescript-eslint/require-await': 'off',
      // Test helpers routinely access .nativeElement (typed any by Angular test bed).
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      // Fixture shims import macro helpers they don't always call directly.
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  // Extractor CLI and AST walker: interact with @angular/compiler internals typed as `any`.
  {
    files: ['**/extractor/bin.ts', '**/extractor/walk-template.ts', '**/extractor/extract-templates.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },
  // Kitchen-sink demo: Angular 22 made ChangeDetectionStrategy.OnPush the default and
  // renamed the old default to `Eager`. `ng update`'s v22 migration explicitly marked the
  // demo's pre-existing components `Eager` to preserve their exact runtime behaviour. The
  // new-in-angular-eslint-22 `prefer-on-push-component-change-detection` rule flags those
  // migration-added `Eager` annotations as an advisory nudge to adopt OnPush — but the rule
  // itself warns that switching "can change runtime behaviour, so apply the suggestion
  // deliberately". Migrating all 19 demo components to OnPush is a separate, reviewed change,
  // so we keep the behaviour-preserving `Eager` here and turn the advisory rule off for the
  // demo. The shipped library exposes no components, so it is unaffected.
  {
    files: ['projects/kitchen-sink/**/*.ts'],
    rules: {
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
    },
  },
  {
    files: ['**/*.html'],
    plugins: {
      '@angular-eslint/template': angularEslint.templatePlugin,
    },
    languageOptions: {
      parser: angularEslint.templateParser,
    },
    rules: {
      ...angularEslint.configs.templateRecommended.reduce(
        (acc, cfg) => ({ ...acc, ...(cfg.rules ?? {}) }),
        {},
      ),
    },
  },
];
