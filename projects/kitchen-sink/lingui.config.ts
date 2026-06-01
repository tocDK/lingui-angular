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
