# Cordova Plugin Setup

### The Reteno Cordova Plugin for Mobile Customer Engagement and Analytics solutions

## Overview

`Reteno` is a plugin for Cordova that helps mobile teams integrate Reteno into their mobile apps.

##### The plugin supports:

- Cordova 10.2 or later
- iOS 15.0 or later
- Android with `cordova-android >= 12.0.0`

## Getting started with Reteno Plugin / Setup guide

- [iOS](./IOS.md)
- [Android](./Android.md)

## Initialize the SDK

`RetenoPlugin.init(...)` must be called **after Cordova's native bridge is ready**. Call it from the `deviceready` listener.

### Cordova (vanilla JS)

```js
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
  RetenoPlugin.init({
    isDebugMode: false,
    pauseInAppMessages: false,
    pausePushInAppMessages: false,                // Android only
    inAppMessagesPauseBehaviour: 'POSTPONE_IN_APPS', // iOS only: 'SKIP_IN_APPS' | 'POSTPONE_IN_APPS'
    isAutomaticScreenReportingEnabled: false,     // iOS only
    lifecycleTrackingOptions: {                   // or 'ALL' / 'NONE'
      appLifecycleEnabled: true,
      foregroundLifecycleEnabled: false,
      pushSubscriptionEnabled: true,
      sessionStartEventsEnabled: true,
      sessionEndEventsEnabled: true,
    },
    sessionDurationSeconds: 30 * 60,              // Android 2.9.4+, iOS 2.7.0+
  })
    .then(() => console.log('Reteno initialized'))
    .catch((err) => console.error('init: ERROR', err));
}
```

### Options reference

All fields are optional.

| Option | Type | iOS | Android | Notes |
|---|---|:---:|:---:|---|
| `accessKey` | `string` | ✅ | ✅ | Overrides `RETENO_ACCESS_KEY` (or legacy `SDK_ACCESS_KEY`) from `config.xml`. Usually not needed — see "Access key" below. |
| `isDebugMode` | `boolean` | ✅ | ✅ | Enables near real-time event monitoring. Use only on test devices. |
| `pauseInAppMessages` | `boolean` | ✅ | ✅ | Start the SDK with in-app messages paused. |
| `pausePushInAppMessages` | `boolean` | — | ✅ | Android-only. Safe to pass on iOS (ignored). |
| `inAppMessagesPauseBehaviour` | `'SKIP_IN_APPS' \| 'POSTPONE_IN_APPS'` | ✅ | — | iOS-only via `init()`. On Android use [`setInAppMessagesPauseBehaviour`](../InAppMessages/README.md) at runtime. |
| `isAutomaticScreenReportingEnabled` | `boolean` | ✅ | — | iOS-only. Not recommended in Cordova — use `logScreenView()` manually. |
| `lifecycleTrackingOptions` | `object \| 'ALL' \| 'NONE'` | ✅ | ✅ | See [App Lifecycle Events](../AppLifeCycleEvents/README.md). iOS: only via `init()`. |
| `sessionDurationSeconds` | `number` | ✅ | ✅ | Optional session reset duration (Android 2.9.4+, iOS 2.7.0+). |

### Access key

Recommended: set `RETENO_ACCESS_KEY` in `config.xml` (or via `cordova plugin add --variable RETENO_ACCESS_KEY=...`). The plugin reads it automatically — **no need to pass `accessKey` in JS**. The deprecated `SDK_ACCESS_KEY` name remains supported for backward compatibility.

Only pass `accessKey` in `init()` when you need to override the value from `config.xml` at runtime.

### Calling `init()` multiple times

`init()` is idempotent — the plugin caches the first successful initialization and subsequent calls resolve immediately without re-initializing the native SDK. Options passed to later calls are ignored.

## Feature guides

- [Tracking user information](../Tracking%20user%20information/README.md)
- [Tracking user behaviour](../Tracking%20user%20behaviour/README.md)
- [Push notification](../Push%20notification/README.md)
- [In app messages](../InAppMessages/README.md)
- [Ecommerce](../Ecommerce/README.md)
- [Recommendations](../Recommendations/README.md)
- [App inbox](../AppInbox/README.md)
- [Action Buttons](../Action%20Buttons/README.md)
- [App Lifecycle Events](../AppLifeCycleEvents/README.md)

##### Licence

Reteno Cordova Plugin is released under the MIT license. See [LICENSE](https://github.com/reteno-com/reteno-cordova/blob/main/LICENSE) for details.
