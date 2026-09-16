# Ionic SDK Setup

### Reteno for Ionic (Cordova)

## Overview

`Reteno` for Ionic uses the `cordova-plugin-reteno` plugin with the Ionic Native wrapper package `awesome-cordova-plugins-reteno`.

##### Supported stack

- Ionic app with Cordova runtime
- iOS 15.0+
- Android with `cordova-android >= 12.0.0`

`cordova-plugin-reteno@2.2.1` includes Reteno Android SDK 2.10.2 and Reteno iOS SDK 2.7.4.

## Install plugin and wrapper

### 1. Install Cordova plugin

```sh
ionic cordova plugin add cordova-plugin-reteno --variable RETENO_ACCESS_KEY=YOUR_KEY
```

### 2. Install wrapper (`awesome-cordova-plugins-reteno`)

Pick the wrapper major version that matches your installed `@awesome-cordova-plugins/core`
(the core package tracks Ionic ecosystem majors). The core runtime API is consistent across
v5–v9. Newer wrapper releases may add TypeScript declarations for fields supported by the
Cordova plugin. For example, `awesome-cordova-plugins-reteno@9.2.0` adds the `marketId`
declaration.

| Wrapper version | `@awesome-cordova-plugins/core` | Install |
|---|---|---|
| `awesome-cordova-plugins-reteno@5` | `^5.45.0` | `npm install awesome-cordova-plugins-reteno@5 @awesome-cordova-plugins/core@5` |
| `awesome-cordova-plugins-reteno@6` | `^6.16.0` | `npm install awesome-cordova-plugins-reteno@6 @awesome-cordova-plugins/core@6` |
| `awesome-cordova-plugins-reteno@7` | `^7.0.1` | `npm install awesome-cordova-plugins-reteno@7 @awesome-cordova-plugins/core@7` |
| `awesome-cordova-plugins-reteno@8` | `^8.1.0` | `npm install awesome-cordova-plugins-reteno@8 @awesome-cordova-plugins/core@8` |
| `awesome-cordova-plugins-reteno@9` | `^9.1.2` | `npm install awesome-cordova-plugins-reteno@9 @awesome-cordova-plugins/core@9` |

If you already have `@awesome-cordova-plugins/core` installed, keep that major and install the matching wrapper:

```sh
# Example: core already at v8 — install wrapper v8
npm install awesome-cordova-plugins-reteno@8
```

Fresh install of latest:

```sh
npm install awesome-cordova-plugins-reteno @awesome-cordova-plugins/core
```

### 3. Register provider

```ts
import { AwesomeCordovaPluginReteno } from 'awesome-cordova-plugins-reteno';

@NgModule({
  providers: [AwesomeCordovaPluginReteno],
})
export class AppModule {}
```

## Initialize the SDK

Call `init(...)` after `Platform.ready()`:

```ts
import { Platform } from '@ionic/angular';
import { AwesomeCordovaPluginReteno } from 'awesome-cordova-plugins-reteno';

constructor(
  private platform: Platform,
  private reteno: AwesomeCordovaPluginReteno,
) {
  this.platform.ready().then(async () => {
    await this.reteno.init({
      isDebugMode: false,
      pauseInAppMessages: false,
      pausePushInAppMessages: false,
      inAppMessagesPauseBehaviour: 'POSTPONE_IN_APPS',
      lifecycleTrackingOptions: {
        appLifecycleEnabled: true,
        foregroundLifecycleEnabled: false,
        pushSubscriptionEnabled: true,
        sessionStartEventsEnabled: true,
        sessionEndEventsEnabled: true,
      },
      sessionDurationSeconds: 30 * 60,
      isAutomaticScreenReportingEnabled: false, // iOS only
    });
  });
}
```

### Options reference

All fields are optional.

| Option | Type | iOS | Android | Notes |
|---|---|:---:|:---:|---|
| `accessKey` | `string` | ✅ | ✅ | Overrides `RETENO_ACCESS_KEY` (or legacy `SDK_ACCESS_KEY`) from `config.xml`. Usually not needed. |
| `isDebugMode` | `boolean` | ✅ | ✅ | Enables near real-time event monitoring for test devices. |
| `pauseInAppMessages` | `boolean` | ✅ | ✅ | Start SDK with in-app messages paused. |
| `pausePushInAppMessages` | `boolean` | — | ✅ | Android-only. Safe to pass on iOS (ignored). |
| `inAppMessagesPauseBehaviour` | `'SKIP_IN_APPS' \| 'POSTPONE_IN_APPS'` | ✅ | — | iOS-only via `init()`. On Android use runtime method in [InAppMessages](../InAppMessages/README.md). |
| `isAutomaticScreenReportingEnabled` | `boolean` | ✅ | — | iOS-only. Not recommended in hybrid WebView apps; use `logScreenView()` manually. |
| `lifecycleTrackingOptions` | `object \| 'ALL' \| 'NONE'` | ✅ | ✅ | See [App Lifecycle Events](../AppLifeCycleEvents/README.md). On iOS, set before/inside `init()`. |
| `sessionDurationSeconds` | `number` | ✅ | ✅ | Optional session reset duration (Android 2.9.4+, iOS 2.7.0+). |

### Access key

Recommended: set `RETENO_ACCESS_KEY` in `config.xml` (or via `ionic cordova plugin add --variable RETENO_ACCESS_KEY=...`). The plugin reads it automatically, so passing `accessKey` in JS is optional. The deprecated `SDK_ACCESS_KEY` name remains supported for backward compatibility.

### Calling `init()` multiple times

`init()` is idempotent: after first successful call, next calls resolve immediately without re-initializing native SDK. Options from later calls are ignored.

## TypeScript types

All payload and response types are exported from the wrapper package. Prefer them over `any` for better autocompletion and type safety:

```ts
import {
  AwesomeCordovaPluginReteno,
  RetenoInitializeOptions,
  UserAttributes,
  UserAttributesAnonymous,
  SetUserAttributesPayload,
  LogEventPayload,
  LogEcommerceEventPayload,
  NotificationPresentationOption,
  InAppLifecyclePayload,
  AppInboxMessage,
  AppInboxMessages,
  GetRecommendationsPayload,
  RecommendationsResponse,
  RetenoPushButtonClickedPayload,
} from 'awesome-cordova-plugins-reteno';
```

## Setup guides

- [iOS](./IOS.md)
- [Android](./Android.md)

Capacitor developers should use the dedicated sections inside platform setup guides:

- [Capacitor setup (iOS)](./IOS.md#capacitor-setup-ios)
- [Capacitor setup (Android)](./Android.md#capacitor-setup-android)

## Feature guides

- [Tracking user information](../Tracking%20user%20information/README.md)
- [Tracking user behaviour](../Tracking%20user%20behaviour/README.md)
- [Push notification](../Push%20notification/README.md)
- [In-app messages](../InAppMessages/README.md)
- [Ecommerce](../Ecommerce/README.md)
- [Recommendations](../Recommendations/README.md)
- [App Inbox](../AppInbox/README.md)
- [Action Buttons](../Action%20Buttons/README.md)
- [App Lifecycle Events](../AppLifeCycleEvents/README.md)

##### Licence

Reteno Cordova plugin is released under MIT. See [LICENSE](https://github.com/reteno-com/reteno-cordova/blob/main/LICENSE).
