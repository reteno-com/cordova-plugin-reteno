# Tracking user behaviour

## Track custom events

```js
RetenoPlugin.logEvent({
  eventName: 'EVENT_NAME',
  date: new Date().toISOString(), // optional ISO8601
  parameters: [
    { name: 'Additional parameter', value: 'Additional value' },
  ],
})
  .then(() => console.log('logEvent: OK'))
  .catch((err) => console.error('logEvent: ERROR', err));
```

Parameter item type:

```ts
type CustomEventParameter = {
  name: string;
  value?: string;
};
```

## Force push cached data

Reteno caches events locally. Use `forcePushData` to sync immediately:

```js
RetenoPlugin.forcePushData()
  .then(() => console.log('forcePushData: OK'))
  .catch((err) => console.error('forcePushData: ERROR', err));
```

On iOS this uses a technical `logEvent(..., forcePush: true)` call under the hood.

## Log screen view events

For Cordova/WebView apps, manual screen tracking is recommended:

```js
RetenoPlugin.logScreenView('HomeScreen')
  .then(() => console.log('logScreenView: OK'))
  .catch((err) => console.error('logScreenView: ERROR', err));
```

## Lifecycle tracking options

Lifecycle tracking configuration and examples are documented in:

- [AppLifeCycleEvents/README.md](../AppLifeCycleEvents/README.md)
