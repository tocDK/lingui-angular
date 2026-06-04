import { defineConfig } from '@lingui/cli';
import { formatter } from '@lingui/format-po';

export default defineConfig({
  locales: ['en', 'da'],
  sourceLocale: 'en',
  format: formatter({ lineNumbers: false }),
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
