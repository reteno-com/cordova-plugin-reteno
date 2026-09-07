# Action Buttons

## Configuring Action Buttons

When creating mobile push notifications, you can add action buttons.

- iOS supports up to 4 buttons in one notification.
- Android supports up to 3 buttons in one notification.

### Adding Action Buttons

1. In Reteno, open `Messages -> Mobile Push`.
2. Create a push or edit existing one.
3. Configure the `Buttons` section.

<p align="center">
  <img src="https://raw.githubusercontent.com/reteno-com/reteno-mobile-documentation/main/Cordova/Action%20Buttons/Resources/action_button_setup.png" width="100%"/>
</p>

Use unique `Action ID` values for different buttons.

| Parameter | Notes |
| --- | --- |
| Action ID | Unique button action identifier |
| Text | Text shown on the button |
| iOS icon path | Available on iOS 15+. Name of image from app bundle |
| Launch URL | URL/deeplink to open |
| Custom data | Additional JSON payload |

## Handle Action Button click

Enable handler for iOS event emission:

```js
await RetenoPlugin.setNotificationActionHandler({ emitEvent: true });
```

Subscribe:

```js
function onPushButtonClicked(event) {
  const detail = event && event.detail !== undefined ? event.detail : event;
  console.log('reteno-push-button-clicked:', detail);
  // detail.actionId
  // detail.link
  // detail.customData
  // detail.userInfo
}

RetenoPlugin.setOnRetenoPushButtonClickedListener(onPushButtonClicked);

// later
RetenoPlugin.removeOnRetenoPushButtonClickedListener(onPushButtonClicked);
```

Disable handler:

```js
await RetenoPlugin.setNotificationActionHandler(false);
```

Android note: `setNotificationActionHandler(...)` is no-op on Android. Action button clicks are detected automatically.
