# Push notification

## Request notification permission

```ts
const granted = await this.reteno.requestNotificationPermission();
console.log('Permission result:', granted);
```

## Get initial notification

```ts
const initial = await this.reteno.getInitialNotification();
console.log('Initial push payload:', initial);
```

## Listen for received push

```ts
const onPushReceived = (event: any) => {
  console.log('reteno-push-received', event);
};

this.reteno.setOnRetenoPushReceivedListener(onPushReceived);

// later
this.reteno.removeOnRetenoPushReceivedListener(onPushReceived);
```

## Listen for notification click

```ts
const onClicked = (event: any) => {
  console.log('reteno-notification-clicked', event);
};

this.reteno.setOnRetenoNotificationClickedListener(onClicked);

// later
this.reteno.removeOnRetenoNotificationClickedListener(onClicked);
```

## Android-only listeners

```ts
const onDismissed = (payload: any) => console.log('Push dismissed', payload);
const onCustomReceived = (payload: any) => console.log('Custom push received', payload);

this.reteno.setOnRetenoPushDismissedListener(onDismissed);
this.reteno.setOnRetenoCustomPushReceivedListener(onCustomReceived);

// later
this.reteno.removeOnRetenoPushDismissedListener(onDismissed);
this.reteno.removeOnRetenoCustomPushReceivedListener(onCustomReceived);
```

## iOS foreground/tap handlers (optional)

These methods are iOS-only. On Android they are not implemented and calls return an error (`Promise` reject / `error` callback).

```ts
await this.reteno.setWillPresentNotificationOptions({
  options: ['badge', 'sound', 'banner'],
  emitEvent: true,
});

await this.reteno.setDidReceiveNotificationResponseHandler({
  enabled: true,
  emitEvent: true,
});
```

`options` accepts any combination of `NotificationPresentationOption` values: `'badge' | 'sound' | 'alert' | 'banner' | 'list'`.

Shorthand forms accepted by `setWillPresentNotificationOptions`:

```ts
// Pass only the options array
await this.reteno.setWillPresentNotificationOptions(['badge', 'sound', 'banner']);

// Clear previously set options
await this.reteno.setWillPresentNotificationOptions(null);
```

`setDidReceiveNotificationResponseHandler` also accepts `boolean | null` to disable or clear the handler:

```ts
await this.reteno.setDidReceiveNotificationResponseHandler(false);
```

If `emitEvent: true`, plugin emits JS events:

- `reteno-push-received`
- `reteno-notification-clicked`

## Pass token manually

```ts
await this.reteno.setDeviceToken(token);
```

Use this when token callbacks are handled outside `cordova-plugin-reteno` (for example, by another plugin/SDK that owns APNs/FCM token delivery).

## Android default channel update

```ts
await this.reteno.updateDefaultNotificationChannel({
  name: 'New Channel Name',
  description: 'New Channel Description',
});
```

## Android notification grouping

Groups Android notifications by a value from the push payload or by a constant group ID. The rule is persisted natively and restored when the Android process starts, so it also applies to a push handled before the WebView is active.

```ts
// Group notifications by the `chatId` field in the push payload.
await this.reteno.setNotificationGroupingRule({ payloadKey: 'chatId', showSummary: true });

// Or assign every Reteno notification to one constant group.
await this.reteno.setNotificationGroupingRule({ groupId: 'messages', showSummary: true });

// Disable grouping.
await this.reteno.setNotificationGroupingRule(null);
```

`showSummary` is optional and defaults to `false`. When enabled, the plugin creates and maintains an Android group-summary notification for the group ("You have N new notifications") once at least two notifications share it, and removes the summary once fewer than two remain. Without `showSummary`, grouping only sets the group key on each notification — no collapsed summary row appears unless the app posts its own summary notification.
