import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'main',
    loadComponent: () => import('./main/main.page').then((m) => m.MainPage),
  },
  {
    path: 'event',
    loadComponent: () => import('./event/event.page').then((m) => m.EventPage),
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'lifecycle',
    loadComponent: () => import('./lifecycle/lifecycle.page').then((m) => m.LifecyclePage),
  },
  {
    path: 'notifications',
    loadComponent: () => import('./notifications/notifications.page').then((m) => m.NotificationsPage),
  },
  {
    path: 'app-inbox',
    loadComponent: () => import('./app-inbox/app-inbox.page').then((m) => m.AppInboxPage),
  },
  {
    path: 'in-app',
    loadComponent: () => import('./in-app/in-app.page').then((m) => m.InAppPage),
  },
  {
    path: '',
    redirectTo: 'main',
    pathMatch: 'full',
  },
];
