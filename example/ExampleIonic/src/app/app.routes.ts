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
    path: '',
    redirectTo: 'main',
    pathMatch: 'full',
  },
];
