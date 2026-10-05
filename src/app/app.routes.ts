import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { channelAccessGuard } from './core/guards/channel-access.guard';
import { directMessageGuard } from './core/guards/direct-message.guard';
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
    path: 'imprint',
    loadComponent: () =>
      import('./features/legal/imprint/imprint').then((module) => module.Imprint),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/legal/privacy/privacy').then((module) => module.Privacy),
  },
  {
    path: 'workspace',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/workspace/workspace').then((module) => module.Workspace),
    children: [
      {
        path: 'channel/:channelId',
        canActivate: [channelAccessGuard],
        loadComponent: () =>
          import('./features/workspace/channel-view/channel-view').then(
            (module) => module.ChannelView,
          ),
      },
      {
        path: 'new-message',
        canActivate: [registeredUserGuard],
        loadComponent: () =>
          import('./features/workspace/new-message-view/new-message-view').then(
            (module) => module.NewMessageView,
          ),
      },
      {
        path: 'dm/:dmId',
        canActivate: [registeredUserGuard, directMessageGuard],
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
  {
    path: 'splash',
    loadComponent: () =>
      import('./features/auth/splash/splash').then((module) => module.Splash),
  },
  { path: '', pathMatch: 'full', redirectTo: 'splash' },
  { path: '**', redirectTo: 'login' },
];
