# Android

### Getting started with Reteno Plugin for Android

## Installation

> Requirement: `cordova-android >= 12.0.0`. Older Cordova Android platforms will refuse to install the plugin.

1. Install plugin from the project root:

```sh
cordova plugin add cordova-plugin-reteno --variable RETENO_ACCESS_KEY=YOUR_KEY
```

### Configure via config.xml (Cordova)

If you prefer to keep the access key in your Cordova app config (instead of passing `--variable` during installation), configure plugin variables in `config.xml`:

```xml
<widget ...>
  <plugin name="cordova-plugin-reteno" spec="cordova-plugin-reteno">
    <variable name="RETENO_ACCESS_KEY" value="YOUR_KEY" />
  </plugin>
</widget>
```

Notes:

- Access-key precedence: `RETENO_ACCESS_KEY` -> deprecated `SDK_ACCESS_KEY` -> AndroidManifest meta-data injected by the plugin. New integrations should use `RETENO_ACCESS_KEY`.
- If you changed plugin variables, usually you need reinstall/re-add:
  - `cordova plugin rm cordova-plugin-reteno && cordova plugin add ...`
  - or `cordova platform rm android && cordova platform add android`

2. Reteno Android dependency is added automatically by the plugin Gradle hook.

3. Android 13+ (`targetSdkVersion >= 33`) requires runtime permission for notifications.
The plugin injects `POST_NOTIFICATIONS` into manifest, but you still must request it in runtime:

```js
RetenoPlugin
  .requestNotificationPermission()
  .then((grantedInt) => {
    // 1 - granted, 0 - declined
  })
  .catch((err) => {
    console.error(err);
  });
```

4. Initialize SDK once on app startup.

   For the full `init(...)` reference (options, platform matrix, `deviceready` wrapper) see [Initialize the SDK](./README.md#initialize-the-sdk).

   > **Note**: in Cordova apps the UI runs inside a single WebView, so native automatic screen tracking is usually not meaningful. For screen analytics use `RetenoPlugin.logScreenView('ScreenName')` manually.

5. Set up Firebase Cloud Messaging (FCM):

- Download `google-services.json` from Firebase console.
- Place it to your Cordova project root or `resources/android/`.

![](https://raw.githubusercontent.com/reteno-com/reteno-mobile-documentation/main/Cordova/SetupGuide/Resources/google-services-json.png)

- Copy your Firebase key and finish Reteno panel setup.

![](https://raw.githubusercontent.com/reteno-com/reteno-mobile-documentation/main/Cordova/SetupGuide/Resources/FirebaseConsole.png)

![](https://raw.githubusercontent.com/reteno-com/reteno-mobile-documentation/main/Cordova/SetupGuide/Resources/CloudConsole1.png)

![](https://raw.githubusercontent.com/reteno-com/reteno-mobile-documentation/main/Cordova/SetupGuide/Resources/CloudConsole2.png)

Follow official guides:

- [Setting up Firebase for FCM](https://docs.reteno.com/reference/setting-up-your-firebase-application-for-firebase-cloud-messaging)
- [Connect your mobile app in Reteno](https://docs.reteno.com/docs/connect-your-mobile-app)

## Push notification listeners

The plugin provides listener-based API for Android push events.

- `setOnRetenoPushDismissedListener(listener)` for dismissed (swiped) pushes.
- `setOnRetenoCustomPushReceivedListener(listener)` for custom push payloads.

```js
const onDismissed = (payload) => {
  console.log('Push dismissed', payload);
};

const onCustomReceived = (payload) => {
  console.log('Custom push received', payload);
};

RetenoPlugin.setOnRetenoPushDismissedListener(onDismissed);
RetenoPlugin.setOnRetenoCustomPushReceivedListener(onCustomReceived);

// later:
RetenoPlugin.removeOnRetenoPushDismissedListener(onDismissed);
RetenoPlugin.removeOnRetenoCustomPushReceivedListener(onCustomReceived);
```

### Without Firebasex (Cordova)

If you do not need `cordova-plugin-firebasex` features, you can still use Reteno Push on Android.
For FCM to work, your Cordova Android project must have:

1. `google-services.json` from Firebase Console.
2. Google Services Gradle plugin (`com.google.gms.google-services`) applied.

How to verify:

- `platforms/android/app/google-services.json` exists.
- `platforms/android/app/build.gradle` contains `com.google.gms.google-services`.
- Build logs do not contain `google-services.json not found`.

### Warning: Reteno + Firebasex (Android)

If your app also uses `cordova-plugin-firebasex`, be aware that Firebasex may register its own `FirebaseMessagingService`.
On Android, only one service receives `com.google.firebase.MESSAGING_EVENT`, so Firebasex can prevent Reteno callbacks.

Recommendation: do not install Firebasex only for push delivery if Reteno handles push in your app.

## Custom FCM service (optional)

Most Cordova apps do not need a custom `FirebaseMessagingService`.
If you add one for your own native logic, extend `RetenoFirebaseMessagingService` (not `FirebaseMessagingService`) and call `super` methods.

Official references:

- https://docs.reteno.com/reference/android-sdk-setup
- https://docs.reteno.com/reference/android-push-handling

## Deeplinks in push payloads

Reteno push notifications can include deeplinks. In Cordova apps, routing to a specific WebView route usually requires an app-level deeplink solution (custom URL scheme, App Links, or a provider such as Branch).

In practice, Reteno delivers the link in payload, but opening the exact destination screen should be handled by your app deeplink layer.
