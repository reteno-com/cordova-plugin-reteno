package com.reteno.plugin;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * BroadcastReceiver for handling notification click events from Reteno SDK.
 * This receiver is triggered when a user taps on a push notification.
 *
 * According to Reteno documentation, this receiver should be registered with:
 * - meta-data: com.reteno.Receiver.NotificationClicked
 *
 * The receiver extracts custom data from the notification payload and emits
 * a JavaScript event "reteno-notification-clicked" that can be listened to
 * in the Cordova application.
 */
public class RetenoNotificationClickedReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null) {
      return;
    }

    RetenoPlugin.emitJsEvent("reteno-notification-clicked", RetenoUtil.bundleToJson(intent.getExtras()));
  }
}
