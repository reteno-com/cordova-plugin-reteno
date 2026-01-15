package com.reteno.plugin;

import com.reteno.core.domain.model.user.User;
import com.google.gson.Gson;

import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class RetenoUserAttributes {
  private static final String TAG = "RetenoUserAttributes";

  private RetenoUserAttributes() {}

  public static final class ParsedPayload {
    public final JSONObject payload;
    public final String error;

    private ParsedPayload(JSONObject payload, String error) {
      this.payload = payload;
      this.error = error;
    }

    public static ParsedPayload ok(JSONObject payload) {
      return new ParsedPayload(payload, null);
    }

    public static ParsedPayload error(String error) {
      return new ParsedPayload(null, error);
    }

    public boolean isOk() {
      return error == null;
    }
  }

  public static final class SetUserAttributesParsed {
    public final String externalUserId;
    public final User user;
    public final String error;

    private SetUserAttributesParsed(String externalUserId, User user, String error) {
      this.externalUserId = externalUserId;
      this.user = user;
      this.error = error;
    }

    public static SetUserAttributesParsed ok(String externalUserId, User user) {
      return new SetUserAttributesParsed(externalUserId, user, null);
    }

    public static SetUserAttributesParsed error(String error) {
      return new SetUserAttributesParsed(null, null, error);
    }

    public boolean isOk() {
      return error == null;
    }
  }

  private static JSONObject extractPayloadObject(JSONArray args) throws JSONException {
    if (args == null || args.length() == 0) {
      return null;
    }

    Object arg0 = args.opt(0);
    if (arg0 instanceof JSONObject) {
      return (JSONObject) arg0;
    }
    if (arg0 instanceof JSONArray) {
      return ((JSONArray) arg0).optJSONObject(0);
    }
    if (arg0 instanceof String) {
      try {
        return new JSONObject((String) arg0);
      } catch (Exception ignored) {
        return null;
      }
    }

    return null;
  }

  public static ParsedPayload parseAnonymousUserAttributesArgs(JSONArray args) throws JSONException {
    JSONObject payload = extractPayloadObject(args);
    if (payload == null) {
      return ParsedPayload.error("Invalid setAnonymousUserAttributes payload.");
    }

    // Reteno docs: anonymous attributes cannot include phone/email.
    if (payload.has("phone") || payload.has("email")) {
      return ParsedPayload.error(
        "Anonymous user attributes cannot include phone/email. " +
        "Use setUserAttributes(externalUserId, user) for phone/email."
      );
    }
    JSONObject userAttributes = payload.optJSONObject("userAttributes");
    if (userAttributes != null && (userAttributes.has("phone") || userAttributes.has("email"))) {
      return ParsedPayload.error(
        "Anonymous user attributes cannot include phone/email. " +
        "Use setUserAttributes(externalUserId, user) for phone/email."
      );
    }

    return ParsedPayload.ok(payload);
  }

  public static SetUserAttributesParsed parseSetUserAttributesArgs(JSONArray args) throws JSONException {
    JSONObject payload = extractPayloadObject(args);
    if (payload == null) {
      return SetUserAttributesParsed.error("Invalid setUserAttributes payload.");
    }

    String externalUserId = payload.optString("externalUserId", null);
    if (externalUserId != null) {
      externalUserId = externalUserId.trim();
    }
    if (externalUserId == null || externalUserId.length() == 0) {
      return SetUserAttributesParsed.error("Missing argument: externalUserId");
    }

    User user = null;
    if (payload.has("user") && !payload.isNull("user")) {
      JSONObject userJson = payload.optJSONObject("user");
      if (userJson == null) {
        return SetUserAttributesParsed.error(
          "Invalid setUserAttributes payload: user must be an object."
        );
      }
      user = new Gson().fromJson(userJson.toString(), User.class);
    }

    return SetUserAttributesParsed.ok(externalUserId, user);
  }
}
