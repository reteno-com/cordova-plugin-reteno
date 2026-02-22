package com.reteno.plugin;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class RetenoPushReceiver extends BroadcastReceiver {
  private static final String ACTION_CUSTOM_PUSH = "com.reteno.custom-push";

  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null) {
      return;
    }

    String action = intent.getAction();
    if (ACTION_CUSTOM_PUSH.equals(action)) {
      if (RetenoPlugin.shouldUseListenerCustomPush()) {
        return;
      }
      RetenoPlugin.emitJsEvent("reteno-custom-push-received", RetenoUtil.bundleToJson(intent.getExtras()));
      return;
    }

    if (RetenoPlugin.shouldUseListenerPushReceived()) {
      return;
    }

    RetenoPlugin.emitJsEvent("reteno-push-received", RetenoUtil.bundleToJson(intent.getExtras()));
  }
}
