package com.reteno.plugin;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import java.util.HashMap;
import java.util.Map;

public class RetenoPushReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {

  }
//  @Override
//  public void onReceive(Context context, Intent intent) {
//    if(intent == null || intent.getExtras() == null){
//      return;
//    }
//    Map<String, Object> map = new HashMap<>();
//    for (String key : intent.getExtras().keySet()) {
//      Object value = intent.getExtras().get(key);
//      map.put(key, value);
//    }
//    try {
//     // RetenoPlugin.methodChannel.invokeMethod("onRetenoNotificationReceived", map);
//    } catch (Exception e){
//
//    }
//  }
}
