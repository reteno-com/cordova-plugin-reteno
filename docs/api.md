## API

| Method                                                             | Supported platform | Description                                                    |
| ------------------------------------------------------------------ | ------------------ | -------------------------------------------------------------- |
| [setUserAttributes](../www/cordova-plugin-reteno.js)               | iOS, Android       | [Types](../types/index.ts)                                     |
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
