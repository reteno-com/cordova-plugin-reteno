package com.reteno.plugin;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import com.reteno.core.Reteno;
import com.reteno.core.RetenoApplication;
import com.reteno.core.domain.model.event.Event;
import com.reteno.core.domain.model.user.User;
import com.reteno.core.domain.model.user.UserAttributesAnonymous;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.apache.cordova.firebase.FirebasePlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;

public class RetenoPlugin extends CordovaPlugin {
  protected static final String TAG = "RetenoPlugin";

  public Reteno getRetenoInstance() {
    return ((RetenoApplication)this.cordova.getActivity().getApplication()).getRetenoInstance();
  }

  @Override
  public boolean execute(
    String action, JSONArray args, CallbackContext callbackContext
  ) throws JSONException {
    if ("logEvent".equals(action)){
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          callbackContext.sendPluginResult(logEvent(args));
        }
      });
      return true;
    }
    if ("setUserAttributes".equals(action)){
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          callbackContext.sendPluginResult(createUser(args));
        }
      });
      return true;
    }
    if ("setAnonymousUserAttributes".equals(action)){
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          callbackContext.sendPluginResult(createAnonymousUser(args));
        }
      });
      return true;
    }
    if ("getInitialNotification".equals(action)){
      echo(action + "\n" + args.toString(), callbackContext);
      return true;
    }
    if ("setDeviceToken".equals(action)){
      setDeviceToken(args, callbackContext);
      return true;
    }
    if ("performRemoteToken".equals(action)){
      echo(action + "\n" + args.toString(), callbackContext);
      return true;
    }
    return false;
  }

  private void echo(String msg, CallbackContext callbackContext) {
    if (msg == null || msg.length() == 0) {
      callbackContext.error("Empty message!");
    } else {
      Toast.makeText(webView.getContext(), msg, Toast.LENGTH_LONG)
              .show();
      callbackContext.success(msg);
    }
  }

  private PluginResult logEvent(JSONArray args) {
    if (args == null || args.length() == 0) {
      return new PluginResult(PluginResult.Status.ERROR, "Empty event");
    } else {
      try {
        Event event = RetenoEvent.buildEventFromPayload((JSONObject) args.get(0));
        getRetenoInstance().logEvent(event);
      } catch (Exception e) {
        Log.e("RetenoPlugin", e.getLocalizedMessage(), e);
        return new PluginResult(PluginResult.Status.ERROR, ("Reteno Android SDK Error " + e.getLocalizedMessage()));
      }
      return new PluginResult(PluginResult.Status.OK);
    }
  }

  public void setDeviceToken(JSONArray args, CallbackContext callbackContext) {

  }

  public PluginResult createUser(JSONArray args) {
    try {
      JSONObject payload = (JSONObject)args.get(0);
      String externalId = payload.getString("externalUserId");
      JSONObject userJSON = payload.getJSONObject("user");
      User user = RetenoUserAttributes.buildUserFromPayload(userJSON);
      getRetenoInstance().setUserAttributes(externalId, user);
    } catch (Exception e) {
      Log.e("RetenoPlugin", e.getLocalizedMessage(), e);
      return new PluginResult(PluginResult.Status.ERROR, "Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
    return new PluginResult(PluginResult.Status.OK);
  }

  public PluginResult createAnonymousUser(JSONArray args) {
    try {
      JSONObject payload = (JSONObject)args.get(0);
      JSONObject userJSON = payload.getJSONObject("user");
      UserAttributesAnonymous userAttributes = RetenoUserAttributes.buildAnonymousUserFromPayload(userJSON);
      getRetenoInstance().setAnonymousUserAttributes(userAttributes);
    } catch (Exception e) {
      Log.e("RetenoPlugin", e.getLocalizedMessage(), e);
      return new PluginResult(PluginResult.Status.ERROR, "Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
    return new PluginResult(PluginResult.Status.OK);
  }
  static Map<String, String> bundleToMap(Bundle extras) {
    Map<String, String> map = new HashMap<String, String>();

    Set<String> ks = extras.keySet();
    Iterator<String> iterator = ks.iterator();
    while (iterator.hasNext()) {
      String key = iterator.next();
      map.put(key, extras.getString(key));
    }
    return map;
  }

  public void getInitialNotification(CallbackContext callbackContext){
    Activity activity = this.cordova.getActivity();
    if(activity == null){
      callbackContext.error("No activity");
      return;
    }
  }
}
