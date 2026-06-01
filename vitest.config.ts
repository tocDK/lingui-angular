import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular({ tsconfig: './tsconfig.spec.json' })],
  test: {
    globals: true,
    passWithNoTests: true,
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
          // setupFiles must be explicit in the child project — the root-level
          // setupFiles is NOT reliably inherited in Vitest 3 multi-project mode
          // when the Angular plugin is involved. Using a .js file (not .ts) to
          // avoid the Angular compiler transform silently swallowing it.
          setupFiles: ['./vitest.setup.js'],
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
