# Tracking user behaviour

## Track custom events

```ts
await this.reteno.logEvent({
  eventName: 'EVENT_NAME',
  date: new Date().toISOString(),
  parameters: [{ name: 'Additional parameter', value: 'Additional value' }],
});
```

## Force push cached data

```ts
await this.reteno.forcePushData();
```

On iOS this uses a technical `logEvent(..., forcePush: true)` call under the hood.

## Log screen view events

```ts
await this.reteno.logScreenView('HomeScreen');
```

## Lifecycle tracking options

See configuration and examples in:

- [AppLifeCycleEvents/README.md](../AppLifeCycleEvents/README.md)
