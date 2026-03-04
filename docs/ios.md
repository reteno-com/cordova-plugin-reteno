## iOS Setup (app-side steps)

This section lists everything that must be done in the **app project** that consumes this plugin.

Official guide: https://docs.reteno.com/reference/ios

## Minimum SDK Requirements

- iOS: 15.0+
- Xcode: 15.0+
- Swift: 5.7+

## Add the plugin and configure preferences

In `config.xml` add/verify:

```xml
<!-- Required: Reteno iOS SDK supports iOS 15.0+ -->
<preference name="deployment-target" value="15.0" />

<!-- Reteno SDK access key (required) -->
<preference name="SDK_ACCESS_KEY" value="YOUR_RETENO_ACCESS_KEY" />
```

The plugin reads `SDK_ACCESS_KEY` during initialization.

If `pod install` fails with "required a higher minimum deployment target", raise your iOS deployment target to `15.0` or higher and run install again.

## Add Notification Service Extension (NSE)

NSE is required for rich push (images, attachments) and correct push payload handling.

1. In Xcode, add a new target: `Notification Service Extension`.
2. Replace `NotificationService.swift` with:

```swift
import UserNotifications
import Reteno

class NotificationService: RetenoNotificationServiceExtension {}
```

## App Groups

Enable App Groups for the main target and the NSE target.

Group name format:

```
group.{bundle_id}.reteno-local-storage
```

Example:

```
group.com.example.app.reteno-local-storage
```

## Podfile for extension targets

The plugin wires `Reteno` pod into the **main** iOS target automatically.
For extension targets you must add the pod manually in `platforms/ios/Podfile`.
Both extension targets must be **nested inside** the main app target block:

```ruby
target 'App' do
  # ... existing pods ...

  target 'NotificationServiceExtension' do
    inherit! :search_paths
    pod 'Reteno', '2.6.1'
  end

  target 'NotificationContentExtension' do
    inherit! :search_paths
    pod 'Reteno', '2.6.1'
  end
end
```


## Add Notification Content Extension (NCE) — Images Carousel

The Notification Content Extension is required for rich push notifications with an **Images Carousel**.
It provides the `UNNotificationContentExtension` entry point that renders a custom carousel UI.

Official guide: https://docs.reteno.com/reference/ios-images-carousel

### Create the extension target *(manual Xcode step)*

In Xcode: **File → New → Target → Notification Content Extension**. Name it `NotificationContentExtension`.

See the official guide for screenshots: https://docs.reteno.com/reference/ios-images-carousel

### Replace extension files

1. **Delete** the generated `MainInterface.storyboard` (it is not used with `RetenoCarouselNotificationViewController`).
2. Replace the contents of `NotificationViewController.swift` with:

```swift
import Reteno

final class NotificationViewController: RetenoCarouselNotificationViewController {}
```

### Update `Info.plist` of the NCE

Open `NotificationContentExtension/Info.plist` as source code and replace the `NSExtension` dict with:

```xml
<key>NSExtension</key>
<dict>
    <key>NSExtensionAttributes</key>
    <dict>
        <key>UNNotificationExtensionCategory</key>
        <string>ImageCarousel</string>
        <key>UNNotificationExtensionInitialContentSizeRatio</key>
        <real>0.5</real>
        <key>UNNotificationExtensionUserInteractionEnabled</key>
        <true/>
    </dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.usernotifications.content-extension</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).NotificationViewController</string>
</dict>
```

### Deployment target

Make sure the NCE **Deployment Target** in Xcode matches the main app target (iOS 15.0+). A mismatch is the most common reason carousel images fail to display.

### Embed App Extensions — Copy only when installing *(manual Xcode step)*

> **This step must be done manually in Xcode** — it cannot be automated.
> Official guide (Troubleshooting → "Turn off Copy Only when Installing"): https://docs.reteno.com/reference/ios-images-carousel

In Xcode: **Main target → Build Phases → Embed App Extensions**. For **both** `NotificationServiceExtension` and `NotificationContentExtension` ensure **"Copy only when installing"** is **unchecked**.

If this checkbox is left on, the extensions will not be embedded during Debug builds and carousel images will not appear.

## Initialize the SDK in JS

Call initialization once on app startup:

```js
await retenosdk.init();
```

**Cordova**: `SDK_ACCESS_KEY` is read from `config.xml` automatically. You can also pass it explicitly:

```js
await retenosdk.init({ accessKey: 'YOUR_RETENO_ACCESS_KEY' });
```

**Capacitor**: Cordova plugin preferences are configured in `capacitor.config.ts` under `cordova.preferences`:

```ts
const config: CapacitorConfig = {
  // ...
  cordova: {
    preferences: {
      SDK_ACCESS_KEY: 'YOUR_RETENO_ACCESS_KEY',
    },
  },
};
```

Or pass the key explicitly in JS:

```js
await retenosdk.init({ accessKey: 'YOUR_RETENO_ACCESS_KEY' });
```

## Request Notification Permission

iOS requires an explicit permission prompt before the app can receive push notifications.
Call the plugin helper when it makes sense in your UX flow (usually after a user action):

```js
await retenosdk.requestNotificationPermission();
```

## Provide Device Tokens to the SDK

If another SDK/plugin obtains the device token (APNs/FCM), pass it to Reteno so it can register the device:

```js
await retenosdk.setDeviceToken(token);
```

If your app retrieves tokens natively, here are the two common options and how they map to the plugin:

- FCM (Firebase Messaging): get `fcmToken` in `MessagingDelegate`, then forward it to JS and call `retenosdk.setDeviceToken(fcmToken)`.
- APNs: get `deviceToken` in `didRegisterForRemoteNotificationsWithDeviceToken`, convert to hex string, then forward it to JS and call `retenosdk.setDeviceToken(tokenString)`.

## Custom Notification Behavior (optional)

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

## User Information and User Behaviour methods

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

