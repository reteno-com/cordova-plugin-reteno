# Ionic iOS SDK Setup

Official guide: https://docs.reteno.com/reference/ios

## Minimum SDK Requirements

- iOS 15.0+
- Xcode 15.0+
- Swift 5.7+

## Install plugin and wrapper

```sh
ionic cordova plugin add cordova-plugin-reteno --variable RETENO_ACCESS_KEY=YOUR_KEY
npm install awesome-cordova-plugins-reteno @awesome-cordova-plugins/core
```

For Ionic projects that use an older `@awesome-cordova-plugins/core` major (v5/v6/v7/v8), install the matching wrapper major — see the compatibility matrix in [Setup overview](./README.md#2-install-wrapper-awesome-cordova-plugins-reteno).

In `config.xml` add:

```xml
<preference name="deployment-target" value="15.0" />
<preference name="RETENO_ACCESS_KEY" value="YOUR_RETENO_ACCESS_KEY" />
```

`RETENO_ACCESS_KEY` is the preferred name. The deprecated `SDK_ACCESS_KEY` preference remains supported for backward compatibility.

## Add Notification Service Extension (NSE)

1. `File > New > Target...` -> `Notification Service Extension`
2. Name: `NotificationServiceExtension`
3. Do not activate scheme.

<p align="center">
  <img src="https://raw.githubusercontent.com/reteno-com/reteno-mobile-documentation/main/Ionic/SetupGuide/Resources/create_notification_service_extension.png" width="50%"/>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/reteno-com/reteno-mobile-documentation/main/Ionic/SetupGuide/Resources/choose_options_for_extension.png" width="50%"/>
</p>

4. Ensure extension deployment target equals main app target.

<p align="center">
  <img src="https://raw.githubusercontent.com/reteno-com/reteno-mobile-documentation/main/Ionic/SetupGuide/Resources/configure_target.png" width="50%"/>
</p>

5. Replace `NotificationService.swift`:

```swift
import UserNotifications
import Reteno

class NotificationService: RetenoNotificationServiceExtension {}
```

## Add App Groups

Enable App Groups in main target and `NotificationServiceExtension`.
Group format:

`group.{bundle_id}.reteno-local-storage`

<p align="center">
  <img src="https://raw.githubusercontent.com/reteno-com/reteno-mobile-documentation/main/Ionic/SetupGuide/Resources/add_group_main_target.png" width="50%"/>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/reteno-com/reteno-mobile-documentation/main/Ionic/SetupGuide/Resources/app_groups_capability.png" width="50%"/>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/reteno-com/reteno-mobile-documentation/main/Ionic/SetupGuide/Resources/add_group_in_extension.png" width="50%"/>
</p>

## Podfile for extension targets

Main target pod is injected by plugin automatically.
For extension targets add in `platforms/ios/Podfile`:

```ruby
target 'App' do
  target 'NotificationServiceExtension' do
    inherit! :search_paths
    pod 'Reteno', '2.7.3'
  end

  target 'NotificationContentExtension' do
    inherit! :search_paths
    pod 'Reteno', '2.7.3'
  end
end
```

## Optional: Notification Content Extension (Images Carousel)

Required for rich push with an **Images Carousel**. Provides the `UNNotificationContentExtension` entry point that renders the custom carousel UI.

Official guide: https://docs.reteno.com/reference/ios-images-carousel

### Create the extension target

In Xcode: **File → New → Target → Notification Content Extension**. Name it `NotificationContentExtension`.

### Replace extension files

1. **Delete** the generated `MainInterface.storyboard` — it is not used with `RetenoCarouselNotificationViewController`.
2. Replace `NotificationViewController.swift`:

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

### Embed App Extensions — Copy only when installing

> **This step must be done manually in Xcode.**

In Xcode: **Main target → Build Phases → Embed App Extensions**. For **both** `NotificationServiceExtension` and `NotificationContentExtension` ensure **"Copy only when installing"** is **unchecked**.

If this checkbox is left on, the extensions will not be embedded during Debug builds and carousel images will not appear.

## Capacitor setup (iOS)

Capacitor uses Cordova plugins through a compatibility layer, but does not execute Cordova plugin hooks. Some automatic Cordova steps must be done manually.

### 1. Install plugin and sync

```sh
npm install cordova-plugin-reteno
npx cap sync ios
```

Install the Ionic wrapper from npm:

```sh
npm install awesome-cordova-plugins-reteno @awesome-cordova-plugins/core
```

### 2. Configure preferences in `capacitor.config.ts`

```ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ...
  cordova: {
    preferences: {
      RETENO_ACCESS_KEY: 'YOUR_RETENO_ACCESS_KEY',
      IOS_DEVICE_TOKEN_HANDLING_MODE: 'manual', // default
    },
  },
};

export default config;
```

Run:

```sh
npx cap sync ios
```

### 3. Podfile path and extension pods

In Capacitor projects Podfile is `ios/App/Podfile` (not `platforms/ios/Podfile`).

For extension targets (`NotificationServiceExtension`, `NotificationContentExtension`), add pods manually inside main target block:

```ruby
target 'App' do
  # ... existing pods ...

  target 'NotificationServiceExtension' do
    inherit! :search_paths
    pod 'Reteno', '2.7.3'
  end

  target 'NotificationContentExtension' do
    inherit! :search_paths
    pod 'Reteno', '2.7.3'
  end
end
```

Then run:

```sh
cd ios/App && pod install
```

### 4. Xcode setup

Open `ios/App/App.xcworkspace` and complete the same iOS setup steps:

- Add NSE target.
- Add NCE target (if using carousel).
- Enable App Groups for app + extensions.
- Uncheck `Copy only when installing` for app extensions.

### 5. Firebase setup (if using FCM)

1. Add `GoogleService-Info.plist` to the main app target in Xcode.
2. Add `pod 'FirebaseMessaging'` to `ios/App/Podfile` in main target.
3. Run `cd ios/App && pod install`.

No AppDelegate changes are required for standard flow.

### 6. Initialize and request permission

```ts
await this.reteno.init();
await this.reteno.requestNotificationPermission();
```

## Initialize SDK

Call `this.reteno.init(...)` after `Platform.ready()`. See [Setup overview](./README.md#initialize-the-sdk).

## Request Notification Permission

```ts
await this.reteno.requestNotificationPermission();
```

## Provide Device Token

```ts
await this.reteno.setDeviceToken(token);
```

## Using FCM (Firebase Cloud Messaging) on iOS

### 1. `FirebaseMessaging` pod

Cordova flow: plugin includes `FirebaseMessaging` pod automatically via `plugin.xml`.
Capacitor flow: verify `pod 'FirebaseMessaging'` exists in `ios/App/Podfile`; if missing, add it manually.

### 2. Add `GoogleService-Info.plist`

Download `GoogleService-Info.plist` from the [Firebase Console](https://console.firebase.google.com/) and add it to your **iOS app target** in Xcode:

- Cordova: open `platforms/ios/<AppName>.xcworkspace`.
- Capacitor: open `ios/App/App.xcworkspace`.
- Drag `GoogleService-Info.plist` into the project navigator under the main app target.
- Make sure **"Copy items if needed"** is checked and the file is added to the **main app target** (not only extension targets).

If your app calls `FirebaseApp.configure()` without this file, Firebase will crash at runtime. The plugin avoids auto-configuring Firebase when the file is missing and logs a warning in manual mode.

### 3. Configure AppDelegate

Nothing to do. Firebase iOS SDK uses **method swizzling** by default — it automatically intercepts `didRegisterForRemoteNotificationsWithDeviceToken` and forwards the APNS token to Firebase without any AppDelegate code.

### 4. `IOS_DEVICE_TOKEN_HANDLING_MODE` defaults to `manual`

`IOS_DEVICE_TOKEN_HANDLING_MODE` defaults to `manual`, so no extra config is required for the Firebase flow in most cases.

If you previously overrode it to `automatic`, switch it back to `manual` to use FCM token forwarding.
Only set `automatic` when you intentionally want APNS-only token handling by the native Reteno SDK.

Supported modes:

- `manual` (default)
- `automatic`

Any value other than `automatic` is treated as `manual`.
Mode is read during `init()` and cannot be changed at runtime from JS.

Change mode in `config.xml`:

```xml
<preference name="IOS_DEVICE_TOKEN_HANDLING_MODE" value="automatic" />
```

After changes run `ionic cordova prepare ios` and rebuild.

For Capacitor apps, set this value in `capacitor.config.ts` under `cordova.preferences` and run `npx cap sync ios`.

When `IOS_DEVICE_TOKEN_HANDLING_MODE` is `manual` **and** Firebase is configured (either already configured by the app or auto-configured because `GoogleService-Info.plist` is present), the plugin automatically:

1. Subscribes to Firebase Messaging delegate token updates — every future FCM token rotation is forwarded to Reteno immediately.
2. Tries to forward the already-cached FCM token on warm starts.

## In-app status/pause

Usage examples are documented in:

- [InAppMessages/README.md](../InAppMessages/README.md)

## Screen tracking note

In Ionic/Cordova apps use manual tracking:

```ts
await this.reteno.logScreenView('ScreenName');
```

Automatic native screen tracking is usually not meaningful in WebView-based apps.

## Custom Notification Behavior (iOS)

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

## Deeplinks in push payloads

For hybrid routing use your app deeplink layer (custom scheme / Universal Links / provider).
