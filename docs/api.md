## API

| Method                                                             | Supported platform | Description                                                    |
| ------------------------------------------------------------------ | ------------------ | -------------------------------------------------------------- |
| [setUserAttributes](../www/cordova-plugin-reteno.js)               | iOS, Android       | [Types](../types/index.ts)                                     |
| [setAnonymousUserAttributes](../www/cordova-plugin-reteno.js)      | Android            | [Types](../types/index.ts)                                     |
| [setDeviceToken](../www/cordova-plugin-reteno.js)                  | Android            | Forwards FCM token to Reteno (use when another plugin owns FCM callbacks/token, e.g. Firebasex messaging enabled). |
| [logEvent](../www/cordova-plugin-reteno.js)                        | iOS, Android       | [Types](../types/index.ts)                                     |
| [getInitialNotification](../www/cordova-plugin-reteno.js)          | iOS, Android       | Returns push notification that triggered creating app instance |
| [setOnRetenoPushReceivedListener](../www/cordova-plugin-reteno.js) | iOS, Android       | Sets listener for newly received push notification;            |
| [init](../www/cordova-plugin-reteno.js)                            | Android            | Initializes Reteno SDK. Optional options: `RetenoInitializeOptions` in [types](../types/index.ts). |
| [requestNotificationPermission](../www/cordova-plugin-reteno.js)   | Android            | Requests `POST_NOTIFICATIONS` permission (Android 13+). Returns `0|1` (`RequestNotificationPermissionResult`) in [types](../types/index.ts). |

### setUserAttributes payload example

```js
// `externalUserId` is required and must be a non-empty string.
// `user` is optional (you can omit it or pass null).
retenosdk.setUserAttributes(
	{
		externalUserId: 'user-123',
		user: {
			userAttributes: {
				email: 'john.doe@example.com',
				phone: '+1234567890',
				firstName: 'John',
				lastName: 'Doe',
				languageCode: 'en',
				timeZone: 'Europe/Kyiv',
				address: {
					region: 'Kyivska',
					town: 'Kyiv',
					address: 'Khreshchatyk St, 1',
					postcode: '01001',
				},
				fields: [{ key: 'plan', value: 'premium' }],
			},
			subscriptionKeys: ['news', 'promotions'],
			groupNamesInclude: ['beta-testers'],
			groupNamesExclude: ['unsubscribed'],
		},
	},
	() => console.log('setUserAttributes: OK'),
	(err) => console.error('setUserAttributes: ERROR', err)
);
```

### setAnonymousUserAttributes payload example

```js
// Anonymous attributes are used before contact identification.
// Note: Unlike setUserAttributes, this payload does NOT include phone/email.
retenosdk.setAnonymousUserAttributes(
	{
		firstName: 'John',
		lastName: 'Doe',
		languageCode: 'en',
		timeZone: 'Europe/Kyiv',
		address: {
			region: 'Kyivska',
			town: 'Kyiv',
			address: 'Khreshchatyk St, 1',
			postcode: '01001',
		},
		fields: [{ key: 'utm_source', value: 'google' }],
	},
	() => console.log('setAnonymousUserAttributes: OK'),
	(err) => console.error('setAnonymousUserAttributes: ERROR', err)
);
```

### logEvent payload example

Payload type: `LogEventPayload` in [types](../types/index.ts).

```js
retenosdk.logEvent(
	{
		eventName: 'purchase',
		// Optional ISO 8601 string. If omitted, Android uses current time (API 26+).
		date: new Date().toISOString(),
		parameters: [
			{ name: 'orderId', value: 'A-123' },
			{ name: 'amount', value: '19.99' },
		],
	},
	() => console.log('logEvent: OK'),
	(err) => console.error('logEvent: ERROR', err)
);
```

### setDeviceToken example

If you obtain the FCM token on the JS side (for example via another plugin/SDK), you can forward it to Reteno so it can register the device for push.

Note: if Reteno receives FCM callbacks directly on Android, you generally don't need to call `setDeviceToken`.

```js
// 1) Initialize Reteno first.
retenosdk.init(
	() => {
		// Forward token from your token source (replace this with your integration).
		getFcmTokenFromSomewhere(
			(token) => {
				if (token) retenosdk.setDeviceToken(token);
			},
			(err) => console.error('getFcmTokenFromSomewhere: ERROR', err)
		);
	},
	(err) => console.error('retenosdk.init: ERROR', err)
);
```

### setOnRetenoPushReceivedListener example

Subscribe to push received events while the app is running.

Notes:
- On Android this is based on Reteno SDK notification events (`com.reteno.Receiver.PushReceived`).
- This listener is not a replacement for `getInitialNotification()` (cold start): if the app was launched by tapping a notification, use `getInitialNotification()`.

```js
retenosdk.setOnRetenoPushReceivedListener(function (event) {
	// `event` contains the payload fields from intent extras.
	// The exact keys depend on what Reteno/FCM delivered.
	console.log('reteno-push-received:', event);
});
```
