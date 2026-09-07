# Tracking user information

## Set user attributes (identified user)

Use `setUserAttributes` with required `externalUserId`:

```js
RetenoPlugin.setUserAttributes({
  externalUserId: 'USER_ID',
  user: {
    userAttributes: {
      email: 'john.doe@example.com',
      phone: '+1234567890',
      firstName: 'John',
      lastName: 'Doe',
      languageCode: 'en',
      timeZone: 'Europe/Kyiv',
      marketId: 'market_1',
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
})
  .then(() => console.log('setUserAttributes: OK'))
  .catch((err) => console.error('setUserAttributes: ERROR', err));
```

## Set anonymous user attributes

Use `setAnonymousUserAttributes` before user identification:

```js
RetenoPlugin.setAnonymousUserAttributes({
  firstName: 'John',
  lastName: 'Doe',
  languageCode: 'en',
  timeZone: 'Europe/Kyiv',
  marketId: 'market_1',
  address: {
    region: 'Kyivska',
    town: 'Kyiv',
    address: 'Khreshchatyk St, 1',
    postcode: '01001',
  },
  fields: [{ key: 'utm_source', value: 'google' }],
})
  .then(() => console.log('setAnonymousUserAttributes: OK'))
  .catch((err) => console.error('setAnonymousUserAttributes: ERROR', err));
```

Note: anonymous attributes cannot include `phone` or `email`.

## Multi-account mode

Use `setMultiAccountUserAttributes` when one device should receive push for multiple accounts:

```js
RetenoPlugin.setMultiAccountUserAttributes({
  externalUserId: 'user-123',
  user: {
    userAttributes: {
      email: 'john.doe@example.com',
      phone: '+1234567890',
      firstName: 'John',
      lastName: 'Doe',
      languageCode: 'en',
      timeZone: 'Europe/Kyiv',
      marketId: 'market_1',
    },
  },
})
  .then(() => console.log('setMultiAccountUserAttributes: OK'))
  .catch((err) => console.error('setMultiAccountUserAttributes: ERROR', err));
```

If you want default one-token-per-device behavior, switch back to `setUserAttributes`.

## Market ID

`marketId` is supported by `setUserAttributes`, `setAnonymousUserAttributes`, and
`setMultiAccountUserAttributes` starting with `cordova-plugin-reteno@2.1.0`.

- The value can contain up to 64 Latin letters, digits, hyphens (`-`), and underscores (`_`).
- Pass an empty string to clear the existing value:

```js
RetenoPlugin.setUserAttributes({
  externalUserId: 'USER_ID',
  user: {
    userAttributes: {
      marketId: '',
    },
  },
});
```

- Omit `marketId` to keep the existing value unchanged.
- The feature requires Reteno Android SDK 2.9.5+ or Reteno iOS SDK 2.7.1+. These versions are included in `cordova-plugin-reteno@2.1.0`.

## Notes

- `languageCode` should follow [RFC 5646](https://www.rfc-editor.org/rfc/rfc5646.html) (`de-AT`, `en`, etc).
- `timeZone` should be from [TZ database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) (`Europe/Kyiv`, etc).
- API payload types are available in plugin [types](https://github.com/reteno-com/reteno-cordova/blob/main/types/index.ts).
