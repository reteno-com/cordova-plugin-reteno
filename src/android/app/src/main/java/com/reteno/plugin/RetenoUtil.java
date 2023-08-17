package com.reteno.plugin;

import org.json.JSONException;
import org.json.JSONObject;

public class RetenoUtil {
  public static String getStringOrNull(JSONObject object, String fieldName) throws JSONException {
    if (object.has(fieldName))
      return object.getString(fieldName);
    return null;
  }
}
