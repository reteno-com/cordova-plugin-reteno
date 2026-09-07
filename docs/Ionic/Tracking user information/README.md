# Tracking user information

Use `AwesomeCordovaPluginReteno` service methods.

## Set user attributes (identified user)

```ts
await this.reteno.setUserAttributes({
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
});
```

## Set anonymous user attributes

```ts
await this.reteno.setAnonymousUserAttributes({
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
});
```

Anonymous attributes cannot include `phone` or `email`.

## Multi-account mode

```ts
await this.reteno.setMultiAccountUserAttributes({
  externalUserId: 'user-123',
  user: {
    userAttributes: {
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      marketId: 'market_1',
    },
  },
});
```

## Market ID

`marketId` requires `cordova-plugin-reteno@2.1.0`. The
`awesome-cordova-plugins-reteno@9.2.0` wrapper includes its TypeScript declaration. It is
supported by `setUserAttributes`, `setAnonymousUserAttributes`, and
`setMultiAccountUserAttributes`.

- The value can contain up to 64 Latin letters, digits, hyphens (`-`), and underscores (`_`).
- Pass an empty string to clear the existing value:

```ts
await this.reteno.setUserAttributes({
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

- `languageCode`: RFC 5646 (example: `de-AT`)
- `timeZone`: TZ database value (example: `Europe/Kyiv`)
