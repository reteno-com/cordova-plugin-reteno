# In-app messages

## Pause and resume in-app messages

```ts
await this.reteno.pauseInAppMessages(true);  // pause
await this.reteno.pauseInAppMessages(false); // resume
```

## Configure pause behaviour

```ts
await this.reteno.setInAppMessagesPauseBehaviour('SKIP_IN_APPS');
await this.reteno.setInAppMessagesPauseBehaviour('POSTPONE_IN_APPS');
```

On iOS you can also preconfigure the pause behaviour during `init()` via `inAppMessagesPauseBehaviour` — see the options table in [Setup overview](../SetupGuide/README.md#options-reference).

## Subscribe to in-app lifecycle events

```ts
const onInAppStatus = (event: any) => {
  const detail = event?.detail ?? event;
  console.log('In-app status:', detail?.event, detail?.data);
};

await this.reteno.setOnInAppLifecycleCallback(onInAppStatus);

// unsubscribe
await this.reteno.setOnInAppLifecycleCallback(null);
```

### Platform-specific payload (`detail.data`)

| Event | Android | iOS |
|---|---|---|
| `beforeDisplay` | `{ id }` | `{}` |
| `onDisplay` | `{ id }` | `{}` |
| `beforeClose` | `{ id, closeAction }` | `{ closeAction, action }` |
| `afterClose` | `{ id, closeAction }` | `{ closeAction, action }` |
| `onError` | `{ id, errorMessage }` | `{ errorMessage }` |

In short: Android payload usually includes in-app `id`, while iOS payload for display events is empty (`{}`) and does not include message id.

`closeAction` values:
- **Android**: string from native SDK (e.g. via `InAppCloseData.getCloseAction()`)
- **iOS**: `"closeButtonClicked"`, `"buttonClicked"`, `"openUrlClicked"`, or `"unknown"`

`action` (iOS only): `{ isCloseButtonClicked, isButtonClicked, isOpenUrlClicked }`

## Receive custom data from in-app (Android)

```ts
const onCustomData = (event: any) => {
  const detail = event?.detail ?? event;
  console.log('In-app custom data:', detail);
};

this.reteno.setOnInAppMessageCustomDataReceivedListener(onCustomData);

// later
this.reteno.removeOnInAppMessageCustomDataReceivedListener(onCustomData);
```

Important: when this listener is registered, automatic opening of in-app button links is disabled. Handle navigation yourself (for example, using `detail.url` / `payload.url`).
