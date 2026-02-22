## Installation

> Requirement: `cordova-android >= 12.0.0`. Older Cordova Android platforms will refuse to install the plugin.

1. Run next command from root of your project:

```sh
cordova plugin add cordova-plugin-reteno --variable SDK_ACCESS_KEY=YOUR_KEY
```

Optional: enable Reteno Android Debug Mode (Reteno SDK 2.7.0+):

```sh
cordova plugin add cordova-plugin-reteno --variable SDK_ACCESS_KEY=YOUR_KEY --variable RETENO_DEBUG_MODE=true
```

### Configure via config.xml (Cordova)

If you prefer to keep the access key in your Cordova app config (instead of passing `--variable` during installation), configure it as **plugin variables** in `config.xml`:

```xml
<widget ...>
  <plugin name="cordova-plugin-reteno" spec="cordova-plugin-reteno">
    <!-- Reteno SDK access key (required) -->
    <variable name="SDK_ACCESS_KEY" value="YOUR_KEY" />

    <!-- Optional: enable Reteno debug mode on Android -->
    <variable name="RETENO_DEBUG_MODE" value="true" />

    <!-- Optional: Reteno Android SDK (FCM) version override -->
    <variable name="ANDROID_RETENO_FCM_VERSION" value="2.9.0" />
  </plugin>
</widget>
```

Notes:

- Precedence for `SDK_ACCESS_KEY` is plugin variables (from install command or `config.xml`) → AndroidManifest meta-data injected by the plugin.
- Changing plugin variables often requires reinstalling the plugin or re-adding the platform:
  - `cordova plugin rm cordova-plugin-reteno && cordova plugin add ...`
  - or `cordova platform rm android && cordova platform add android`

Notes:

- Debug mode is intended for test devices/developer accounts.
```

2. Reteno dependency is added automatically by the plugin via its Gradle hook.

   If you need a different Reteno SDK version, you can override it:
   - During plugin installation:

     ```sh
     cordova plugin add cordova-plugin-reteno --variable ANDROID_RETENO_FCM_VERSION=2.9.0
     ```

   - Or from your Android project (for example in `platforms/android/build.gradle`):

   ```groovy
   // Example: always take the latest 2.x (dynamic versions can reduce reproducibility)
   ext.retenoFcmVersion = '2.+'
   // or pin an exact version:
   // ext.retenoFcmVersion = '2.8.9'
   ```

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

## Push notification listeners (SDK 2.9.0+)

The Android SDK 2.9.0 introduces new listener-based callbacks for push events:

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

Capacitor does not execute Cordova plugin hooks. That means the automatic copy
of `google-services.json` into `android/app/` will **not** run.

Do this manually for Ionic/Capacitor apps:

1. Keep `google-services.json` in the project root.
2. Copy it to `android/app/google-services.json`.
3. Run `npx cap sync android`.

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

### Deeplinks in push payloads

Reteno push notifications can include deeplinks. To handle them in a Cordova/Ionic app,
install a deeplink plugin (for example, one that supports custom URL schemes or Android App Links)
and wire it to open the link from the push payload.
