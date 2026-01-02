## Installation

1. Run next command from root of your project:

```sh
cordova plugin add cordova-plugin-reteno --variable SDK_ACCESS_KEY=YOUR_KEY
```

2. Also you may need to increase `minSdkVersion` in project level `build.gradle` to `26`, since `Reteno` uses this version as minimal;

## Setting up SDK

1. Follow `Step 1` described in Android SDK setup guide: [link](https://docs.reteno.com/reference/android-sdk-setup#step-1-make-sure-to-enable-androidx-in-your-gradleproperties-file);

2. Reteno dependency is added automatically by the plugin via its Gradle hook.

   If you need a different Reteno SDK version, you can override it:
   - During plugin installation:

     ```sh
     cordova plugin add cordova-plugin-reteno --variable ANDROID_RETENO_FCM_VERSION=2.8.9
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
retenosdk.requestNotificationPermission(
  function (grantedInt) {
    // grantedInt: 1 (granted) or 0 (declined)
  },
  function (err) {
    console.error(err);
  }
);
```

4. SDK initialization

Initialize Reteno once during app startup:

```js
retenosdk.init(
  function () {
    // initialized
  },
  function (err) {
    console.error(err);
  }
);
```

Optional initialization options:

```js
retenosdk.init(
  {
    pauseInAppMessages: false,
    pausePushInAppMessages: false,
    lifecycleTrackingOptions: 'ALL',
  },
  function () {},
  function (err) {
    console.error(err);
  }
);
```

If you need advanced Reteno configuration (custom `RetenoConfig`, custom device id provider, etc), you can initialize Reteno in your custom `Application` as described here:
[link](https://docs.reteno.com/reference/android-sdk-setup#step-4-initialize-the-reteno-sdk).

5. Set up Firebase for Cloud Messaging (create Firebase project, add `google-services.json`, etc):
   [link](https://docs.reteno.com/reference/setting-up-your-firebase-application-for-firebase-cloud-messaging).

6. Install Firebase Plugin:

```sh
cordova plugin add cordova-plugin-firebasex
```

and follow instructions [link](https://www.npmjs.com/package/cordova-plugin-firebasex?activeTab=readme) how to use it from application;
