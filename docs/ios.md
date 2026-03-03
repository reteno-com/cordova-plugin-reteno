## iOS Setup (app-side steps)

This section lists everything that must be done in the **app project** that consumes this plugin.

Official guide: https://docs.reteno.com/reference/ios

## Minimum SDK Requirements

- iOS: 15.0+
- Xcode: 15.0+
- Swift: 5.7+

## 1) Add the plugin and configure preferences

In `config.xml` add/verify:

```xml
<!-- Required: Reteno iOS SDK supports iOS 15.0+ -->
<preference name="deployment-target" value="15.0" />

<!-- Reteno SDK access key (required) -->
<preference name="SDK_ACCESS_KEY" value="YOUR_RETENO_ACCESS_KEY" />

<!-- Optional: iOS Reteno SDK version override -->
<preference name="IOS_RETENO_FCM_VERSION" value="2.6.1" />
```

The plugin reads `SDK_ACCESS_KEY` during initialization.

If `pod install` fails with "required a higher minimum deployment target", raise your iOS deployment target to `15.0` or higher and run install again.

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

### Deeplinks in push payloads

Reteno push notifications on iOS can include a link. By default, the native Reteno iOS SDK opens that link via the system URL opener.

In a fully native iOS app, you can override this behavior with `Reteno.addLinkHandler(...)` and route links yourself:
https://docs.reteno.com/reference/ios-links-handler

For Cordova/Ionic/Capacitor apps, deeplink routing usually requires a separate app-level solution. This plugin does not expose `Reteno.addLinkHandler(...)` directly to JavaScript, so if you need custom routing for push links, use a dedicated deeplink/universal link integration in your hybrid app, for example:

- Branch.io
- a custom URL scheme plugin
- a Universal Links / App Links plugin

Typical setup for hybrid apps:

1. Configure your app to support the required link type (custom URL scheme or Universal Links / Associated Domains).
2. Install and configure your deeplink provider/router (for example, Branch.io) in the app project.
3. Route the tapped push link into that provider/router instead of relying only on the default native open behavior.

If you use Universal Links on iOS, you must also configure the Apple-side association for your domain. In practice, Reteno can deliver the link in the push payload, but opening the correct screen inside a hybrid app is still handled by your deeplink integration layer.

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

Screen view tracking note for iOS:

- **Automatic** — pass `isAutomaticScreenReportingEnabled: true` to `retenosdk.init(...)`. The native SDK will track screen transitions automatically. Defaults to `false`.
- **Manual** — call `retenosdk.logScreenView(screenName)` on each navigation event. This works on both iOS and Android regardless of `isAutomaticScreenReportingEnabled`.
