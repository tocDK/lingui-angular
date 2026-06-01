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
