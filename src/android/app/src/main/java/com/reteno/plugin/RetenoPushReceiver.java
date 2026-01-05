package com.reteno.plugin;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class RetenoPushReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null) {
      return;
    }

    Bundle extras = intent.getExtras();
    JSONObject payload = bundleToJson(extras);
    RetenoPlugin.emitJsEvent("reteno-push-received", payload);
  }

  private JSONObject bundleToJson(Bundle bundle) {
    JSONObject json = new JSONObject();
    if (bundle == null) {
      return json;
    }

    for (String key : bundle.keySet()) {
      try {
        Object value = bundle.get(key);
        json.put(key, bundleValueToJson(value));
      } catch (Exception ignored) {
        // Best-effort serialization.
      }
    }
    return json;
  }

  private Object bundleValueToJson(Object value) throws JSONException {
    if (value == null) {
      return JSONObject.NULL;
    }
    if (value instanceof Bundle) {
      return bundleToJson((Bundle) value);
    }
    if (value instanceof CharSequence) {
      return value.toString();
    }
    if (value instanceof String || value instanceof Boolean || value instanceof Integer || value instanceof Long || value instanceof Double) {
      return value;
    }
    if (value instanceof Float) {
      return ((Float) value).doubleValue();
    }
    if (value instanceof String[]) {
      JSONArray arr = new JSONArray();
      for (String s : (String[]) value) {
        arr.put(s);
      }
      return arr;
    }

    return value.toString();
  }
}
