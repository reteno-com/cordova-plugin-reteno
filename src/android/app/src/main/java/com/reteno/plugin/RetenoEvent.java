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

      String name = null;
      String value = null;

      if (field.getString("name") != null) {
        name = field.getString("name");
      }
      if (field.getString("value") != null) {
        value = field.getString("value");
      }

      if (name != null) {
        list.add(new Parameter(name, value));
      }
    }
    return list;
  }

  public static Event buildEventFromPayload(JSONObject payload) throws Exception {
    String eventName = RetenoUtil.getStringOrNull(payload, "eventName");
    String stringDate = RetenoUtil.getStringOrNull(payload, "date");
    JSONArray inputParameters=null;
    if (payload.has("parameters"))
      inputParameters = payload.getJSONArray("parameters");

    List<Parameter> parameters = null;

    ZonedDateTime date = null;

    if (eventName == null) {
      throw new Exception("logEvent: missing 'eventName' parameter!");
    }

    if (stringDate != null) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        date = ZonedDateTime.parse(stringDate);
      }
    } else {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        date = ZonedDateTime.now();
      }
    }

    if (inputParameters != null) {
      parameters = buildEventParameters(inputParameters);
    }

    return new Event.Custom(eventName, date, parameters);
  }
}
