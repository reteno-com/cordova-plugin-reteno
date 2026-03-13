## Installation

> Requirement: `cordova-android >= 12.0.0`. Older Cordova Android platforms will refuse to install the plugin.

1. Run next command from root of your project:

```sh
cordova plugin add cordova-plugin-reteno --variable SDK_ACCESS_KEY=YOUR_KEY
```

### Configure via config.xml (Cordova)

If you prefer to keep the access key in your Cordova app config (instead of passing `--variable` during installation), configure it as **plugin variables** in `config.xml`:

```xml
<widget ...>
  <plugin name="cordova-plugin-reteno" spec="cordova-plugin-reteno">
    <!-- Reteno SDK access key (required) -->
    <variable name="SDK_ACCESS_KEY" value="YOUR_KEY" />
  </plugin>
</widget>
```

Notes:

- Precedence for `SDK_ACCESS_KEY` is plugin variables (from install command or `config.xml`) → AndroidManifest meta-data injected by the plugin.
- Changing plugin variables often requires reinstalling the plugin or re-adding the platform:
  - `cordova plugin rm cordova-plugin-reteno && cordova plugin add ...`
  - or `cordova platform rm android && cordova platform add android`

2. Reteno dependency is added automatically by the plugin via its Gradle hook.

3. Android 13+ (and `targetSdkVersion >= 33`) requires notification runtime permission. The plugin injects the manifest permission (`POST_NOTIFICATIONS`), but you still must request it at runtime in your app.

You can request it via the plugin API:

```js
retenosdk
  .requestNotificationPermission()
  .then((grantedInt) => {
    // grantedInt: 1 (granted) or 0 (declined)
  })
  .catch((err) => {
    console.error(err);
  });
```

4. SDK initialization

Initialize Reteno once during app startup:

```js
retenosdk
  .init()
  .then(() => {
    // initialized
  })
  .catch((err) => {
    console.error(err);
  });
```

If you need advanced Reteno configuration (custom `RetenoConfig`, custom device id provider, etc), you can initialize Reteno in your custom `Application` as described here:
[link](https://docs.reteno.com/reference/android-sdk-setup#step-4-initialize-the-reteno-sdk).

5. Set up Firebase for Cloud Messaging (create Firebase project, add `google-services.json`, etc):
   [link](https://docs.reteno.com/reference/setting-up-your-firebase-application-for-firebase-cloud-messaging).

## Push notification listeners

The plugin uses the listener-based API (`EventListener` / `Procedure`) for all push events.

- `setOnRetenoPushDismissedListener(listener)` — called when a push notification is dismissed (swiped away).
- `setOnRetenoCustomPushReceivedListener(listener)` — called when a custom push notification is received.

Each method accepts a listener that receives a payload object. Use the corresponding `remove...` method to unsubscribe:

```js
const onDismissed = (payload) => {
  console.log('Push dismissed', payload);
};

const onCustomReceived = (payload) => {
  console.log('Custom push received', payload);
};

retenosdk.setOnRetenoPushDismissedListener(onDismissed);
retenosdk.setOnRetenoCustomPushReceivedListener(onCustomReceived);

// later:
retenosdk.removeOnRetenoPushDismissedListener(onDismissed);
retenosdk.removeOnRetenoCustomPushReceivedListener(onCustomReceived);
```

### Without Firebasex (Cordova)

If you **do not need** `cordova-plugin-firebasex` features, you can still use Reteno Push on Android.
For FCM to work, your Cordova Android project must have:

1. `google-services.json` (from Firebase Console)

- Download it from Firebase Console → Project settings → Your apps (Android) → `google-services.json`.
- Put it into your Cordova project in one of these locations (the plugin will copy it into `platforms/android/app/` automatically):
  - `<projectRoot>/google-services.json`
  - `<projectRoot>/resources/android/google-services.json`
  - `<projectRoot>/resources/google-services.json`

2. Google Services Gradle plugin applied (`com.google.gms.google-services`)

The plugin automatically applies Google Services Gradle plugin during `after_platform_add` and `after_prepare`.

How to verify:

- Check that `platforms/android/app/google-services.json` exists.
- Check `platforms/android/app/build.gradle` contains `com.google.gms.google-services`.
- If your Gradle build logs contain a message like “google-services.json not found, google-services plugin not applied. Push Notifications won't work”, then the plugin is NOT applied and push won’t work.

### Ionic/Capacitor note

For Capacitor apps, see the dedicated [Capacitor setup (Android)](#capacitor-setup-android) section below.

### Warning: Reteno + Firebasex (Android)

If you use `cordova-plugin-firebasex` in the same app, be aware it can register its own `FirebaseMessagingService`.
On Android, only one service may receive `com.google.firebase.MESSAGING_EVENT`, so Firebasex can prevent Reteno from receiving `onNewToken` / `onMessageReceived` callbacks.

Recommendation: don’t install Firebasex “just for push”. Install it only if you need its other Firebase features.

### Custom FCM service (Android)

In most Cordova apps you **do not need** a custom `FirebaseMessagingService`.
Only add one if you have your **own native push handling** (or another SDK that requires a custom FCM service).

If you do add a custom service, follow Reteno guidance: extend `RetenoFirebaseMessagingService` (not `FirebaseMessagingService`) and call `super` methods.

See Reteno docs:

- https://docs.reteno.com/reference/android-sdk-setup
- https://docs.reteno.com/reference/android-push-handling

## Capacitor setup (Android)

Capacitor uses Cordova plugins through a compatibility layer, but **does not execute Cordova plugin hooks**. This means several automatic steps that work in Cordova must be done manually.

### 1. Install the plugin

```sh
npm install cordova-plugin-reteno
npx cap sync android
```

### 2. Configure `SDK_ACCESS_KEY`

In `capacitor.config.ts`, pass the access key through `cordova.preferences`:

```ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ...
  cordova: {
    preferences: {
      SDK_ACCESS_KEY: 'YOUR_KEY',
    },
  },
};

export default config;
```

The plugin's `reteno.gradle` script automatically reads this value from `capacitor.config.json` (generated by Capacitor CLI) and patches the Android manifest at build time. No manual manifest editing is required.

You can also pass the key explicitly in JS:

```js
await retenosdk.init({ accessKey: 'YOUR_KEY' });
```

### 3. Set up `google-services.json`

The Cordova hook that auto-copies `google-services.json` does **not** run in Capacitor.

Do this manually:

1. Download `google-services.json` from [Firebase Console](https://console.firebase.google.com/).
2. Copy it to `android/app/google-services.json`.
3. Run `npx cap sync android`.

### 4. Google Services Gradle plugin

In Capacitor projects, the Google Services Gradle plugin is typically already applied if you use any Firebase dependency. Verify that `android/app/build.gradle` contains:

```gradle
apply plugin: 'com.google.gms.google-services'
```

If not, add it manually or install `@capacitor-firebase/messaging` (or similar) which applies it automatically.

### 5. Initialize the SDK

```js
await retenosdk.init();
```

### 6. Request notification permission

Same as Cordova — call at the appropriate point in your UX:

```js
const granted = await retenosdk.requestNotificationPermission();
```

### Deeplinks in push payloads

Reteno push notifications on Android can include deeplinks.

In a native Android app, you can usually route those links with your own `Intent` handling, Android App Links, or custom URL schemes.

For Cordova/Ionic/Capacitor apps, deeplink routing usually requires a separate app-level solution. This plugin does not provide a full deeplink router by itself, so if you need custom navigation from push links, use a dedicated deeplink integration, for example:

- Branch.io
- a custom URL scheme plugin
- an Android App Links / Universal Links plugin

Typical setup for hybrid apps:

1. Configure your app to support the required link type (custom scheme or Android App Links).
2. Install and configure your deeplink provider/router (for example, Branch.io) in the app project.
3. Route the tapped push link into that provider/router so the app opens the correct webview route or native screen.

In practice, Reteno can deliver the link in the push payload, but opening the correct destination inside a hybrid app is still handled by your deeplink integration layer.
