package com.reteno.plugin;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class RetenoInAppDataReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null) {
      return;
    }

    RetenoPlugin.emitJsEvent("reteno-in-app-custom-data", RetenoUtil.bundleToJson(intent.getExtras()));
  }
}
