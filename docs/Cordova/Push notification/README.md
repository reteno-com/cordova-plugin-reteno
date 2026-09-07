# Push notification

## Request notification permission

```js
RetenoPlugin.requestNotificationPermission()
  .then((result) => {
    // Android: 1 granted / 0 declined
    console.log('Permission result:', result);
  })
  .catch((err) => console.error(err));
```

## Get initial notification

When app starts from push tap, get payload with `getInitialNotification()`:

```js
RetenoPlugin.getInitialNotification()
  .then((data) => console.log('getInitialNotification', data))
  .catch((err) => console.error('getInitialNotification: ERROR', err));
```

## Listen for received push while app is active

```js
function onPushReceived(event) {
  console.log('reteno-push-received:', event);
}

RetenoPlugin.setOnRetenoPushReceivedListener(onPushReceived);

// later
RetenoPlugin.removeOnRetenoPushReceivedListener(onPushReceived);
```

## Listen for push click events

```js
function onNotificationClicked(event) {
  console.log('reteno-notification-clicked:', event);
}

RetenoPlugin.setOnRetenoNotificationClickedListener(onNotificationClicked);

// later
RetenoPlugin.removeOnRetenoNotificationClickedListener(onNotificationClicked);
```

## Android-only listeners

```js
function onDismissed(payload) {
  console.log('Push dismissed', payload);
}

function onCustomReceived(payload) {
  console.log('Custom push received', payload);
}

RetenoPlugin.setOnRetenoPushDismissedListener(onDismissed);
RetenoPlugin.setOnRetenoCustomPushReceivedListener(onCustomReceived);

// later
RetenoPlugin.removeOnRetenoPushDismissedListener(onDismissed);
RetenoPlugin.removeOnRetenoCustomPushReceivedListener(onCustomReceived);
```

## iOS foreground/tap handlers (optional)

These methods are **iOS-only**. On Android they are not implemented and calls will fail.

```js
await RetenoPlugin.setWillPresentNotificationOptions({
  options: ['badge', 'sound', 'banner'],
  emitEvent: true,
});

await RetenoPlugin.setDidReceiveNotificationResponseHandler({
  enabled: true,
  emitEvent: true,
});
```

If `emitEvent: true`, plugin emits JS events:

- `reteno-push-received`
- `reteno-notification-clicked`

## Pass token manually (if another plugin gets it)

```js
await RetenoPlugin.setDeviceToken(token);
```

Use this when token callbacks are handled outside `cordova-plugin-reteno`.

## Android default notification channel update

```js
RetenoPlugin.updateDefaultNotificationChannel({
  name: 'New Channel Name',
  description: 'New Channel Description',
})
  .then(() => console.log('updateDefaultNotificationChannel: OK'))
  .catch((err) => console.error('updateDefaultNotificationChannel: ERROR', err));
```

## Android notification grouping

Groups Android notifications by a value from the push payload or by a constant group ID. The rule is persisted natively and restored when the Android process starts, so it also applies to a push handled before the WebView is active.

```js
// Group notifications by the `chatId` field in the push payload.
await RetenoPlugin.setNotificationGroupingRule({ payloadKey: 'chatId', showSummary: true });

// Or assign every Reteno notification to one constant group.
await RetenoPlugin.setNotificationGroupingRule({ groupId: 'messages', showSummary: true });

// Disable grouping.
await RetenoPlugin.setNotificationGroupingRule(null);
```

`showSummary` is optional and defaults to `false`. When enabled, the plugin creates and maintains an Android group-summary notification for the group ("You have N new notifications") once at least two notifications share it, and removes the summary once fewer than two remain. Without `showSummary`, grouping only sets the group key on each notification — no collapsed summary row appears unless the app posts its own summary notification.
