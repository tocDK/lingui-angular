import { Routes } from '@angular/router';
import { LINGUI_SERVICE_CONTENT } from './content/lingui-service.content';
import { T_PIPE_CONTENT } from './content/t-pipe.content';
import { T_PLURAL_PIPE_CONTENT } from './content/t-plural-pipe.content';
import { T_SELECT_PIPE_CONTENT } from './content/t-select-pipe.content';
import { T_DIRECTIVE_CONTENT } from './content/t-directive.content';
import { SSR_CONTENT } from './content/provide-lingui-ssr.content';
import { LAZY_LOADING_CONTENT } from './content/lazy-loading.content';
import { CHANGE_DETECTION_CONTENT } from './content/change-detection.content';
import { MISSING_TRANSLATIONS_CONTENT } from './content/missing-translations.content';
import { GETTING_STARTED_CONTENT } from './content/getting-started.content';

const apiPageLoader = () =>
  import('./pages/api-page.component').then((m) => m.ApiPageComponent);

export const routes: Routes = [
  // Root redirect
  { path: '', pathMatch: 'full', redirectTo: '/getting-started' },

  // Real pages
  { path: 'getting-started', loadComponent: apiPageLoader, data: { content: GETTING_STARTED_CONTENT } },
  { path: 'services/lingui-service', loadComponent: apiPageLoader, data: { content: LINGUI_SERVICE_CONTENT } },
  { path: 'pipes/t-pipe', loadComponent: apiPageLoader, data: { content: T_PIPE_CONTENT } },
  { path: 'pipes/t-plural-pipe', loadComponent: apiPageLoader, data: { content: T_PLURAL_PIPE_CONTENT } },
  { path: 'pipes/t-select-pipe', loadComponent: apiPageLoader, data: { content: T_SELECT_PIPE_CONTENT } },
  { path: 'directives/t-directive', loadComponent: apiPageLoader, data: { content: T_DIRECTIVE_CONTENT } },
  { path: 'ssr/provide-lingui-ssr', loadComponent: apiPageLoader, data: { content: SSR_CONTENT } },
  { path: 'guides/lazy-loading', loadComponent: apiPageLoader, data: { content: LAZY_LOADING_CONTENT } },
  { path: 'guides/change-detection', loadComponent: apiPageLoader, data: { content: CHANGE_DETECTION_CONTENT } },
  { path: 'guides/missing-translations', loadComponent: apiPageLoader, data: { content: MISSING_TRANSLATIONS_CONTENT } },

  // Legacy redirects (preserve external links from v0.2.0)
  { path: 'basic', pathMatch: 'full', redirectTo: '/services/lingui-service' },
  { path: 'params', pathMatch: 'full', redirectTo: '/services/lingui-service' },
  { path: 'plural', pathMatch: 'full', redirectTo: '/pipes/t-plural-pipe' },
  { path: 'select', pathMatch: 'full', redirectTo: '/pipes/t-select-pipe' },
  { path: 'context', pathMatch: 'full', redirectTo: '/services/lingui-service' },
  { path: 'explicit-id', pathMatch: 'full', redirectTo: '/services/lingui-service' },
  { path: 'lazy', pathMatch: 'full', redirectTo: '/guides/lazy-loading' },
  { path: 'ssr', pathMatch: 'full', redirectTo: '/ssr/provide-lingui-ssr' },
  { path: 'cd', pathMatch: 'full', redirectTo: '/guides/change-detection' },
  { path: 'missing', pathMatch: 'full', redirectTo: '/guides/missing-translations' },

  // Catch-all
  { path: '**', redirectTo: '/getting-started' },
];
