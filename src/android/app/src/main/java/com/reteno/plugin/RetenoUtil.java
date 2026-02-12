package com.reteno.plugin;

import android.os.Bundle;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class RetenoUtil {
  public static String getStringOrNull(String input) {
    if (input == null) return null;
    if (input.isEmpty()) return null;
    return input;
  }

  public static JSONObject bundleToJson(Bundle bundle) {
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

  public static Object bundleValueToJson(Object value) throws JSONException {
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
