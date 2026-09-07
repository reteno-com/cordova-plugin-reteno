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

Configure during initialization:

```js
RetenoPlugin.init({
  lifecycleTrackingOptions: {
    appLifecycleEnabled: true,
    foregroundLifecycleEnabled: false,
    pushSubscriptionEnabled: true,
    sessionStartEventsEnabled: true,
    sessionEndEventsEnabled: false,
  },
});
```

Or with shortcuts:

```js
RetenoPlugin.init({ lifecycleTrackingOptions: 'ALL' });
RetenoPlugin.init({ lifecycleTrackingOptions: 'NONE' });
```

You can also call:

```js
RetenoPlugin.setLifecycleTrackingOptions({
  sessionStartEventsEnabled: true,
  sessionEndEventsEnabled: true,
});
RetenoPlugin.setLifecycleTrackingOptions('ALL');
RetenoPlugin.setLifecycleTrackingOptions('NONE');
```

iOS note: `setLifecycleTrackingOptions(...)` must be called before `init()`.
Legacy note: `sessionEventsEnabled` is still supported as an alias that toggles both session start and end events.

## Screen tracking in Cordova

For Cordova apps, manual screen tracking is recommended:

```js
RetenoPlugin.logScreenView('HomeScreen');
```

Automatic native screen tracking in hybrid WebView apps does not reflect JS route changes.
