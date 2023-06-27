package com.reteno.plugin;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.Toast;

import com.google.gson.Gson;
import com.reteno.core.RetenoApplication;
import com.reteno.core.domain.model.user.User;
import com.reteno.core.domain.model.user.UserAttributes;

public class RetenoPlugin extends CordovaPlugin {
  @Override
  public boolean execute(
    String action, JSONArray args, CallbackContext callbackContext
  ) throws JSONException {

    if ("logEvent".equals(action)){
      echo(action + "\n" + args.toString(), callbackContext);
      //logEvent(args, callbackContext);
      return true;
    }
    if ("setUserAttributes".equals(action)){
      echo(action + "\n" + args.toString(), callbackContext);

      User user = new Gson().fromJson(args.toString(), User.class);
      setUserAttributes(user, callbackContext);
      return true;
    }
    if ("getInitialNotification".equals(action)){
      echo(action + "\n" + args.toString(), callbackContext);
     // getInitialNotification(callbackContext);
      return true;
    }
    if ("setDeviceToken".equals(action)){
      echo(action + "\n" + args.toString(), callbackContext);


      //setDeviceToken(args, callbackContext);
      return true;
    }
    return false;
  }

  private void logEvent(JSONArray args, CallbackContext callbackContext) {
    if (args == null || args.length() == 0) {
      callbackContext.error("Empty event!");
    } else {
      try {
        ((RetenoApplication)this.cordova.getActivity().getApplication())
                .getRetenoInstance()
                .logEvent(RetenoEvent.buildEventFromPayload(args.getJSONObject(0)));
      } catch (Exception e) {
        callbackContext. error("Reteno Android SDK Error " + e.getLocalizedMessage());
        return;
      }
      callbackContext.success(args);
    }
  }

  public void setDeviceToken(JSONArray args, CallbackContext callbackContext) {

  }

  public void setUserAttributes(User user, CallbackContext callbackContext) throws JSONException {
    try {
      ((RetenoApplication)this.cordova.getActivity().getApplication())
              .getRetenoInstance()
              .setUserAttributes("", user);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
      return;
    }
    callbackContext.success("user");
  }
/*
  public static void onRetenoPushReceived(Context context, Intent intent) {
    WritableMap params;
    Bundle extras = intent.getExtras();
    if (extras != null) {
      try {
        params = Arguments.fromBundle(extras);
      } catch (Exception e) {
        params = Arguments.createMap();
      }
    } else {
      params = Arguments.createMap();
    }

    ReactContext reactContext = ((RetenoReactNativeApplication) context.getApplicationContext())
            .getReactContext();

    if (reactContext != null) {
      reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
              .emit("reteno-push-received", params);
    }
  }

  public static void onRetenoPushClicked(Context context, Intent intent) {
    WritableMap params;
    Bundle extras = intent.getExtras();
    if (extras != null) {
      try {
        params = Arguments.fromBundle(extras);
      } catch (Exception e) {
        params = Arguments.createMap();
      }
    } else {
      params = Arguments.createMap();
    }
  }

  private WritableMap parseIntent(Intent intent){
    WritableMap params;
    Bundle extras = intent.getExtras();
    if (extras != null) {
      try {
        params = Arguments.fromBundle(extras);
      } catch (Exception e){
        params = Arguments.createMap();
      }
    } else {
      params = Arguments.createMap();
    }

    return params;
  }
*/
  public void getInitialNotification(CallbackContext callbackContext){
    Activity activity = this.cordova.getActivity();
    if(activity == null){
      callbackContext.error("No activity");
      return;
    }
   //parseIntent(activity.getIntent());
  }

}