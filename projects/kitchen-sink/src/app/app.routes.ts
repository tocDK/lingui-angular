import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'basic', loadComponent: () => import('./features/basic.component') },
];
