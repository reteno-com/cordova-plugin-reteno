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
| [getInitialNotification](../www/cordova-plugin-reteno.js)          | iOS, Android       | Returns push notification that triggered creating app instance                                                                                    |
| [setOnRetenoPushReceivedListener](../www/cordova-plugin-reteno.js) | iOS, Android       | Sets listener for newly received push notification;                                                                                               |
| [init](../www/cordova-plugin-reteno.js)                            | Android            | Initializes Reteno SDK.                                                                                                                           |
| [requestNotificationPermission](../www/cordova-plugin-reteno.js)   | Android            | Requests `POST_NOTIFICATIONS` permission (Android 13+). Returns `0` or `1` (`RequestNotificationPermissionResult`) in [types](../types/index.ts). |
| [updateDefaultNotificationChannel](../www/cordova-plugin-reteno.js) | Android            | Updates the default notification channel name and description for existing users. [Types](../types/index.ts)                                      |

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

```js
retenosdk.setOnRetenoPushReceivedListener(function (event) {
  // `event` contains the payload fields from intent extras.
  // The exact keys depend on what Reteno/FCM delivered.
  console.log('reteno-push-received:', event);
});
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
