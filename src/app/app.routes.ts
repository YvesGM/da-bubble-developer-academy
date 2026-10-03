import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { registeredUserGuard } from './core/guards/registered-user.guard';

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
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then(
        (module) => module.ForgotPassword,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password').then(
        (module) => module.ResetPassword,
      ),
  },
  {
    path: 'workspace',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/workspace/workspace').then((module) => module.Workspace),
    children: [
      {
        path: 'channel/:channelId',
        loadComponent: () =>
          import('./features/workspace/channel-view/channel-view').then(
            (module) => module.ChannelView,
          ),
      },
      {
        path: 'dm/:dmId',
        canActivate: [registeredUserGuard],
        loadComponent: () =>
          import('./features/workspace/direct-message-view/direct-message-view').then(
            (module) => module.DirectMessageView,
          ),
      },
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/workspace/workspace-home/workspace-home').then(
            (module) => module.WorkspaceHome,
          ),
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
