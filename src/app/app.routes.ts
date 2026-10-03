import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then((module) => module.Login),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register').then((module) => module.Register),
  },
  {
    path: 'workspace',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/workspace/workspace').then((module) => module.Workspace),
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
