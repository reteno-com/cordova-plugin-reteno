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

import androidx.annotation.NonNull;

import com.google.gson.Gson;
import com.reteno.core.Reteno;
import com.reteno.core.RetenoConfig;
import com.reteno.core.domain.callback.appinbox.RetenoResultCallback;
import com.reteno.core.domain.model.event.LifecycleTrackingOptions;
import com.reteno.core.features.iam.InAppPauseBehaviour;
import com.reteno.core.data.remote.model.recommendation.get.RecomBase;
import com.reteno.core.domain.model.recommendation.get.RecomFilter;
import com.reteno.core.domain.model.recommendation.get.RecomRequest;
import com.reteno.core.data.remote.model.recommendation.get.Recoms;
import com.reteno.core.domain.model.recommendation.post.RecomEvent;
import com.reteno.core.domain.model.recommendation.post.RecomEventType;
import com.reteno.core.domain.model.recommendation.post.RecomEvents;
import com.reteno.core.view.iam.callback.InAppCloseData;
import com.reteno.core.view.iam.callback.InAppData;
import com.reteno.core.view.iam.callback.InAppErrorData;
import com.reteno.core.view.iam.callback.InAppLifecycleCallback;
import com.reteno.core.domain.model.appinbox.AppInboxMessage;
import com.reteno.core.domain.model.appinbox.AppInboxMessages;
import com.reteno.core.domain.model.user.User;
import com.reteno.core.domain.model.user.UserAttributesAnonymous;
import com.reteno.core.features.appinbox.AppInboxStatus;
import com.reteno.push.RetenoNotificationService;
import com.reteno.push.RetenoNotifications;
import com.reteno.core.features.recommendation.GetRecommendationResponseCallback;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class RetenoPlugin extends CordovaPlugin {
  private static final int REQ_CODE_POST_NOTIFICATIONS = 10001;
  private static final String PERMISSION_POST_NOTIFICATIONS = "android.permission.POST_NOTIFICATIONS";
  private static final String SDK_ACCESS_KEY_META = "com.reteno.SDK_ACCESS_KEY";
  private static final String DEBUG_MODE_META = "com.reteno.plugin.DEBUG_MODE";
  private static final String DEBUG_MODE_PREF = "RETENO_DEBUG_MODE";

  private static volatile RetenoPlugin activeInstance;

  private CallbackContext notificationPermissionCallback;
  private CallbackContext appInboxMessagesCountCallback;
  private RetenoResultCallback<Integer> appInboxMessagesCountListener;
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
          initialize(args, callbackContext);
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

    if ("updateDefaultNotificationChannel".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          try {
            updateDefaultNotificationChannel(args, callbackContext);
          } catch (Exception e) {
            callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
          }
        }
      });
      return true;
    }

    if ("getAppInboxMessages".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          try {
            getAppInboxMessages(args, callbackContext);
          } catch (Exception e) {
            callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
          }
        }
      });
      return true;
    }

    if ("getAppInboxMessagesCount".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          try {
            getAppInboxMessagesCount(callbackContext);
          } catch (Exception e) {
            callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
          }
        }
      });
      return true;
    }

    if ("subscribeOnMessagesCountChanged".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          try {
            subscribeOnMessagesCountChanged(callbackContext);
          } catch (Exception e) {
            callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
          }
        }
      });
      return true;
    }

    if ("unsubscribeMessagesCountChanged".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          try {
            unsubscribeMessagesCountChanged(callbackContext);
          } catch (Exception e) {
            callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
          }
        }
      });
      return true;
    }

    if ("markAsOpened".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          try {
            markAsOpened(args, callbackContext);
          } catch (Exception e) {
            callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
          }
        }
      });
      return true;
    }

    if ("markAllMessagesAsOpened".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          try {
            markAllMessagesAsOpened(callbackContext);
          } catch (Exception e) {
            callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
          }
        }
      });
      return true;
    }

    if ("getRecommendations".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          try {
            getRecommendations(args, callbackContext);
          } catch (Exception e) {
            callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
          }
        }
      });
      return true;
    }

    if ("logRecommendations".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          try {
            logRecommendations(args, callbackContext);
          } catch (Exception e) {
            callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
          }
        }
      });
      return true;
    }

    if ("pauseInAppMessages".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          try {
            pauseInAppMessages(args, callbackContext);
          } catch (Exception e) {
            callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
          }
        }
      });
      return true;
    }

    if ("setInAppMessagesPauseBehaviour".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          try {
            setInAppMessagesPauseBehaviour(args, callbackContext);
          } catch (Exception e) {
            callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
          }
        }
      });
      return true;
    }

    if ("setInAppLifecycleCallback".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          try {
            setInAppLifecycleCallback(args, callbackContext);
          } catch (Exception e) {
            callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
          }
        }
      });
      return true;
    }

    return false;
  }

  private void initialize(JSONArray args, CallbackContext callbackContext) {
    if (initialized) {
      callbackContext.success(1);
      return;
    }

    try {
      JSONObject options = null;
      if (args != null && args.length() > 0) {
        Object arg0 = args.opt(0);
        if (arg0 instanceof JSONArray) {
          arg0 = ((JSONArray) arg0).opt(0);
        }
        if (arg0 instanceof JSONObject) {
          options = (JSONObject) arg0;
        }
      }

      String accessKey = readAccessKeyFromOptions(options);
      if (TextUtils.isEmpty(accessKey)) {
        accessKey = readAccessKeyFromManifest();
      }
      if (TextUtils.isEmpty(accessKey)) {
        callbackContext.error(
          "Missing SDK_ACCESS_KEY. Provide it when installing the Cordova plugin " +
          "(e.g. --variable SDK_ACCESS_KEY=YOUR_KEY), pass it to retenosdk.init({accessKey: ...}), " +
          "or set AndroidManifest meta-data 'com.reteno.SDK_ACCESS_KEY'."
        );
        return;
      }

      Boolean debugOverride = readBooleanFromOptions(options, "debugMode", "debug");
      boolean debugMode = debugOverride != null ? debugOverride.booleanValue() : readDebugModeEnabled();

      boolean pauseInAppMessages = options != null && options.optBoolean("pauseInAppMessages", false);
      boolean pausePushInAppMessages = options != null && options.optBoolean("pausePushInAppMessages", false);

      RetenoConfig.Builder builder = new RetenoConfig.Builder()
        .accessKey(accessKey)
        .setDebug(debugMode);

      if (pauseInAppMessages) {
        builder.pauseInAppMessages(true);
      }
      if (pausePushInAppMessages) {
        builder.pausePushInAppMessages(true);
      }

      if (options != null && options.has("lifecycleTrackingOptions")) {
        LifecycleTrackingOptions lto = parseLifecycleTrackingOption(options.opt("lifecycleTrackingOptions"));
        if (lto != null) {
          builder.lifecycleTrackingOptions(lto);
        }
      }

      // Ensure AndroidX Startup initializer has created the Reteno instance.
      // We intentionally do not short-circuit initialization just because getInstance() is non-null;
      // the SDK still needs to receive config (access key/debug/etc.).
      Reteno existing = safeGetRetenoInstance();
      if (existing == null) {
        callbackContext.error(
          "Reteno SDK instance is not available yet. Ensure AndroidX Startup is enabled and " +
          "call retenosdk.init(...) after deviceready / Activity.onCreate()."
        );
        return;
      }

      Reteno.initWithConfig(builder.build());

      // Defensive: verify instance is still available after applying config.
      if (safeGetRetenoInstance() == null) {
        callbackContext.error("Reteno SDK initialization failed: instance is not available.");
        return;
      }

      initialized = true;
      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private String readAccessKeyFromOptions(JSONObject options) {
    if (options == null) {
      return null;
    }
    String[] keys = new String[] {"accessKey", "access_key", "sdkAccessKey", "SDK_ACCESS_KEY"};
    for (String keyName : keys) {
      String raw = options.optString(keyName, null);
      String normalized = normalizeAccessKey(raw);
      if (!TextUtils.isEmpty(normalized)) {
        return normalized;
      }
    }
    return null;
  }

  private Boolean readBooleanFromOptions(JSONObject options, String... keys) {
    if (options == null || keys == null) {
      return null;
    }
    for (String key : keys) {
      if (key == null || !options.has(key)) {
        continue;
      }
      Object raw = options.opt(key);
      if (raw == null || raw == JSONObject.NULL) {
        continue;
      }
      if (raw instanceof Boolean) {
        return (Boolean) raw;
      }
      if (raw instanceof Number) {
        return ((Number) raw).intValue() != 0;
      }
      if (raw instanceof String) {
        return parseBooleanLenient((String) raw, null);
      }
      return parseBooleanLenient(String.valueOf(raw), null);
    }
    return null;
  }

  private void pauseInAppMessages(JSONArray args, CallbackContext callbackContext) {
    boolean isPaused = false;
    if (args != null && args.length() > 0) {
      Object arg0 = args.opt(0);
      if (arg0 instanceof Boolean) {
        isPaused = (Boolean) arg0;
      } else if (arg0 instanceof JSONObject) {
        isPaused = ((JSONObject) arg0).optBoolean("isPaused", false);
      } else if (arg0 instanceof JSONArray) {
        isPaused = ((JSONArray) arg0).optBoolean(0, false);
      }
    }

    try {
      Reteno reteno = getRetenoInstanceOrThrow();
      reteno.pauseInAppMessages(isPaused);
      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void setInAppMessagesPauseBehaviour(JSONArray args, CallbackContext callbackContext) {
    String behaviour = null;
    if (args != null && args.length() > 0) {
      Object arg0 = args.opt(0);
      if (arg0 instanceof String) {
        behaviour = (String) arg0;
      } else if (arg0 instanceof JSONObject) {
        behaviour = ((JSONObject) arg0).optString("behaviour", null);
      } else if (arg0 instanceof JSONArray) {
        behaviour = ((JSONArray) arg0).optString(0, null);
      }
    }

    if (behaviour == null || behaviour.trim().isEmpty()) {
      callbackContext.error("Missing argument: behaviour ('SKIP_IN_APPS' or 'POSTPONE_IN_APPS')");
      return;
    }

    InAppPauseBehaviour parsedBehaviour;
    String normalized = behaviour.trim().toUpperCase();
    if ("SKIP_IN_APPS".equals(normalized)) {
      parsedBehaviour = InAppPauseBehaviour.SKIP_IN_APPS;
    } else if ("POSTPONE_IN_APPS".equals(normalized)) {
      parsedBehaviour = InAppPauseBehaviour.POSTPONE_IN_APPS;
    } else {
      callbackContext.error("Invalid argument: behaviour must be 'SKIP_IN_APPS' or 'POSTPONE_IN_APPS'");
      return;
    }

    try {
      Reteno reteno = getRetenoInstanceOrThrow();
      reteno.setInAppMessagesPauseBehaviour(parsedBehaviour);
      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void setInAppLifecycleCallback(JSONArray args, CallbackContext callbackContext) {
    try {
      Reteno reteno = getRetenoInstanceOrThrow();
      if (args != null && args.length() > 0) {
        Object arg0 = args.opt(0);
        if (arg0 == null || arg0 == JSONObject.NULL) {
          reteno.setInAppLifecycleCallback(null);
          callbackContext.success(1);
          return;
        }
      }
      reteno.setInAppLifecycleCallback(new InAppLifecycleCallback() {
        @Override
        public void beforeDisplay(@NonNull InAppData inAppData) {
          emitInAppLifecycleEvent("beforeDisplay", inAppDataToJson(inAppData));
        }

        @Override
        public void onDisplay(@NonNull InAppData inAppData) {
          emitInAppLifecycleEvent("onDisplay", inAppDataToJson(inAppData));
        }

        @Override
        public void beforeClose(@NonNull InAppCloseData closeData) {
          emitInAppLifecycleEvent("beforeClose", inAppCloseDataToJson(closeData));
        }

        @Override
        public void afterClose(@NonNull InAppCloseData closeData) {
          emitInAppLifecycleEvent("afterClose", inAppCloseDataToJson(closeData));
        }

        @Override
        public void onError(@NonNull InAppErrorData errorData) {
          emitInAppLifecycleEvent("onError", inAppErrorDataToJson(errorData));
        }
      });
      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void emitInAppLifecycleEvent(String event, JSONObject data) {
    try {
      JSONObject payload = new JSONObject();
      payload.put("event", event);
      payload.put("data", data != null ? data : new JSONObject());
      emitJsEvent("reteno-in-app-lifecycle", payload);
    } catch (Exception ignored) {
      // ignore
    }
  }

  private JSONObject inAppDataToJson(InAppData inAppData) {
    try {
      JSONObject json = new JSONObject();
      json.put("id", inAppData.getId());
      return json;
    } catch (Exception e) {
      return new JSONObject();
    }
  }

  private JSONObject inAppCloseDataToJson(InAppCloseData closeData) {
    try {
      JSONObject json = new JSONObject();
      json.put("id", closeData.getId());
      json.put("closeAction", closeData.getCloseAction());
      return json;
    } catch (Exception e) {
      return new JSONObject();
    }
  }

  private JSONObject inAppErrorDataToJson(InAppErrorData errorData) {
    try {
      JSONObject json = new JSONObject();
      json.put("id", errorData.getId());
      json.put("errorMessage", errorData.getErrorMessage());
      return json;
    } catch (Exception e) {
      return new JSONObject();
    }
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

    return parseLifecycleTrackingOption(arg0);
  }

  private LifecycleTrackingOptions parseLifecycleTrackingOption(Object value) {
    if (value == null) {
      return null;
    }

    if (value instanceof String) {
      String str = ((String) value).trim();
      if ("ALL".equalsIgnoreCase(str)) {
        return new LifecycleTrackingOptions(true, true, true);
      }
      if ("NONE".equalsIgnoreCase(str)) {
        return new LifecycleTrackingOptions(false, false, false);
      }
      return null;
    }

    if (value instanceof JSONObject) {
      JSONObject payload = (JSONObject) value;
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

    initialNotification = RetenoUtil.bundleToJson(extras);
  }

  private String readAccessKeyFromManifest() {
    Activity activity = this.cordova.getActivity();
    Context context = activity != null ? activity.getApplicationContext() : null;
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
    if (key.length() == 0 || "$SDK_ACCESS_KEY".equals(key) || "MISSING".equals(key)) {
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

  private void updateDefaultNotificationChannel(JSONArray args, CallbackContext callbackContext) throws JSONException {
    if (args == null || args.length() == 0) {
      callbackContext.error("Missing argument: notification channel config");
      return;
    }

    Object arg0 = args.opt(0);
    if (arg0 instanceof JSONArray) {
      arg0 = ((JSONArray) arg0).opt(0);
    }

    if (!(arg0 instanceof JSONObject)) {
      callbackContext.error("Invalid argument: expected an object with name and description");
      return;
    }

    JSONObject config = (JSONObject) arg0;
    String name = config.optString("name", null);
    String description = config.optString("description", null);

    if (name != null) {
      name = name.trim();
    }
    if (description != null) {
      description = description.trim();
    }

    if (TextUtils.isEmpty(name)) {
      callbackContext.error("Missing argument: name");
      return;
    }
    if (TextUtils.isEmpty(description)) {
      callbackContext.error("Missing argument: description");
      return;
    }

    try {
      RetenoNotifications.updateDefaultNotificationChannel(name, description);
      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void getAppInboxMessages(JSONArray args, CallbackContext callbackContext) throws JSONException {
    if (args == null || args.length() == 0) {
      callbackContext.error("Missing argument: payload");
      return;
    }

    Object arg0 = args.opt(0);
    if (arg0 instanceof JSONArray) {
      arg0 = ((JSONArray) arg0).opt(0);
    }

    if (!(arg0 instanceof JSONObject)) {
      callbackContext.error("Invalid argument: expected an object payload");
      return;
    }

    JSONObject payload = (JSONObject) arg0;
    Object rawPage = payload.opt("page");
    Object rawPageSize = payload.opt("pageSize");

    if (!payload.has("page") || rawPage == JSONObject.NULL) {
      callbackContext.error("Missing argument: page");
      return;
    }
    if (!payload.has("pageSize") || rawPageSize == JSONObject.NULL) {
      callbackContext.error("Missing argument: pageSize");
      return;
    }

    Integer page = parseIntegerLenient(rawPage);
    Integer pageSize = parseIntegerLenient(rawPageSize);

    if (page == null) {
      callbackContext.error("Invalid argument: page");
      return;
    }
    if (pageSize == null) {
      callbackContext.error("Invalid argument: pageSize");
      return;
    }

    AppInboxStatus status = null;
    if (payload.has("status") && payload.opt("status") != JSONObject.NULL) {
      status = parseAppInboxStatus(payload.opt("status"));
      if (status == null) {
        callbackContext.error("Invalid argument: status");
        return;
      }
    }

    try {
      Reteno reteno = getRetenoInstanceOrThrow();
      reteno.getAppInbox().getAppInboxMessages(
        page,
        pageSize,
        status,
        new RetenoResultCallback<AppInboxMessages>() {
          @Override
          public void onSuccess(AppInboxMessages messages) {
            try {
              JSONObject result = appInboxMessagesToJson(messages);
              callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, result));
            } catch (Exception e) {
              callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
            }
          }

          @Override
          public void onFailure(Integer code, String message, Throwable throwable) {
            StringBuilder sb = new StringBuilder("Reteno Android SDK Error");
            if (message != null && message.length() > 0) {
              sb.append(": ").append(message);
            } else if (throwable != null && throwable.getLocalizedMessage() != null) {
              sb.append(": ").append(throwable.getLocalizedMessage());
            }
            if (code != null) {
              sb.append(" (code ").append(code).append(")");
            }
            callbackContext.error(sb.toString());
          }
        }
      );
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void getAppInboxMessagesCount(CallbackContext callbackContext) {
    try {
      Reteno reteno = getRetenoInstanceOrThrow();
      reteno.getAppInbox().getAppInboxMessagesCount(new RetenoResultCallback<Integer>() {
        @Override
        public void onSuccess(Integer count) {
          if (count == null) {
            callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, 0));
            return;
          }
          callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, count.intValue()));
        }

        @Override
        public void onFailure(Integer code, String message, Throwable throwable) {
          StringBuilder sb = new StringBuilder("Reteno Android SDK Error");
          if (message != null && message.length() > 0) {
            sb.append(": ").append(message);
          } else if (throwable != null && throwable.getLocalizedMessage() != null) {
            sb.append(": ").append(throwable.getLocalizedMessage());
          }
          if (code != null) {
            sb.append(" (code ").append(code).append(")");
          }
          callbackContext.error(sb.toString());
        }
      });
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void subscribeOnMessagesCountChanged(CallbackContext callbackContext) {
    try {
      Reteno reteno = getRetenoInstanceOrThrow();
      if (appInboxMessagesCountListener != null) {
        try {
          reteno.getAppInbox().unsubscribeMessagesCountChanged(appInboxMessagesCountListener);
        } catch (Exception ignored) {
          // ignore
        }
      }

      appInboxMessagesCountCallback = callbackContext;
      appInboxMessagesCountListener = new RetenoResultCallback<Integer>() {
        @Override
        public void onSuccess(Integer count) {
          CallbackContext cb = appInboxMessagesCountCallback;
          if (cb == null) {
            return;
          }
          int safeCount = count == null ? 0 : count.intValue();
          PluginResult result = new PluginResult(PluginResult.Status.OK, safeCount);
          result.setKeepCallback(true);
          cb.sendPluginResult(result);
        }

        @Override
        public void onFailure(Integer code, String message, Throwable throwable) {
          CallbackContext cb = appInboxMessagesCountCallback;
          if (cb == null) {
            return;
          }
          StringBuilder sb = new StringBuilder("Reteno Android SDK Error");
          if (message != null && message.length() > 0) {
            sb.append(": ").append(message);
          } else if (throwable != null && throwable.getLocalizedMessage() != null) {
            sb.append(": ").append(throwable.getLocalizedMessage());
          }
          if (code != null) {
            sb.append(" (code ").append(code).append(")");
          }
          cb.error(sb.toString());
        }
      };

      reteno.getAppInbox().subscribeOnMessagesCountChanged(appInboxMessagesCountListener);
      PluginResult result = new PluginResult(PluginResult.Status.NO_RESULT);
      result.setKeepCallback(true);
      callbackContext.sendPluginResult(result);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void unsubscribeMessagesCountChanged(CallbackContext callbackContext) {
    try {
      Reteno reteno = getRetenoInstanceOrThrow();
      if (appInboxMessagesCountListener != null) {
        reteno.getAppInbox().unsubscribeMessagesCountChanged(appInboxMessagesCountListener);
      }
      appInboxMessagesCountListener = null;
      appInboxMessagesCountCallback = null;
      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void markAsOpened(JSONArray args, CallbackContext callbackContext) throws JSONException {
    String messageId = null;
    if (args != null && args.length() > 0) {
      Object arg0 = args.opt(0);
      if (arg0 instanceof String) {
        messageId = (String) arg0;
      } else if (arg0 instanceof JSONObject) {
        messageId = ((JSONObject) arg0).optString("messageId", null);
        if (TextUtils.isEmpty(messageId)) {
          messageId = ((JSONObject) arg0).optString("id", null);
        }
      } else if (arg0 instanceof JSONArray) {
        messageId = ((JSONArray) arg0).optString(0, null);
      }
    }

    if (messageId != null) {
      messageId = messageId.trim();
    }
    if (TextUtils.isEmpty(messageId)) {
      callbackContext.error("Missing argument: messageId");
      return;
    }

    try {
      Reteno reteno = getRetenoInstanceOrThrow();
      reteno.getAppInbox().markAsOpened(messageId);
      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void markAllMessagesAsOpened(CallbackContext callbackContext) {
    try {
      Reteno reteno = getRetenoInstanceOrThrow();
      reteno.getAppInbox().markAllMessagesAsOpened(new RetenoResultCallback<kotlin.Unit>() {
        @Override
        public void onSuccess(kotlin.Unit unit) {
          callbackContext.success(1);
        }

        @Override
        public void onFailure(Integer code, String message, Throwable throwable) {
          StringBuilder sb = new StringBuilder("Reteno Android SDK Error");
          if (message != null && message.length() > 0) {
            sb.append(": ").append(message);
          } else if (throwable != null && throwable.getLocalizedMessage() != null) {
            sb.append(": ").append(throwable.getLocalizedMessage());
          }
          if (code != null) {
            sb.append(" (code ").append(code).append(")");
          }
          callbackContext.error(sb.toString());
        }
      });
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void getRecommendations(JSONArray args, CallbackContext callbackContext) throws JSONException {
    if (args == null || args.length() == 0) {
      callbackContext.error("Missing argument: payload");
      return;
    }

    Object arg0 = args.opt(0);
    if (arg0 instanceof JSONArray) {
      arg0 = ((JSONArray) arg0).opt(0);
    }

    if (!(arg0 instanceof JSONObject)) {
      callbackContext.error("Invalid argument: expected an object payload");
      return;
    }

    JSONObject payload = (JSONObject) arg0;
    String recomVariantId = payload.optString("recomVariantId", null);
    if (recomVariantId != null) {
      recomVariantId = recomVariantId.trim();
    }
    if (TextUtils.isEmpty(recomVariantId)) {
      callbackContext.error("Missing argument: recomVariantId");
      return;
    }

    List<String> productIds = null;
    if (payload.has("productIds") && payload.opt("productIds") != JSONObject.NULL) {
      productIds = parseStringList(payload.opt("productIds"));
      if (productIds == null) {
        callbackContext.error("Invalid argument: productIds");
        return;
      }
      if (productIds.isEmpty()) {
        callbackContext.error("Invalid argument: productIds");
        return;
      }
    }

    String categoryId = null;
    if (payload.has("categoryId") && payload.opt("categoryId") != JSONObject.NULL) {
      categoryId = payload.optString("categoryId", null);
      if (categoryId != null) {
        categoryId = categoryId.trim();
      }
      if (TextUtils.isEmpty(categoryId)) {
        callbackContext.error("Invalid argument: categoryId");
        return;
      }
    }

    List<String> fields = null;
    if (payload.has("fields") && payload.opt("fields") != JSONObject.NULL) {
      fields = parseStringList(payload.opt("fields"));
      if (fields == null) {
        callbackContext.error("Invalid argument: fields");
        return;
      }
    }

    List<RecomFilter> filters = null;
    if (payload.has("filters") && payload.opt("filters") != JSONObject.NULL) {
      RecomFilter filter = parseRecomFilter(payload.opt("filters"));
      if (filter == null) {
        callbackContext.error("Invalid argument: filters");
        return;
      }
      filters = new ArrayList<>();
      filters.add(filter);
    }

    RecomRequest request = new RecomRequest(productIds, categoryId, fields, filters);

    try {
      Reteno reteno = getRetenoInstanceOrThrow();
      reteno.getRecommendation().fetchRecommendation(
        recomVariantId,
        request,
        RecomBase.class,
        new GetRecommendationResponseCallback<RecomBase>() {
          @Override
          public void onSuccess(Recoms<RecomBase> recoms) {
            try {
              JSONObject result = new JSONObject(new Gson().toJson(recoms));
              callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, result));
            } catch (Exception e) {
              callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
            }
          }

          @Override
          public void onSuccessFallbackToJson(String json) {
            if (json == null || json.length() == 0) {
              callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, new JSONObject()));
              return;
            }
            try {
              JSONObject result = new JSONObject(json);
              callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, result));
            } catch (Exception e) {
              callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, json));
            }
          }

          @Override
          public void onFailure(Integer code, String message, Throwable throwable) {
            StringBuilder sb = new StringBuilder("Reteno Android SDK Error");
            if (message != null && message.length() > 0) {
              sb.append(": ").append(message);
            } else if (throwable != null && throwable.getLocalizedMessage() != null) {
              sb.append(": ").append(throwable.getLocalizedMessage());
            }
            if (code != null) {
              sb.append(" (code ").append(code).append(")");
            }
            callbackContext.error(sb.toString());
          }
        }
      );
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void logRecommendations(JSONArray args, CallbackContext callbackContext) throws JSONException {
    if (args == null || args.length() == 0) {
      callbackContext.error("Missing argument: payload");
      return;
    }

    Object arg0 = args.opt(0);
    if (arg0 instanceof JSONArray) {
      arg0 = ((JSONArray) arg0).opt(0);
    }

    if (!(arg0 instanceof JSONObject)) {
      callbackContext.error("Invalid argument: expected an object payload");
      return;
    }

    JSONObject payload = (JSONObject) arg0;
    String recomVariantId = payload.optString("recomVariantId", null);
    if (recomVariantId != null) {
      recomVariantId = recomVariantId.trim();
    }
    if (TextUtils.isEmpty(recomVariantId)) {
      callbackContext.error("Missing argument: recomVariantId");
      return;
    }

    Object rawEvents = payload.opt("recomEvents");
    if (rawEvents == null || rawEvents == JSONObject.NULL) {
      callbackContext.error("Missing argument: recomEvents");
      return;
    }

    List<RecomEvent> events = parseRecomEvents(rawEvents);
    if (events == null || events.isEmpty()) {
      callbackContext.error("Invalid argument: recomEvents");
      return;
    }

    try {
      Reteno reteno = getRetenoInstanceOrThrow();
      reteno.getRecommendation().logRecommendations(new RecomEvents(recomVariantId, events));
      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private List<String> parseStringList(Object raw) {
    if (raw == null || raw == JSONObject.NULL) {
      return null;
    }
    List<String> list = new ArrayList<>();
    if (raw instanceof JSONArray) {
      JSONArray arr = (JSONArray) raw;
      for (int i = 0; i < arr.length(); i++) {
        String value = arr.optString(i, null);
        if (value != null) {
          value = value.trim();
        }
        if (!TextUtils.isEmpty(value)) {
          list.add(value);
        }
      }
    } else if (raw instanceof String) {
      String value = ((String) raw).trim();
      if (!TextUtils.isEmpty(value)) {
        list.add(value);
      }
    } else {
      return null;
    }
    return list;
  }

  private RecomFilter parseRecomFilter(Object raw) throws JSONException {
    if (raw == null || raw == JSONObject.NULL) {
      return null;
    }
    if (raw instanceof JSONArray) {
      raw = ((JSONArray) raw).opt(0);
    }
    if (!(raw instanceof JSONObject)) {
      return null;
    }
    JSONObject filterJson = (JSONObject) raw;
    String name = filterJson.optString("name", null);
    if (name != null) {
      name = name.trim();
    }
    if (TextUtils.isEmpty(name)) {
      return null;
    }
    List<String> values = parseStringList(filterJson.opt("values"));
    if (values == null || values.isEmpty()) {
      return null;
    }
    return new RecomFilter(name, values);
  }

  private List<RecomEvent> parseRecomEvents(Object raw) throws JSONException {
    if (raw == null || raw == JSONObject.NULL) {
      return null;
    }
    if (raw instanceof JSONArray) {
      JSONArray array = (JSONArray) raw;
      List<RecomEvent> events = new ArrayList<>();
      for (int i = 0; i < array.length(); i++) {
        Object item = array.opt(i);
        if (!(item instanceof JSONObject)) {
          return null;
        }
        JSONObject eventJson = (JSONObject) item;
        RecomEventType type = parseRecomEventType(eventJson.opt("recomEventType"));
        if (type == null) {
          return null;
        }
        ZonedDateTime occurred = parseZonedDateTime(eventJson.opt("occurred"));
        if (occurred == null) {
          return null;
        }
        String productId = eventJson.optString("productId", null);
        if (productId != null) {
          productId = productId.trim();
        }
        if (TextUtils.isEmpty(productId)) {
          return null;
        }
        events.add(new RecomEvent(type, occurred, productId));
      }
      return events;
    }
    return null;
  }

  private RecomEventType parseRecomEventType(Object raw) {
    if (!(raw instanceof String)) {
      return null;
    }
    String value = ((String) raw).trim();
    if (value.length() == 0) {
      return null;
    }
    try {
      return RecomEventType.valueOf(value.toUpperCase());
    } catch (IllegalArgumentException ignored) {
      return null;
    }
  }

  private ZonedDateTime parseZonedDateTime(Object raw) {
    if (raw == null || raw == JSONObject.NULL) {
      return null;
    }
    if (raw instanceof Number) {
      long epochMillis = ((Number) raw).longValue();
      return ZonedDateTime.ofInstant(Instant.ofEpochMilli(epochMillis), ZoneOffset.UTC);
    }
    if (raw instanceof String) {
      String value = ((String) raw).trim();
      if (value.length() == 0) {
        return null;
      }
      try {
        return ZonedDateTime.parse(value);
      } catch (DateTimeParseException ignored) {
        try {
          return ZonedDateTime.ofInstant(Instant.parse(value), ZoneOffset.UTC);
        } catch (DateTimeParseException ignored2) {
          return null;
        }
      }
    }
    return null;
  }

  private Integer parseIntegerLenient(Object raw) {
    if (raw instanceof Number) {
      return ((Number) raw).intValue();
    }
    if (raw instanceof String) {
      String s = ((String) raw).trim();
      if (s.length() == 0) {
        return null;
      }
      try {
        return Integer.valueOf(s);
      } catch (NumberFormatException ignored) {
        return null;
      }
    }
    return null;
  }

  private AppInboxStatus parseAppInboxStatus(Object raw) {
    if (!(raw instanceof String)) {
      return null;
    }
    String value = ((String) raw).trim();
    if (value.length() == 0) {
      return null;
    }
    for (AppInboxStatus status : AppInboxStatus.values()) {
      if (status.getStr().equalsIgnoreCase(value) || status.name().equalsIgnoreCase(value)) {
        return status;
      }
    }
    return null;
  }

  private JSONObject appInboxMessagesToJson(AppInboxMessages messages) throws JSONException {
    JSONObject json = new JSONObject();
    JSONArray list = new JSONArray();
    if (messages != null) {
      List<AppInboxMessage> messageList = messages.getMessages();
      if (messageList != null) {
        for (AppInboxMessage message : messageList) {
          list.put(appInboxMessageToJson(message));
        }
      }
      json.put("totalPages", messages.getTotalPages());
    } else {
      json.put("totalPages", 0);
    }
    json.put("messages", list);
    return json;
  }

  private JSONObject appInboxMessageToJson(AppInboxMessage message) throws JSONException {
    JSONObject json = new JSONObject();
    if (message == null) {
      return json;
    }

    putString(json, "id", message.getId());
    putString(json, "title", message.getTitle());
    putString(json, "createdDate", message.getCreatedDate());
    json.put("isNewMessage", message.isNewMessage());
    putString(json, "content", message.getContent());
    putString(json, "imageUrl", message.getImageUrl());
    putString(json, "linkUrl", message.getLinkUrl());
    putString(json, "category", message.getCategory());

    AppInboxStatus status = message.getStatus();
    json.put("status", status != null ? status.getStr() : JSONObject.NULL);

    Map<String, String> customData = message.getCustomData();
    if (customData == null) {
      json.put("customData", JSONObject.NULL);
    } else {
      JSONObject customJson = new JSONObject();
      for (Map.Entry<String, String> entry : customData.entrySet()) {
        String key = entry.getKey();
        String value = entry.getValue();
        if (key != null) {
          customJson.put(key, value != null ? value : JSONObject.NULL);
        }
      }
      json.put("customData", customJson);
    }

    return json;
  }

  private void putString(JSONObject json, String key, String value) throws JSONException {
    json.put(key, value != null ? value : JSONObject.NULL);
  }

  private Reteno safeGetRetenoInstance() {
    try {
      return Reteno.getInstance();
    } catch (Exception ignored) {
      return null;
    }
  }

  private Reteno getRetenoInstanceOrThrow() {
    Reteno reteno = safeGetRetenoInstance();
    if (reteno != null) {
      return reteno;
    }

    throw new IllegalStateException(
      "Reteno SDK is not initialized. Ensure AndroidX Startup initializer is enabled and call retenosdk.init(...) " +
      "after deviceready before using the plugin."
    );
  }
}
