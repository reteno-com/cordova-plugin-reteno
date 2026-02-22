## API

Notes:

- Recommended: call `retenosdk.init(...)` once on app startup before calling SDK-dependent methods like `logEvent`, `setUserAttributes`, `setAnonymousUserAttributes`, or `setDeviceToken`.
- As a convenience, the JS wrapper will auto-call init when you call those methods, but explicit init gives you clearer error handling and predictable timing.
- All methods that call native code return a `Promise`. Optional `success` / `error` callbacks are still supported for backward compatibility.

| Method                                                             | Supported platform | Description                                                                                                                                       |
| ------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [setUserAttributes](../www/cordova-plugin-reteno.js)               | iOS, Android       | [Types](../types/index.ts)                                                                                                                        |
| [setAnonymousUserAttributes](../www/cordova-plugin-reteno.js)      | Android            | [Types](../types/index.ts)                                                                                                                        |
| [setMultiAccountUserAttributes](../www/cordova-plugin-reteno.js)   | Android            | [Types](../types/index.ts)                                                                                                                        |
| [setLifecycleTrackingOptions](../www/cordova-plugin-reteno.js)     | Android            | [Types](../types/index.ts)                                                                                                                        |
| [setDeviceToken](../www/cordova-plugin-reteno.js)                  | Android            | Forwards FCM token to Reteno (use when another plugin owns FCM callbacks/token, e.g. Firebasex messaging enabled).                                |
| [logEvent](../www/cordova-plugin-reteno.js)                        | iOS, Android       | [Types](../types/index.ts)                                                                                                                        |
| [logScreenView](../www/cordova-plugin-reteno.js)                   | Android            | Logs a screen view for manual tracking.                                                                                                           |
| [forcePushData](../www/cordova-plugin-reteno.js)                   | Android            | Forces Reteno to sync push data for the current device.                                                                                           |
| [pauseInAppMessages](../www/cordova-plugin-reteno.js)             | Android            | Pauses or resumes in-app messages at runtime. Pass `true` to pause, `false` to resume.                                                            |
| [setInAppMessagesPauseBehaviour](../www/cordova-plugin-reteno.js) | Android            | Sets how paused in-app messages are handled: `SKIP_IN_APPS` or `POSTPONE_IN_APPS`. [Types](../types/index.ts)                                     |
| [getInitialNotification](../www/cordova-plugin-reteno.js)          | iOS, Android       | Returns push notification that triggered creating app instance                                                                                    |
| [setOnRetenoPushReceivedListener](../www/cordova-plugin-reteno.js) | iOS, Android       | Sets listener for newly received push notification.                                                                                               |
| [removeOnRetenoPushReceivedListener](../www/cordova-plugin-reteno.js) | iOS, Android       | Removes listener for push notification received events.                                                                                           |
| [setOnRetenoNotificationClickedListener](../www/cordova-plugin-reteno.js) | iOS, Android       | Sets listener for notification click events.                                                                                                      |
| [removeOnRetenoNotificationClickedListener](../www/cordova-plugin-reteno.js) | iOS, Android       | Removes listener for notification click events.                                                                                                   |
| [setOnRetenoPushDismissedListener](../www/cordova-plugin-reteno.js) | Android (2.9.0+)   | Sets listener for push dismissed (swipe) events.                                                                                                   |
| [removeOnRetenoPushDismissedListener](../www/cordova-plugin-reteno.js) | Android (2.9.0+)   | Removes listener for push dismissed (swipe) events.                                                                                                 |
| [setOnRetenoCustomPushReceivedListener](../www/cordova-plugin-reteno.js) | Android (2.9.0+)   | Sets listener for custom push received events.                                                                                                     |
| [removeOnRetenoCustomPushReceivedListener](../www/cordova-plugin-reteno.js) | Android (2.9.0+)   | Removes listener for custom push received events.                                                                                                   |
| [setOnInAppMessageCustomDataReceivedListener](../www/cordova-plugin-reteno.js) | Android            | Sets listener for in-app message custom data events.                                                                                              |
| [removeOnInAppMessageCustomDataReceivedListener](../www/cordova-plugin-reteno.js) | Android            | Removes listener for in-app message custom data events.                                                                                            |
| [setOnInAppLifecycleCallback](../www/cordova-plugin-reteno.js)    | Android            | Subscribes to in-app message lifecycle events (beforeDisplay, onDisplay, beforeClose, afterClose, onError). Pass `null` to unsubscribe. [Types](../types/index.ts) |
| [init](../www/cordova-plugin-reteno.js)                            | Android            | Initializes Reteno SDK. Accepts optional `RetenoInitializeOptions` with `pauseInAppMessages`, `lifecycleTrackingOptions` and `pausePushInAppMessages`. [Types](../types/index.ts) |
| [requestNotificationPermission](../www/cordova-plugin-reteno.js)   | Android            | Requests `POST_NOTIFICATIONS` permission (Android 13+). Returns `0` or `1` (`RequestNotificationPermissionResult`) in [types](../types/index.ts). |
| [updateDefaultNotificationChannel](../www/cordova-plugin-reteno.js) | Android            | Updates the default notification channel name and description for existing users. [Types](../types/index.ts)                                      |
| [getAppInboxMessages](../www/cordova-plugin-reteno.js)             | Android            | Fetches App Inbox messages with pagination. [Types](../types/index.ts)                                                                             |
| [getAppInboxMessagesCount](../www/cordova-plugin-reteno.js)        | Android            | Fetches count of App Inbox messages.                                                                                                               |
| [subscribeOnMessagesCountChanged](../www/cordova-plugin-reteno.js) | Android            | Subscribes to App Inbox messages count changes.                                                                                                    |
| [unsubscribeMessagesCountChanged](../www/cordova-plugin-reteno.js)  | Android            | Unsubscribes from App Inbox messages count changes.                                                                                                 |
| [markAsOpened](../www/cordova-plugin-reteno.js)                    | Android            | Marks an App Inbox message as opened.                                                                                                              |
| [markAllMessagesAsOpened](../www/cordova-plugin-reteno.js)         | Android            | Marks all App Inbox messages as opened.                                                                                                             |
| [getRecommendations](../www/cordova-plugin-reteno.js)             | Android            | Fetches product or category recommendations. [Types](../types/index.ts)                                                                            |
| [logRecommendations](../www/cordova-plugin-reteno.js)             | Android            | Sends recommendation impressions or clicks. [Types](../types/index.ts)                                                                             |

### init example

Initialize the Reteno SDK with optional configuration. Payload type: `RetenoInitializeOptions` in [types](../types/index.ts).

```js
// Initialize with default options (in-app messages enabled).
retenosdk.init()
  .then(() => console.log('init: OK'))
  .catch((err) => console.error('init: ERROR', err));
```

```js
// Initialize with in-app messages paused and lifecycle tracking configured.
// pauseInAppMessages: pauses all in-app messages until resumed.
// pausePushInAppMessages: pauses in-app messages triggered by push notifications.
// lifecycleTrackingOptions: configures lifecycle event tracking ('ALL', 'NONE', or an object).
retenosdk.init({
  pauseInAppMessages: true,
  pausePushInAppMessages: false,
  lifecycleTrackingOptions: {
    appLifecycleEnabled: true,
    pushSubscriptionEnabled: true,
    sessionEventsEnabled: false,
  },
})
  .then(() => console.log('init: OK'))
  .catch((err) => console.error('init: ERROR', err));
```

```js
// Shorthand lifecycle tracking values:
retenosdk.init({ lifecycleTrackingOptions: 'ALL' });
retenosdk.init({ lifecycleTrackingOptions: 'NONE' });
```

### setUserAttributes payload example

```js
// `externalUserId` is required and must be a non-empty string.
// `user` is optional (you can omit it or pass null).
retenosdk.setUserAttributes(
  {
    externalUserId: 'user-123',
    user: {
      userAttributes: {
        email: 'john.doe@example.com',
        phone: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
        languageCode: 'en',
        timeZone: 'Europe/Kyiv',
        address: {
          region: 'Kyivska',
          town: 'Kyiv',
          address: 'Khreshchatyk St, 1',
          postcode: '01001',
        },
        fields: [{ key: 'plan', value: 'premium' }],
      },
      subscriptionKeys: ['news', 'promotions'],
      groupNamesInclude: ['beta-testers'],
      groupNamesExclude: ['unsubscribed'],
    },
  }
)
  .then(() => console.log('setUserAttributes: OK'))
  .catch((err) => console.error('setUserAttributes: ERROR', err));
```

### setAnonymousUserAttributes payload example

```js
// Anonymous attributes are used before contact identification.
// Note: Unlike setUserAttributes, this payload does NOT include phone/email.
retenosdk.setAnonymousUserAttributes(
  {
    firstName: 'John',
    lastName: 'Doe',
    languageCode: 'en',
    timeZone: 'Europe/Kyiv',
    address: {
      region: 'Kyivska',
      town: 'Kyiv',
      address: 'Khreshchatyk St, 1',
      postcode: '01001',
    },
    fields: [{ key: 'utm_source', value: 'google' }],
  }
)
  .then(() => console.log('setAnonymousUserAttributes: OK'))
  .catch((err) => console.error('setAnonymousUserAttributes: ERROR', err));
```

### setMultiAccountUserAttributes payload example

```js
// Since 2.8.0 it is possible to share push notification token between user accounts.
// If it is required to receive push notifications on accounts that aren't currently logged in,
// but they share the same device, always use setMultiAccountUserAttributes instead of setUserAttributes.
// If you want to switch back to default behavior, just replace usages of
// setMultiAccountUserAttributes to setUserAttributes. This will roll back to
// 1 token per device behavior.
// `externalUserId` is required and must be a non-empty string.
// `user` is required and must be an object.
retenosdk.setMultiAccountUserAttributes(
  {
    externalUserId: 'user-123',
    user: {
      userAttributes: {
        email: 'john.doe@example.com',
        phone: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
        languageCode: 'en',
        timeZone: 'Europe/Kyiv',
        address: {
          region: 'Kyivska',
          town: 'Kyiv',
          address: 'Khreshchatyk St, 1',
          postcode: '01001',
        },
        fields: [{ key: 'plan', value: 'premium' }],
      },
      subscriptionKeys: ['news', 'promotions'],
      groupNamesInclude: ['beta-testers'],
      groupNamesExclude: ['unsubscribed'],
    },
  }
)
  .then(() => console.log('setMultiAccountUserAttributes: OK'))
  .catch((err) => console.error('setMultiAccountUserAttributes: ERROR', err));
```

### setLifecycleTrackingOptions example

```js
// Enable/disable specific lifecycle tracking features.
// Unspecified fields default to true.
retenosdk.setLifecycleTrackingOptions(
  {
    sessionEventsEnabled: true,
  }
)
  .then(() => console.log('setLifecycleTrackingOptions: OK'))
  .catch((err) => console.error('setLifecycleTrackingOptions: ERROR', err));
```

```js
// Convenience values:
retenosdk.setLifecycleTrackingOptions('ALL');
retenosdk.setLifecycleTrackingOptions('NONE');
```

### logEvent payload example

Payload type: `LogEventPayload` in [types](../types/index.ts).

```js
retenosdk.logEvent(
  {
    eventName: 'purchase',
    // Optional ISO 8601 string. If omitted, Android uses current time (API 26+).
    date: new Date().toISOString(),
    parameters: [
      { name: 'orderId', value: 'A-123' },
      { name: 'amount', value: '19.99' },
    ],
  }
)
  .then(() => console.log('logEvent: OK'))
  .catch((err) => console.error('logEvent: ERROR', err));
```

### logScreenView example

```js
retenosdk.logScreenView(
  'HomeScreen'
)
  .then(() => console.log('logScreenView: OK'))
  .catch((err) => console.error('logScreenView: ERROR', err));
```

### forcePushData example

```js
retenosdk
  .forcePushData()
  .then(() => console.log('forcePushData: OK'))
  .catch((err) => console.error('forcePushData: ERROR', err));
```

### pauseInAppMessages example

Pause or resume in-app messages at runtime.

```js
// Pause in-app messages
retenosdk.pauseInAppMessages(true)
  .then(() => console.log('pauseInAppMessages: paused'))
  .catch((err) => console.error('pauseInAppMessages: ERROR', err));

// Resume in-app messages
retenosdk.pauseInAppMessages(false)
  .then(() => console.log('pauseInAppMessages: resumed'))
  .catch((err) => console.error('pauseInAppMessages: ERROR', err));
```

### setInAppMessagesPauseBehaviour example

Configure how paused in-app messages are handled (requires Reteno SDK v2.0.3+). Type: `InAppPauseBehaviour` in [types](../types/index.ts).

```js
// Discard messages received while paused
retenosdk.setInAppMessagesPauseBehaviour('SKIP_IN_APPS')
  .then(() => console.log('setInAppMessagesPauseBehaviour: OK'))
  .catch((err) => console.error('setInAppMessagesPauseBehaviour: ERROR', err));

// Save the first queued message and display it when unpaused
retenosdk.setInAppMessagesPauseBehaviour('POSTPONE_IN_APPS')
  .then(() => console.log('setInAppMessagesPauseBehaviour: OK'))
  .catch((err) => console.error('setInAppMessagesPauseBehaviour: ERROR', err));
```

### setOnInAppLifecycleCallback example

Subscribe to in-app message lifecycle events. The listener receives events with `event` (lifecycle stage) and `data` (context-specific payload). Types: `InAppLifecyclePayload`, `InAppData`, `InAppCloseData`, `InAppErrorData` in [types](../types/index.ts).

```js
function onInAppLifecycle(event) {
  var detail = event.detail || event;
  console.log('In-app lifecycle:', detail.event, detail.data);
  // detail.event is one of: 'beforeDisplay', 'onDisplay', 'beforeClose', 'afterClose', 'onError'
  // detail.data contains: { id } for display events,
  //   { id, closeAction } for close events, { id, errorMessage } for error events
}

retenosdk.setOnInAppLifecycleCallback(onInAppLifecycle);

// Later, to unsubscribe:
retenosdk.setOnInAppLifecycleCallback(null);
```

### setDeviceToken example

If you obtain the FCM token on the JS side (for example via another plugin/SDK), you can forward it to Reteno so it can register the device for push.

Note: if Reteno receives FCM callbacks directly on Android, you generally don't need to call `setDeviceToken`.

```js
// 1) Initialize Reteno first.
retenosdk
  .init()
  .then(() => {
    // Forward token from your token source (replace this with your integration).
    getFcmTokenFromSomewhere(
      (token) => {
        if (token) retenosdk.setDeviceToken(token);
      },
      (err) => console.error('getFcmTokenFromSomewhere: ERROR', err)
    );
  })
  .catch((err) => console.error('retenosdk.init: ERROR', err));
```

### setOnRetenoPushReceivedListener example

Subscribe to push received events while the app is running.

Notes:

- On Android this is based on Reteno SDK notification events (`com.reteno.Receiver.PushReceived`).
- This listener is not a replacement for `getInitialNotification()` (cold start): if the app was launched by tapping a notification, use `getInitialNotification()`.

### setOnInAppMessageCustomDataReceivedListener example

Subscribe to in-app message custom data events when a button is clicked.

Important: once you register this receiver, Reteno SDK will not open button links automatically. Instead, it will pass all custom data to your listener, including the link under the `url` key. You are responsible for handling navigation.

```js
retenosdk.setOnInAppMessageCustomDataReceivedListener(function (event) {
  // event.detail contains the custom data payload
  // If a link was assigned to the button, it will be under event.detail.url
  console.log('In-app custom data:', event.detail);
});
```

```js
// Subscribe to push received events
function onPushReceived(event) {
  // `event` contains the payload fields from intent extras.
  // The exact keys depend on what Reteno/FCM delivered.
  console.log('reteno-push-received:', event);
}

retenosdk.setOnRetenoPushReceivedListener(onPushReceived);

// Later, to unsubscribe:
retenosdk.removeOnRetenoPushReceivedListener(onPushReceived);
```

### setOnRetenoNotificationClickedListener example

Subscribe to notification click events while the app is running.

```js
// Subscribe to notification click events
function onNotificationClicked(event) {
  console.log('reteno-notification-clicked:', event);
}

retenosdk.setOnRetenoNotificationClickedListener(onNotificationClicked);

// Later, to unsubscribe:
retenosdk.removeOnRetenoNotificationClickedListener(onNotificationClicked);
```

### updateDefaultNotificationChannel example

Updates the default notification channel parameters for existing users on Android devices. This is useful when you need to change how notifications appear to users who already have the app installed.

Payload type: `NotificationChannelConfig` in [types](../types/index.ts).

```js
retenosdk.updateDefaultNotificationChannel(
  {
    name: 'New Channel Name',
    description: 'New Channel Description',
  }
)
  .then(() => console.log('updateDefaultNotificationChannel: OK'))
  .catch((err) => console.error('updateDefaultNotificationChannel: ERROR', err));
```

### getAppInboxMessages example

Fetches paginated App Inbox messages. Payload type: `GetAppInboxMessagesPayload` in [types](../types/index.ts).

```js
retenosdk.getAppInboxMessages(
  {
    page: 1,
    pageSize: 20,
    status: 'UNOPENED',
  }
)
  .then((result) => console.log('getAppInboxMessages: OK', result))
  .catch((err) => console.error('getAppInboxMessages: ERROR', err));
```

### getAppInboxMessagesCount example

Fetches count of App Inbox messages.

```js
retenosdk.getAppInboxMessagesCount()
  .then((count) => console.log('getAppInboxMessagesCount: OK', count))
  .catch((err) => console.error('getAppInboxMessagesCount: ERROR', err));
```

### subscribeOnMessagesCountChanged example

Subscribes to App Inbox messages count changes.

```js
function onInboxCountChanged(count) {
  console.log('App Inbox count changed:', count);
}

retenosdk.subscribeOnMessagesCountChanged(onInboxCountChanged, (err) => {
  console.error('subscribeOnMessagesCountChanged: ERROR', err);
});
```

### unsubscribeMessagesCountChanged example

Unsubscribes from App Inbox messages count changes.

```js
retenosdk.unsubscribeMessagesCountChanged()
  .then(() => console.log('unsubscribeMessagesCountChanged: OK'))
  .catch((err) => console.error('unsubscribeMessagesCountChanged: ERROR', err));
```

### markAsOpened example

Marks an App Inbox message as opened.

```js
retenosdk.markAsOpened('message-id')
  .then(() => console.log('markAsOpened: OK'))
  .catch((err) => console.error('markAsOpened: ERROR', err));
```

### markAllMessagesAsOpened example

Marks all App Inbox messages as opened.

```js
retenosdk.markAllMessagesAsOpened()
  .then(() => console.log('markAllMessagesAsOpened: OK'))
  .catch((err) => console.error('markAllMessagesAsOpened: ERROR', err));
```

### getRecommendations example

Fetches recommendations. Payload type: `GetRecommendationsPayload` in [types](../types/index.ts).

```js
// Product-based recommendations.
retenosdk.getRecommendations(
  {
    recomVariantId: 'variant-id',
    productIds: ['product-1', 'product-2'],
    fields: ['name', 'price', 'image', 'link'],
  }
)
  .then((result) => console.log('getRecommendations: OK', result))
  .catch((err) => console.error('getRecommendations: ERROR', err));
```

```js
// Category-based recommendations.
retenosdk.getRecommendations(
  {
    recomVariantId: 'variant-id',
    categoryId: 'category-1',
    fields: ['name', 'price'],
  }
)
  .then((result) => console.log('getRecommendations: OK', result))
  .catch((err) => console.error('getRecommendations: ERROR', err));
```

### logRecommendations example

Sends recommendation events. Payload type: `LogRecommendationsPayload` in [types](../types/index.ts).

```js
retenosdk.logRecommendations(
  {
    recomVariantId: 'variant-id',
    recomEvents: [
      {
        recomEventType: 'IMPRESSIONS',
        occurred: new Date().toISOString(),
        productId: 'product-1',
      },
      {
        recomEventType: 'CLICKS',
        occurred: new Date().toISOString(),
        productId: 'product-2',
      },
    ],
  }
)
  .then(() => console.log('logRecommendations: OK'))
  .catch((err) => console.error('logRecommendations: ERROR', err));
```
