package com.reteno.plugin;

import android.os.Build;

import com.reteno.core.domain.model.event.Event;
import com.reteno.core.domain.model.event.Parameter;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

public class RetenoEvent {

  private static List<Parameter> buildEventParameters(JSONArray inputParameters) throws JSONException {
    int countView = inputParameters.length();
    if (countView == 0) return null;

    List<Parameter> list = new ArrayList<>();
    for (int i = 0; i < countView; i++) {
      JSONObject field = (JSONObject) inputParameters.get(i);

      String name = RetenoUtil.getStringOrNull(field.optString("name", null));
      String value = RetenoUtil.getStringOrNull(field.optString("value", null));

      if (name != null) {
        list.add(new Parameter(name, value));
      }
    }
    return list;
  }

  //ReadableMap payload
  public static Event buildEventFromPayload(JSONObject payload) throws Exception {
    String eventName = RetenoUtil.getStringOrNull(payload.optString("eventName", null));
    String stringDate = RetenoUtil.getStringOrNull(payload.optString("date", null));
    JSONArray inputParameters = payload.optJSONArray("parameters");

    List<Parameter> parameters = null;

    ZonedDateTime date = null;

    if (eventName == null) {
      throw new Exception("logEvent: missing 'eventName' parameter!");
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      if (stringDate != null) {
        date = ZonedDateTime.parse(stringDate);
      } else {
        date = ZonedDateTime.now();
      }
    }

    if (inputParameters != null) {
      parameters = buildEventParameters(inputParameters);
    }

    return new Event.Custom(eventName, date, parameters);
  }
}
