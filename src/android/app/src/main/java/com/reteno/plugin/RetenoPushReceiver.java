package com.reteno.plugin;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class RetenoPushReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null) {
      return;
    }

    RetenoPlugin.emitJsEvent("reteno-push-received", RetenoUtil.bundleToJson(intent.getExtras()));
  }
}
