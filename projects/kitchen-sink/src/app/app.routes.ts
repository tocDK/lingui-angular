import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'basic', loadComponent: () => import('./features/basic.component') },
  { path: 'params', loadComponent: () => import('./features/params.component') },
  { path: 'plural', loadComponent: () => import('./features/plural.component') },
  { path: 'select', loadComponent: () => import('./features/select.component') },
];
