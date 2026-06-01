import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering } from '@angular/ssr';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideLingui } from '@tocdk/lingui-angular';
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
    ],
  });

export default bootstrap;
