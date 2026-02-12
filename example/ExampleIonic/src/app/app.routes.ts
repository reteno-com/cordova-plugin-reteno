import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'main',
    loadComponent: () => import('./main/main.page').then((m) => m.MainPage),
    data: { retenoScreen: 'Home' },
  },
  {
    path: 'event',
    loadComponent: () => import('./event/event.page').then((m) => m.EventPage),
    data: { retenoScreen: 'Log event' },
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    data: { retenoScreen: 'User data' },
  },
  {
    path: 'lifecycle',
    loadComponent: () => import('./lifecycle/lifecycle.page').then((m) => m.LifecyclePage),
    data: { retenoScreen: 'App lifecycle events' },
  },
  {
    path: 'notifications',
    loadComponent: () => import('./notifications/notifications.page').then((m) => m.NotificationsPage),
    data: { retenoScreen: 'Notifications' },
  },
  {
    path: 'app-inbox',
    loadComponent: () => import('./app-inbox/app-inbox.page').then((m) => m.AppInboxPage),
    data: { retenoScreen: 'App inbox' },
  },
  {
    path: 'in-app',
    loadComponent: () => import('./in-app/in-app.page').then((m) => m.InAppPage),
    data: { retenoScreen: 'In-App messages' },
  },
  {
    path: 'recommendations',
    loadComponent: () => import('./recommendations/recommendations.page').then((m) => m.RecommendationsPage),
    data: { retenoScreen: 'Recommendations' },
  },
  {
    path: 'ecommerce-events',
    loadComponent: () => import('./ecommerce-events/ecommerce-events.page').then((m) => m.EcommerceEventsPage),
    data: { retenoScreen: 'Ecommerce events' },
  },
  {
    path: '',
    redirectTo: 'main',
    pathMatch: 'full',
  },
];
