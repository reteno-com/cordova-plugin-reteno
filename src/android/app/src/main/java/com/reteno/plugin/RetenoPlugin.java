package com.reteno.plugin;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.text.TextUtils;

import com.google.gson.Gson;
import com.reteno.core.Reteno;
import com.reteno.core.RetenoConfig;
import com.reteno.core.domain.model.event.LifecycleTrackingOptions;
import com.reteno.core.domain.model.user.User;
import com.reteno.core.domain.model.user.UserAttributesAnonymous;
import com.reteno.push.RetenoNotificationService;

public class RetenoPlugin extends CordovaPlugin {
  private static final int REQ_CODE_POST_NOTIFICATIONS = 10001;
  private static final String PERMISSION_POST_NOTIFICATIONS = "android.permission.POST_NOTIFICATIONS";
  private static final String SDK_ACCESS_KEY_META = "com.reteno.SDK_ACCESS_KEY";
  private static final String DEBUG_MODE_META = "com.reteno.plugin.DEBUG_MODE";
  private static final String DEBUG_MODE_PREF = "RETENO_DEBUG_MODE";

  private static volatile RetenoPlugin activeInstance;

  private CallbackContext notificationPermissionCallback;
  private JSONObject initialNotification;
  private volatile boolean initialized = false;

  @Override
  protected void pluginInitialize() {
    activeInstance = this;
    captureInitialNotificationFromIntent();
  }

  @Override
  public void onDestroy() {
    if (activeInstance == this) {
      activeInstance = null;
    }
    super.onDestroy();
  }

  public static void emitJsEvent(String eventName, JSONObject payload) {
    RetenoPlugin instance = activeInstance;
    if (instance == null || instance.webView == null) {
      return;
    }

    if (eventName == null) {
      return;
    }

    String safeEventName = JSONObject.quote(eventName);
    String payloadJson = (payload == null) ? "{}" : payload.toString();
    final String js = "cordova.fireDocumentEvent(" + safeEventName + ", " + payloadJson + ");";

    try {
      instance.webView.getEngine().evaluateJavascript(js, null);
    } catch (Exception ignored) {
      try {
        instance.webView.loadUrl("javascript:" + js);
      } catch (Exception ignored2) {
        // ignore
      }
    }
  }

  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    captureInitialNotificationFromIntent(intent);
  }

  @Override
  public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
    if ("initialize".equals(action)) {
      Activity activity = cordova.getActivity();
      if (activity == null) {
        callbackContext.error("Reteno Android SDK Error: Activity is null.");
        return true;
      }
      activity.runOnUiThread(new Runnable() {
        @Override
        public void run() {
          initialize(callbackContext);
        }
      });
      return true;
    }

    if ("logEvent".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          logEvent(args, callbackContext);
        }
      });
      return true;
    }

    if ("setUserAttributes".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          try {
            RetenoUserAttributes.SetUserAttributesParsed parsed =
              RetenoUserAttributes.parseSetUserAttributesArgs(args);
            if (!parsed.isOk()) {
              callbackContext.error(parsed.error);
              return;
            }

            setUserAttributes(parsed.externalUserId, parsed.user, callbackContext);
          } catch (Exception e) {
            callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
          }
        }
      });
      return true;
    }

    if ("setAnonymousUserAttributes".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          try {
            RetenoUserAttributes.ParsedPayload parsed =
              RetenoUserAttributes.parseAnonymousUserAttributesArgs(args);
            if (!parsed.isOk()) {
              callbackContext.error(parsed.error);
              return;
            }

            setAnonymousUserAttributes(parsed.payload, callbackContext);
          } catch (Exception e) {
            callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
          }
        }
      });
      return true;
    }

    if ("setMultiAccountUserAttributes".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          try {
            RetenoUserAttributes.SetUserAttributesParsed parsed =
              RetenoUserAttributes.parseMultiAccountUserAttributesArgs(args);
            if (!parsed.isOk()) {
              callbackContext.error(parsed.error);
              return;
            }

            setMultiAccountUserAttributes(parsed.externalUserId, parsed.user, callbackContext);
          } catch (Exception e) {
            callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
          }
        }
      });
      return true;
    }

    if ("setLifecycleTrackingOptions".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          try {
            setLifecycleTrackingOptions(args, callbackContext);
          } catch (Exception e) {
            callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
          }
        }
      });
      return true;
    }

    if ("logScreenView".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          try {
            logScreenView(args, callbackContext);
          } catch (Exception e) {
            callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
          }
        }
      });
      return true;
    }

    if ("forcePushData".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          try {
            forcePushData(callbackContext);
          } catch (Exception e) {
            callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
          }
        }
      });
      return true;
    }

    if ("getInitialNotification".equals(action)) {
      getInitialNotification(callbackContext);
      return true;
    }

    if ("setDeviceToken".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          setDeviceToken(args, callbackContext);
        }
      });
      return true;
    }

    if ("requestNotificationPermission".equals(action)) {
      requestNotificationPermission(callbackContext);
      return true;
    }

    return false;
  }

  private void initialize(CallbackContext callbackContext) {
    if (initialized) {
      callbackContext.success(1);
      return;
    }

    String accessKey = readAccessKeyFromManifest();
    if (TextUtils.isEmpty(accessKey)) {
      callbackContext.error(
        "Missing SDK_ACCESS_KEY. Provide it when installing the Cordova plugin " +
        "(e.g. --variable SDK_ACCESS_KEY=YOUR_KEY) or set AndroidManifest meta-data 'com.reteno.SDK_ACCESS_KEY'."
      );
      return;
    }

    Reteno.initWithConfig(
      new RetenoConfig.Builder()
        .accessKey(accessKey)
        .setDebug(readDebugModeEnabled())
        .build()
    );

    if (Reteno.getInstance() == null) {
      callbackContext.error("Reteno SDK initialization failed: instance is not available.");
      return;
    }

    initialized = true;
    callbackContext.success(1);
  }

  private void requestNotificationPermission(CallbackContext callbackContext) {
    if (Build.VERSION.SDK_INT < 33) {
      callbackContext.success(1);
      return;
    }

    if (cordova.hasPermission(PERMISSION_POST_NOTIFICATIONS)) {
      updateRetenoPushPermissionStatus(callbackContext);
      return;
    }

    notificationPermissionCallback = callbackContext;
    cordova.requestPermission(this, REQ_CODE_POST_NOTIFICATIONS, PERMISSION_POST_NOTIFICATIONS);
  }

  @Override
  public void onRequestPermissionResult(int requestCode, String[] permissions, int[] grantResults) throws JSONException {
    super.onRequestPermissionResult(requestCode, permissions, grantResults);

    if (requestCode != REQ_CODE_POST_NOTIFICATIONS) {
      return;
    }

    boolean granted = grantResults != null && grantResults.length > 0
      && grantResults[0] == PackageManager.PERMISSION_GRANTED;
    CallbackContext cb = notificationPermissionCallback;
    notificationPermissionCallback = null;
    if (cb == null) {
      return;
    }

    if (granted) {
      updateRetenoPushPermissionStatus(cb);
    } else {
      cb.success(0);
    }
  }

  private void updateRetenoPushPermissionStatus(CallbackContext callbackContext) {
    try {
      Reteno reteno = getRetenoInstanceOrThrow();
      reteno.updatePushPermissionStatus();
      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void logEvent(JSONArray args, CallbackContext callbackContext) {
    if (args == null || args.length() == 0) {
      callbackContext.error("Empty event!");
      return;
    }

    try {
      Reteno reteno = getRetenoInstanceOrThrow();
      reteno.logEvent(RetenoEvent.buildEventFromPayload(args.getJSONObject(0)));
      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void logScreenView(JSONArray args, CallbackContext callbackContext) {
    String screenName = null;
    if (args != null && args.length() > 0) {
      Object arg0 = args.opt(0);
      if (arg0 instanceof String) {
        screenName = (String) arg0;
      } else if (arg0 instanceof JSONObject) {
        screenName = ((JSONObject) arg0).optString("screenName", null);
      } else if (arg0 instanceof JSONArray) {
        screenName = ((JSONArray) arg0).optString(0, null);
      }
    }

    if (screenName != null) {
      screenName = screenName.trim();
    }
    if (TextUtils.isEmpty(screenName)) {
      callbackContext.error("Missing argument: screenName");
      return;
    }

    try {
      Reteno reteno = getRetenoInstanceOrThrow();
      reteno.logScreenView(screenName);
      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void forcePushData(CallbackContext callbackContext) {
    try {
      Reteno reteno = getRetenoInstanceOrThrow();
      reteno.forcePushData();
      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void setDeviceToken(JSONArray args, CallbackContext callbackContext) {
    try {
      getRetenoInstanceOrThrow();

      String deviceToken = null;
      if (args != null && args.length() > 0) {
        Object arg0 = args.opt(0);
        if (arg0 instanceof String) {
          deviceToken = (String) arg0;
        } else if (arg0 instanceof JSONObject) {
          JSONObject obj = (JSONObject) arg0;
          deviceToken = obj.optString("deviceToken", null);
          if (TextUtils.isEmpty(deviceToken)) {
            deviceToken = obj.optString("token", null);
          }
        } else if (arg0 instanceof JSONArray) {
          deviceToken = ((JSONArray) arg0).optString(0, null);
        }
      }

      if (deviceToken != null) {
        deviceToken = deviceToken.trim();
      }
      if (TextUtils.isEmpty(deviceToken)) {
        callbackContext.error("Missing argument: deviceToken");
        return;
      }

      Context appContext = cordova.getActivity().getApplicationContext();
      RetenoNotificationService service = new RetenoNotificationService(appContext);
      service.onNewToken(deviceToken);

      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void setAnonymousUserAttributes(JSONObject payload, CallbackContext callbackContext) {
    try {
      Reteno reteno = getRetenoInstanceOrThrow();
      UserAttributesAnonymous attrs = new Gson().fromJson(payload.toString(), UserAttributesAnonymous.class);
      reteno.setAnonymousUserAttributes(attrs);
      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void setUserAttributes(String externalUserId, User user, CallbackContext callbackContext) {
    try {
      Reteno reteno = getRetenoInstanceOrThrow();
      if (user == null) {
        reteno.setUserAttributes(externalUserId);
      } else {
        reteno.setUserAttributes(externalUserId, user);
      }
      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void setMultiAccountUserAttributes(String externalUserId, User user, CallbackContext callbackContext) {
    try {
      Reteno reteno = getRetenoInstanceOrThrow();
      reteno.setMultiAccountUserAttributes(externalUserId, user);
      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void setLifecycleTrackingOptions(JSONArray args, CallbackContext callbackContext) throws JSONException {
    Reteno reteno = getRetenoInstanceOrThrow();
    LifecycleTrackingOptions options = parseLifecycleTrackingOptionsArgs(args);
    if (options == null) {
      callbackContext.error("Invalid setLifecycleTrackingOptions payload.");
      return;
    }
    reteno.setLifecycleEventConfig(options);
    callbackContext.success(1);
  }

  private LifecycleTrackingOptions parseLifecycleTrackingOptionsArgs(JSONArray args) throws JSONException {
    if (args == null || args.length() == 0) {
      return null;
    }

    Object arg0 = args.opt(0);
    if (arg0 instanceof JSONArray) {
      arg0 = ((JSONArray) arg0).opt(0);
    }

    if (arg0 instanceof String) {
      String value = ((String) arg0).trim();
      if ("ALL".equalsIgnoreCase(value)) {
        return new LifecycleTrackingOptions(true, true, true);
      }
      if ("NONE".equalsIgnoreCase(value)) {
        return new LifecycleTrackingOptions(false, false, false);
      }
      return null;
    }

    if (arg0 instanceof JSONObject) {
      JSONObject payload = (JSONObject) arg0;
      boolean appLifecycleEnabled = payload.has("appLifecycleEnabled")
        ? payload.optBoolean("appLifecycleEnabled", true)
        : true;
      boolean pushSubscriptionEnabled = payload.has("pushSubscriptionEnabled")
        ? payload.optBoolean("pushSubscriptionEnabled", true)
        : true;
      boolean sessionEventsEnabled = payload.has("sessionEventsEnabled")
        ? payload.optBoolean("sessionEventsEnabled", true)
        : true;
      return new LifecycleTrackingOptions(appLifecycleEnabled, pushSubscriptionEnabled, sessionEventsEnabled);
    }

    return null;
  }


  private void getInitialNotification(CallbackContext callbackContext) {
    JSONObject payload = initialNotification;
    initialNotification = null;

    if (payload == null) {
      callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, new JSONObject()));
      return;
    }

    callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, payload));
  }

  private void captureInitialNotificationFromIntent() {
    Activity activity = this.cordova.getActivity();
    if (activity == null) {
      return;
    }
    captureInitialNotificationFromIntent(activity.getIntent());
  }

  private void captureInitialNotificationFromIntent(Intent intent) {
    if (intent == null) {
      return;
    }
    Bundle extras = intent.getExtras();
    if (extras == null || extras.isEmpty()) {
      return;
    }

    initialNotification = bundleToJson(extras);
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

  private String readAccessKeyFromManifest() {
    Context context = this.cordova.getActivity();
    if (context == null) {
      return null;
    }
    try {
      PackageManager pm = context.getPackageManager();
      ApplicationInfo info = pm.getApplicationInfo(context.getPackageName(), PackageManager.GET_META_DATA);
      if (info == null || info.metaData == null) {
        return readAccessKeyFromCordovaPreferences();
      }
      String key = info.metaData.getString(SDK_ACCESS_KEY_META);
      String normalized = normalizeAccessKey(key);
      if (normalized != null) {
        return normalized;
      }

      return readAccessKeyFromCordovaPreferences();
    } catch (Exception ignored) {
      return readAccessKeyFromCordovaPreferences();
    }
  }

  private String readAccessKeyFromCordovaPreferences() {
    try {
      String key = this.preferences != null ? this.preferences.getString("SDK_ACCESS_KEY", null) : null;
      return normalizeAccessKey(key);
    } catch (Exception ignored) {
      return null;
    }
  }

  private String normalizeAccessKey(String key) {
    if (key == null) {
      return null;
    }
    key = key.trim();
    if (key.length() == 0 || "$SDK_ACCESS_KEY".equals(key)) {
      return null;
    }
    return key;
  }

  private boolean readDebugModeEnabled() {
    try {
      String pref = this.preferences != null ? this.preferences.getString(DEBUG_MODE_PREF, null) : null;
      Boolean parsed = parseBooleanLenient(pref, "$RETENO_DEBUG_MODE");
      if (parsed != null) {
        return parsed.booleanValue();
      }
    } catch (Exception ignored) {
      // ignore
    }

    Boolean fromManifest = readBooleanFromManifest(DEBUG_MODE_META, "$RETENO_DEBUG_MODE");
    if (fromManifest != null) {
      return fromManifest.booleanValue();
    }

    return false;
  }

  private Boolean readBooleanFromManifest(String metaName, String placeholder) {
    try {
      Context context = this.cordova.getActivity();
      if (context == null) {
        return null;
      }
      PackageManager pm = context.getPackageManager();
      ApplicationInfo info = pm.getApplicationInfo(context.getPackageName(), PackageManager.GET_META_DATA);
      if (info == null || info.metaData == null || !info.metaData.containsKey(metaName)) {
        return null;
      }
      Object raw = info.metaData.get(metaName);
      if (raw == null) {
        return null;
      }
      if (raw instanceof Boolean) {
        return (Boolean) raw;
      }
      if (raw instanceof Integer) {
        return ((Integer) raw).intValue() != 0;
      }
      if (raw instanceof String) {
        return parseBooleanLenient((String) raw, placeholder);
      }
      return parseBooleanLenient(String.valueOf(raw), placeholder);
    } catch (Exception ignored) {
      return null;
    }
  }

  private Boolean parseBooleanLenient(String raw, String placeholder) {
    if (raw == null) {
      return null;
    }
    String s = raw.trim();
    if (s.length() == 0) {
      return null;
    }
    if (placeholder != null && placeholder.equals(s)) {
      return null;
    }
    if ("true".equalsIgnoreCase(s) || "1".equals(s) || "yes".equalsIgnoreCase(s)
      || "y".equalsIgnoreCase(s) || "on".equalsIgnoreCase(s)) {
      return true;
    }
    if ("false".equalsIgnoreCase(s) || "0".equals(s) || "no".equalsIgnoreCase(s)
      || "n".equalsIgnoreCase(s) || "off".equalsIgnoreCase(s)) {
      return false;
    }
    return null;
  }

  private Reteno getRetenoInstanceOrThrow() {
    Reteno reteno = Reteno.getInstance();
    if (reteno == null) {
      throw new IllegalStateException(
        "Reteno SDK is not initialized. Call retenosdk.init(...) before using the plugin."
      );
    }
    return reteno;
  }
}
