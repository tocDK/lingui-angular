import { bootstrapApplication, provideClientHydration } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideLingui } from '@tocdk/lingui-angular';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(),
    provideLingui({
      sourceLocale: 'en',
      locales: ['en', 'fr', 'da', 'es'],
      loader: async (locale) => {
        // Using pre-compiled .ts modules (lingui compile --typescript)
        // Angular CLI's esbuild does not support .po imports out of the box.
        // Run `npx lingui compile --typescript` before building.
        switch (locale) {
          case 'fr': return import('./locales/fr');
          case 'da': return import('./locales/da');
          case 'es': return import('./locales/es');
          default:   return import('./locales/en');
        }
      },
    }),
  ],
}).catch((err) => console.error(err));
