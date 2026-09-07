# App Lifecycle Events

Reteno can automatically track app lifecycle, foreground lifecycle, push subscription, and session events.

## Tracked app lifecycle events

When `appLifecycleEnabled` is enabled:

- `ApplicationInstalled`
- `ApplicationUpdated`
- `ApplicationOpened`
- `ApplicationBackgrounded`

## Tracked foreground lifecycle events

When `foregroundLifecycleEnabled` is enabled:

- `ApplicationOpened`
- `ApplicationBackgrounded`

## Tracked push subscription events

When `pushSubscriptionEnabled` is enabled:

- `PushNotificationsSubscribed`
- `PushNotificationsUnsubscribed`

## Tracked session events

When `sessionStartEventsEnabled` / `sessionEndEventsEnabled` are enabled:

- `SessionStarted`
- `SessionEnded`

## Configure lifecycle tracking

During initialization:

```ts
await this.reteno.init({
  lifecycleTrackingOptions: {
    appLifecycleEnabled: true,
    foregroundLifecycleEnabled: false,
    pushSubscriptionEnabled: true,
    sessionStartEventsEnabled: true,
    sessionEndEventsEnabled: false,
  },
});
```

Shortcuts:

```ts
await this.reteno.init({ lifecycleTrackingOptions: 'ALL' });
await this.reteno.init({ lifecycleTrackingOptions: 'NONE' });
```

Runtime update:

```ts
await this.reteno.setLifecycleTrackingOptions({
  sessionStartEventsEnabled: true,
  sessionEndEventsEnabled: true,
});
```

iOS note: runtime method `setLifecycleTrackingOptions(...)` works only before `init()`.  
Use `lifecycleTrackingOptions` in `init(...)` as the main configuration path for iOS.
Legacy note: `sessionEventsEnabled` is still supported as an alias that toggles both session start and end events.

## Screen tracking in Ionic/Cordova

Use manual tracking:

```ts
await this.reteno.logScreenView('HomeScreen');
```
