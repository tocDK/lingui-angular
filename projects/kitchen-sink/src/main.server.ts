import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering } from '@angular/ssr';
import { APP_INITIALIZER, TransferState, inject, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  DEFAULT_SSR_TRANSFER_KEY,
  LinguiService,
  provideLingui,
  serializeCatalog,
} from '@tocdk/lingui-angular';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

const bootstrap = () =>
  bootstrapApplication(AppComponent, {
    providers: [
      provideZonelessChangeDetection(),
      provideRouter(routes),
      provideServerRendering(),
      provideLingui({
        sourceLocale: 'en',
        locales: ['en', 'fr', 'da', 'es'],
        loader: async (locale) => {
          switch (locale) {
            case 'fr': return import('./locales/fr');
            case 'da': return import('./locales/da');
            case 'es': return import('./locales/es');
            default:   return import('./locales/en');
          }
        },
      }),
      // After bootstrap settles (initial detect-locale activation), serialize
      // the active catalog into TransferState so the client can hydrate
      // without re-fetching.
      {
        provide: APP_INITIALIZER,
        multi: true,
        useFactory: () => {
          const lingui = inject(LinguiService);
          const state = inject(TransferState);
          return async () => {
            // Yield once so any constructor-initiated activate() can settle.
            await Promise.resolve();
            serializeCatalog(lingui.i18n, state, DEFAULT_SSR_TRANSFER_KEY);
          };
        },
      },
    ],
  });

export default bootstrap;
