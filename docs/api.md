## API

| Method                                                             | Supported platform | Description                                                    |
| ------------------------------------------------------------------ | ------------------ | -------------------------------------------------------------- |
| [setUserAttributes](../www/cordova-plugin-reteno.js)               | iOS, Android       | [Types](../types/index.ts)                                     |
| [logEvent](../www/cordova-plugin-reteno.js)                        | iOS, Android       | [Types](../types/index.ts)                                     |
| [getInitialNotification](../www/cordova-plugin-reteno.js)          | iOS, Android       | Returns push notification that triggered creating app instance |
| [setOnRetenoPushReceivedListener](../www/cordova-plugin-reteno.js) | iOS, Android       | Sets listener for newly received push notification;            |
| [init](../www/cordova-plugin-reteno.js)                            | Android            | Initializes Reteno SDK. Optional options: `RetenoInitializeOptions` in [types](../types/index.ts). |
| [requestNotificationPermission](../www/cordova-plugin-reteno.js)   | Android            | Requests `POST_NOTIFICATIONS` permission (Android 13+). Returns `0|1` (`RequestNotificationPermissionResult`) in [types](../types/index.ts). |
