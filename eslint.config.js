// @ts-check
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const angularEslint = require('angular-eslint');

module.exports = [
  {
    ignores: ['dist/', 'out-tsc/', 'node_modules/', '**/.lingui-extracted/'],
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
