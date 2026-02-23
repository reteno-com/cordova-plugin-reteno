## iOS Setup (app-side steps)

This section lists everything that must be done in the **app project** that consumes this plugin.

Official guide: https://docs.reteno.com/reference/ios
User behaviour reference: https://docs.reteno.com/reference/ios-user-behaviour
User information reference: https://docs.reteno.com/reference/ios-user-information

## Minimum SDK Requirements

- iOS: 14.0+
- Xcode: 15.0+
- Swift: 5.7+

## 1) Add the plugin and configure preferences

In `config.xml` add/verify:

```xml
<!-- Reteno SDK access key (required) -->
<preference name="SDK_ACCESS_KEY" value="YOUR_RETENO_ACCESS_KEY" />

<!-- Optional: iOS Reteno SDK version override -->
<preference name="IOS_RETENO_FCM_VERSION" value="2.6.1" />
```

The plugin reads `SDK_ACCESS_KEY` during initialization.

## 2) Add Notification Service Extension (NSE)

NSE is required for rich push (images, attachments) and correct push payload handling.

1. In Xcode, add a new target: `Notification Service Extension`.
2. Replace `NotificationService.swift` with:

```swift
import UserNotifications
import Reteno

class NotificationService: RetenoNotificationServiceExtension {}
```

## 3) App Groups

Enable App Groups for the main target and the NSE target.

Group name format:

```
group.{bundle_id}.reteno-local-storage
```

Example:

```
group.com.example.app.reteno-local-storage
```

## 4) Podfile for the NSE target

The plugin wires `Reteno` pod into the **main** iOS target automatically.
For the NSE target you must add the pod manually in `platforms/ios/Podfile`:

```ruby
target 'NotificationServiceExtension' do
  pod 'Reteno', '2.6.1'
end
```

If you override `IOS_RETENO_FCM_VERSION` in `config.xml`, keep this Podfile version in sync.

## 5) Initialize the SDK in JS

Call initialization once on app startup:

```js
await retenosdk.init();
```

`SDK_ACCESS_KEY` is taken from `config.xml`. You can also pass it explicitly:

```js
await retenosdk.init({ accessKey: 'YOUR_RETENO_ACCESS_KEY' });
```

## 6) Set Up a Notification Permission Request

iOS requires an explicit permission prompt before the app can receive push notifications.
Call the plugin helper when it makes sense in your UX flow (usually after a user action):

```js
await retenosdk.requestNotificationPermission();
```

## 7) Provide Device Tokens to the SDK

If another SDK/plugin obtains the device token (APNs/FCM), pass it to Reteno so it can register the device:

```js
await retenosdk.setDeviceToken(token);
```

If your app retrieves tokens natively, here are the two common options and how they map to the plugin:

- FCM (Firebase Messaging): get `fcmToken` in `MessagingDelegate`, then forward it to JS and call `retenosdk.setDeviceToken(fcmToken)`.
- APNs: get `deviceToken` in `didRegisterForRemoteNotificationsWithDeviceToken`, convert to hex string, then forward it to JS and call `retenosdk.setDeviceToken(tokenString)`.

## 8) Add Custom Behavior for Notifications (optional)

If you need custom behavior without editing native AppDelegate, the plugin provides optional helpers.
Configure them **after** SDK initialization.

Set presentation options for foreground notifications:

```js
await retenosdk.setWillPresentNotificationOptions({
  options: ['badge', 'sound', 'banner'],
  emitEvent: true
});
```

If `emitEvent` is `true`, the plugin will emit `reteno-push-received` with the notification payload.

Enable a response handler for notification taps:

```js
await retenosdk.setDidReceiveNotificationResponseHandler({
  enabled: true,
  emitEvent: true
});
```

If `emitEvent` is `true`, the plugin will emit `reteno-notification-clicked` with the payload.

## 9) User Information and User Behaviour methods

The plugin supports the main iOS methods described in Reteno docs:

- `setUserAttributes(...)`
- `setAnonymousUserAttributes(...)` (without `phone`/`email`)
- `setMultiAccountUserAttributes(...)`
- `logEvent(...)`
- `logScreenView(...)`
- `forcePushData(...)`

Lifecycle tracking note for iOS:

- iOS lifecycle tracking is configured during SDK initialization (`retenosdk.init({ lifecycleTrackingOptions: ... })`).
- Calling `setLifecycleTrackingOptions(...)` after initialization is not supported on iOS.
