import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'basic', pathMatch: 'full' },
  { path: 'basic', loadComponent: () => import('./features/basic.component') },
  { path: 'params', loadComponent: () => import('./features/params.component') },
  { path: 'plural', loadComponent: () => import('./features/plural.component') },
  { path: 'select', loadComponent: () => import('./features/select.component') },
  { path: 'context', loadComponent: () => import('./features/context.component') },
  { path: 'explicit-id', loadComponent: () => import('./features/explicit-id.component') },
  { path: 'lazy', loadComponent: () => import('./features/lazy.component') },
  { path: 'ssr', loadComponent: () => import('./features/ssr.component') },
  { path: 'cd', loadComponent: () => import('./features/cd.component') },
  { path: 'missing', loadComponent: () => import('./features/missing.component') },
];
