# In app messages

## Pause and resume In-App messages

```js
// pause
RetenoPlugin.pauseInAppMessages(true)
  .then(() => console.log('In-apps paused'))
  .catch((err) => console.error(err));

// resume
RetenoPlugin.pauseInAppMessages(false)
  .then(() => console.log('In-apps resumed'))
  .catch((err) => console.error(err));
```

## Configure pause behaviour

```js
// Drop in-apps received while paused
RetenoPlugin.setInAppMessagesPauseBehaviour('SKIP_IN_APPS');

// Queue one and show later after resume
RetenoPlugin.setInAppMessagesPauseBehaviour('POSTPONE_IN_APPS');
```

## Subscribe to In-App lifecycle events

```js
function onInAppStatus(event) {
  const detail = event.detail || event;
  console.log('In-app status:', detail.event, detail.data);
  // detail.event:
  // beforeDisplay, onDisplay, beforeClose, afterClose, onError
}

RetenoPlugin.setOnInAppLifecycleCallback(onInAppStatus);

// unsubscribe
RetenoPlugin.setOnInAppLifecycleCallback(null);
```

### Platform-specific payload (`detail.data`)

| Event | Android | iOS |
|---|---|---|
| `beforeDisplay` | `{ id }` | `{}` (empty) |
| `onDisplay` | `{ id }` | `{}` (empty) |
| `beforeClose` | `{ id, closeAction }` | `{ closeAction, action }` |
| `afterClose` | `{ id, closeAction }` | `{ closeAction, action }` |
| `onError` | `{ id, errorMessage }` | `{ errorMessage }` |

`closeAction` values:
- **Android**: string from native SDK (e.g. via `InAppCloseData.getCloseAction()`)
- **iOS**: `"closeButtonClicked"`, `"buttonClicked"`, `"openUrlClicked"`, or `"unknown"`

`action` (iOS only): `{ isCloseButtonClicked, isButtonClicked, isOpenUrlClicked }`

## Receive custom data from In-App (Android)

```js
function onInAppCustomData(event) {
  console.log('In-app custom data:', event.detail);
}

RetenoPlugin.setOnInAppMessageCustomDataReceivedListener(onInAppCustomData);

// later
RetenoPlugin.removeOnInAppMessageCustomDataReceivedListener(onInAppCustomData);
```

Important: when this listener is registered, automatic opening of In-App button links is disabled. Handle navigation yourself (for example, using `event.detail.url`).
