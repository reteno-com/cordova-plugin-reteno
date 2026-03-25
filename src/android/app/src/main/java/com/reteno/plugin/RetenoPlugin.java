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
import com.reteno.core.domain.model.ecom.Attributes;
import com.reteno.core.domain.model.ecom.EcomEvent;
import com.reteno.core.domain.model.ecom.Order;
import com.reteno.core.domain.model.ecom.OrderItem;
import com.reteno.core.domain.model.ecom.OrderStatus;
import com.reteno.core.domain.model.ecom.ProductCategoryView;
import com.reteno.core.domain.model.ecom.ProductInCart;
import com.reteno.core.domain.model.ecom.ProductView;
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
import android.util.Pair;
import com.reteno.push.RetenoNotificationService;
import com.reteno.push.RetenoNotifications;
import com.reteno.push.events.InAppCustomData;
import com.reteno.core.util.Procedure;
import com.reteno.core.features.recommendation.GetRecommendationResponseCallback;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class RetenoPlugin extends CordovaPlugin {
  private static final int REQ_CODE_POST_NOTIFICATIONS = 10001;
  private static final String PERMISSION_POST_NOTIFICATIONS = "android.permission.POST_NOTIFICATIONS";
  private static final String SDK_ACCESS_KEY_META = "com.reteno.SDK_ACCESS_KEY";

  private static volatile RetenoPlugin activeInstance;

  private CallbackContext notificationPermissionCallback;
  private CallbackContext appInboxMessagesCountCallback;
  private RetenoResultCallback<Integer> appInboxMessagesCountListener;
  private JSONObject initialNotification;
  private volatile boolean initialized = false;

  private Procedure<Bundle> pushReceivedListener;
  private Procedure<Bundle> notificationClickedListener;
  private Procedure<InAppCustomData> inAppCustomDataListener;
  private Procedure<Bundle> pushDismissedListener;
  private Procedure<Bundle> customPushListener;
  private volatile boolean notificationListenersRegistered = false;

  @Override
  protected void pluginInitialize() {
    activeInstance = this;
    captureInitialNotificationFromIntent();
  }

  @Override
  public void onDestroy() {
    unregisterNotificationListeners();
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

  /**
   * If the bundle contains action button data (es_action_button == true),
   * emit a "reteno-push-button-clicked" event with structured payload
   * matching the iOS format: { actionId, link, customData, userInfo }.
   */
  public static void emitPushButtonClickedIfActionButton(Bundle bundle) {
    if (bundle == null) {
      return;
    }
    if (!bundle.getBoolean("es_action_button", false)) {
      return;
    }

    try {
      JSONObject payload = new JSONObject();

      String actionId = bundle.getString("es_btn_action_id");
      if (actionId != null) {
        payload.put("actionId", actionId);
      }

      String link = bundle.getString("es_btn_action_link_unwrapped");
      if (link == null) {
        link = bundle.getString("es_btn_action_link_wrapped");
      }
      if (link != null) {
        payload.put("link", link);
      }

      String customDataStr = bundle.getString("es_btn_action_custom_data");
      if (customDataStr != null && !customDataStr.isEmpty()) {
        try {
          payload.put("customData", new JSONObject(customDataStr));
        } catch (JSONException e) {
          payload.put("customData", customDataStr);
        }
      }

      payload.put("userInfo", RetenoUtil.bundleToJson(bundle));

      emitJsEvent("reteno-push-button-clicked", payload);
    } catch (Exception ignored) {
      // Best-effort serialization.
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

    if ("logEcommerceEvent".equals(action)) {
      cordova.getThreadPool().execute(new Runnable() {
        @Override
        public void run() {
          logEcommerceEvent(args, callbackContext);
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

    // On Android, action button clicks are automatically detected from the
    // notification-clicked bundle (es_action_button flag). No separate native
    // setup is required, so we simply acknowledge the call.
    if ("setNotificationActionHandler".equals(action)) {
      callbackContext.success(1);
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
          "(e.g. --variable SDK_ACCESS_KEY=YOUR_KEY), pass it to RetenoPlugin.init({accessKey: ...}), " +
          "or set AndroidManifest meta-data 'com.reteno.SDK_ACCESS_KEY'."
        );
        return;
      }

      boolean debugMode = options != null && options.optBoolean("isDebugMode", false);

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
          "call RetenoPlugin.init(...) after deviceready / Activity.onCreate()."
        );
        return;
      }

      Reteno.initWithConfig(builder.build());

      // Defensive: verify instance is still available after applying config.
      if (safeGetRetenoInstance() == null) {
        callbackContext.error("Reteno SDK initialization failed: instance is not available.");
        return;
      }

      registerNotificationListeners();
      initialized = true;
      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  /**
   * Register notification event listeners using the SDK 2.9.2 EventListener API.
   * Each listener is a direct {@link Procedure} implementation — no reflection needed.
   */
  private void registerNotificationListeners() {
    if (notificationListenersRegistered) {
      return;
    }
    notificationListenersRegistered = true;

    try {
      // Push received
      pushReceivedListener = new Procedure<Bundle>() {
        @Override public void execute(Bundle bundle) {
          emitJsEvent("reteno-push-received", RetenoUtil.bundleToJson(bundle));
        }
      };
      RetenoNotifications.getReceived().addListener(pushReceivedListener);

      // Notification clicked (+ action-button detection)
      notificationClickedListener = new Procedure<Bundle>() {
        @Override public void execute(Bundle bundle) {
          emitJsEvent("reteno-notification-clicked", RetenoUtil.bundleToJson(bundle));
          emitPushButtonClickedIfActionButton(bundle);
        }
      };
      RetenoNotifications.getClick().addListener(notificationClickedListener);

      // In-app custom data
      inAppCustomDataListener = new Procedure<InAppCustomData>() {
        @Override public void execute(InAppCustomData data) {
          emitInAppCustomDataEvent(data);
        }
      };
      RetenoNotifications.getInAppCustomDataReceived().addListener(inAppCustomDataListener);

      // Push dismissed / swiped
      pushDismissedListener = new Procedure<Bundle>() {
        @Override public void execute(Bundle bundle) {
          emitJsEvent("reteno-push-dismissed", RetenoUtil.bundleToJson(bundle));
        }
      };
      RetenoNotifications.getClose().addListener(pushDismissedListener);

      // Custom push received
      customPushListener = new Procedure<Bundle>() {
        @Override public void execute(Bundle bundle) {
          emitJsEvent("reteno-custom-push-received", RetenoUtil.bundleToJson(bundle));
        }
      };
      RetenoNotifications.getCustom().addListener(customPushListener);
    } catch (RuntimeException e) {
      unregisterNotificationListeners();
      throw e;
    }
  }

  private void unregisterNotificationListeners() {
    notificationListenersRegistered = false;

    pushReceivedListener = safeRemoveReceivedListener(pushReceivedListener);
    notificationClickedListener = safeRemoveClickListener(notificationClickedListener);
    inAppCustomDataListener = safeRemoveInAppCustomDataListener(inAppCustomDataListener);
    pushDismissedListener = safeRemoveCloseListener(pushDismissedListener);
    customPushListener = safeRemoveCustomListener(customPushListener);
  }

  private Procedure<Bundle> safeRemoveReceivedListener(Procedure<Bundle> listener) {
    if (listener != null) {
      try {
        RetenoNotifications.getReceived().removeListener(listener);
      } catch (Exception ignored) {
        // Best-effort cleanup.
      }
    }
    return null;
  }

  private Procedure<Bundle> safeRemoveClickListener(Procedure<Bundle> listener) {
    if (listener != null) {
      try {
        RetenoNotifications.getClick().removeListener(listener);
      } catch (Exception ignored) {
        // Best-effort cleanup.
      }
    }
    return null;
  }

  private Procedure<InAppCustomData> safeRemoveInAppCustomDataListener(Procedure<InAppCustomData> listener) {
    if (listener != null) {
      try {
        RetenoNotifications.getInAppCustomDataReceived().removeListener(listener);
      } catch (Exception ignored) {
        // Best-effort cleanup.
      }
    }
    return null;
  }

  private Procedure<Bundle> safeRemoveCloseListener(Procedure<Bundle> listener) {
    if (listener != null) {
      try {
        RetenoNotifications.getClose().removeListener(listener);
      } catch (Exception ignored) {
        // Best-effort cleanup.
      }
    }
    return null;
  }

  private Procedure<Bundle> safeRemoveCustomListener(Procedure<Bundle> listener) {
    if (listener != null) {
      try {
        RetenoNotifications.getCustom().removeListener(listener);
      } catch (Exception ignored) {
        // Best-effort cleanup.
      }
    }
    return null;
  }

  private void emitInAppCustomDataEvent(InAppCustomData payload) {
    if (payload == null) {
      return;
    }
    try {
      JSONObject json = new JSONObject();
      String url = payload.getUrl();
      if (url != null) {
        json.put("url", url);
      }
      json.put("inapp_source", payload.getSource());
      json.put("inapp_id", payload.getInAppId());

      Map<String, String> data = payload.getData();
      if (data != null && !data.isEmpty()) {
        JSONObject dataJson = new JSONObject();
        for (Map.Entry<String, String> entry : data.entrySet()) {
          dataJson.put(entry.getKey(), entry.getValue());
        }
        json.put("data", dataJson);
      }
      emitJsEvent("reteno-in-app-custom-data", json);
    } catch (Exception ignored) {
      // Best-effort serialization.
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

  private void logEcommerceEvent(JSONArray args, CallbackContext callbackContext) {
    if (args == null || args.length() == 0) {
      callbackContext.error("Missing argument: payload");
      return;
    }

    Object arg0 = args.opt(0);
    if (arg0 instanceof JSONArray) {
      arg0 = ((JSONArray) arg0).opt(0);
    }
    if (!(arg0 instanceof JSONObject)) {
      callbackContext.error("Invalid argument: payload");
      return;
    }

    try {
      EcomEvent ecomEvent = parseEcomEvent((JSONObject) arg0);
      Reteno reteno = getRetenoInstanceOrThrow();
      reteno.logEcommerceEvent(ecomEvent);
      callbackContext.success(1);
    } catch (IllegalArgumentException e) {
      callbackContext.error(e.getMessage());
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

  private EcomEvent parseEcomEvent(JSONObject payload) {
    String rawType = parseString(payload.opt("eventType"));
    if (rawType == null) {
      rawType = parseString(payload.opt("type"));
    }
    if (rawType == null) {
      throw new IllegalArgumentException("Missing argument: eventType");
    }
    String eventType = normalizeEcomEventType(rawType);
    ZonedDateTime occurred = parseZonedDateTime(payload.opt("occurred"));

    if ("productviewed".equals(eventType)) {
      ProductView product = parseProductView(payload.opt("product"));
      String currencyCode = parseString(payload.opt("currencyCode"));
      if (occurred != null) {
        return new EcomEvent.ProductViewed(product, currencyCode, occurred);
      }
      if (currencyCode != null) {
        return new EcomEvent.ProductViewed(product, currencyCode);
      }
      return new EcomEvent.ProductViewed(product);
    }

    if ("productcategoryviewed".equals(eventType)) {
      ProductCategoryView category = parseProductCategoryView(payload.opt("category"));
      if (occurred != null) {
        return new EcomEvent.ProductCategoryViewed(category, occurred);
      }
      return new EcomEvent.ProductCategoryViewed(category);
    }

    if ("productaddedtowishlist".equals(eventType)) {
      ProductView product = parseProductView(payload.opt("product"));
      String currencyCode = parseString(payload.opt("currencyCode"));
      if (occurred != null) {
        return new EcomEvent.ProductAddedToWishlist(product, currencyCode, occurred);
      }
      if (currencyCode != null) {
        return new EcomEvent.ProductAddedToWishlist(product, currencyCode);
      }
      return new EcomEvent.ProductAddedToWishlist(product);
    }

    if ("cartupdated".equals(eventType)) {
      String cartId = parseRequiredString(payload.opt("cartId"), "cartId");
      List<ProductInCart> products = parseProductInCartList(payload.opt("products"));
      if (products == null || products.isEmpty()) {
        throw new IllegalArgumentException("Missing argument: products");
      }
      String currencyCode = parseString(payload.opt("currencyCode"));
      if (occurred != null) {
        return new EcomEvent.CartUpdated(cartId, products, currencyCode, occurred);
      }
      if (currencyCode != null) {
        return new EcomEvent.CartUpdated(cartId, products, currencyCode);
      }
      return new EcomEvent.CartUpdated(cartId, products);
    }

    if ("ordercreated".equals(eventType)) {
      Order order = parseOrder(payload.opt("order"));
      String currencyCode = parseString(payload.opt("currencyCode"));
      if (occurred != null) {
        return new EcomEvent.OrderCreated(order, currencyCode, occurred);
      }
      if (currencyCode != null) {
        return new EcomEvent.OrderCreated(order, currencyCode);
      }
      return new EcomEvent.OrderCreated(order);
    }

    if ("orderupdated".equals(eventType)) {
      Order order = parseOrder(payload.opt("order"));
      String currencyCode = parseString(payload.opt("currencyCode"));
      if (occurred != null) {
        return new EcomEvent.OrderUpdated(order, currencyCode, occurred);
      }
      if (currencyCode != null) {
        return new EcomEvent.OrderUpdated(order, currencyCode);
      }
      return new EcomEvent.OrderUpdated(order);
    }

    if ("orderdelivered".equals(eventType)) {
      String externalOrderId = parseRequiredString(payload.opt("externalOrderId"), "externalOrderId");
      if (occurred != null) {
        return new EcomEvent.OrderDelivered(externalOrderId, occurred);
      }
      return new EcomEvent.OrderDelivered(externalOrderId);
    }

    if ("ordercancelled".equals(eventType)) {
      String externalOrderId = parseRequiredString(payload.opt("externalOrderId"), "externalOrderId");
      if (occurred != null) {
        return new EcomEvent.OrderCancelled(externalOrderId, occurred);
      }
      return new EcomEvent.OrderCancelled(externalOrderId);
    }

    if ("searchrequest".equals(eventType)) {
      String search = parseRequiredString(payload.opt("search"), "search");
      Boolean isFound = parseBooleanLenient(payload.opt("isFound"));
      if (isFound == null) {
        isFound = false;
      }
      if (occurred != null) {
        return new EcomEvent.SearchRequest(search, isFound.booleanValue(), occurred);
      }
      return new EcomEvent.SearchRequest(search, isFound.booleanValue());
    }

    throw new IllegalArgumentException("Invalid argument: eventType");
  }

  private String normalizeEcomEventType(String raw) {
    String s = raw.trim().toLowerCase(Locale.US);
    StringBuilder out = new StringBuilder();
    for (int i = 0; i < s.length(); i++) {
      char ch = s.charAt(i);
      if ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')) {
        out.append(ch);
      }
    }
    return out.toString();
  }

  private ProductCategoryView parseProductCategoryView(Object raw) {
    JSONObject obj = parseObject(raw, "category");
    String productCategoryId = parseRequiredString(obj.opt("productCategoryId"), "productCategoryId");
    List<Attributes> attributes = parseAttributesList(obj.opt("attributes"));
    return new ProductCategoryView(productCategoryId, attributes);
  }

  private ProductView parseProductView(Object raw) {
    JSONObject obj = parseObject(raw, "product");
    String productId = parseRequiredString(obj.opt("productId"), "productId");
    Double price = parseRequiredDouble(obj.opt("price"), "price");
    Boolean isInStock = parseBooleanLenient(obj.opt("isInStock"));
    if (isInStock == null) {
      throw new IllegalArgumentException("Missing argument: isInStock");
    }
    List<Attributes> attributes = parseAttributesList(obj.opt("attributes"));
    return new ProductView(productId, price.doubleValue(), isInStock.booleanValue(), attributes);
  }

  private ProductInCart parseProductInCart(Object raw) {
    JSONObject obj = parseObject(raw, "product");
    String productId = parseRequiredString(obj.opt("productId"), "productId");
    Integer quantity = parseIntegerLenient(obj.opt("quantity"));
    if (quantity == null) {
      throw new IllegalArgumentException("Missing argument: quantity");
    }
    Double price = parseRequiredDouble(obj.opt("price"), "price");
    Double discount = parseDoubleLenient(obj.opt("discount"));
    String name = parseString(obj.opt("name"));
    String category = parseString(obj.opt("category"));
    List<Attributes> attributes = parseAttributesList(obj.opt("attributes"));
    return new ProductInCart(productId, quantity.intValue(), price.doubleValue(), discount, name, category, attributes);
  }

  private List<ProductInCart> parseProductInCartList(Object raw) {
    if (!(raw instanceof JSONArray)) {
      return null;
    }
    JSONArray arr = (JSONArray) raw;
    List<ProductInCart> list = new ArrayList<>();
    for (int i = 0; i < arr.length(); i++) {
      Object item = arr.opt(i);
      list.add(parseProductInCart(item));
    }
    return list;
  }

  private OrderItem parseOrderItem(Object raw) {
    JSONObject obj = parseObject(raw, "orderItem");
    String externalItemId = parseRequiredString(obj.opt("externalItemId"), "externalItemId");
    String name = parseRequiredString(obj.opt("name"), "name");
    String category = parseRequiredString(obj.opt("category"), "category");
    Double quantity = parseRequiredDouble(obj.opt("quantity"), "quantity");
    Double cost = parseRequiredDouble(obj.opt("cost"), "cost");
    String url = parseRequiredString(obj.opt("url"), "url");
    String imageUrl = parseString(obj.opt("imageUrl"));
    String description = parseString(obj.opt("description"));
    return new OrderItem(externalItemId, name, category, quantity.doubleValue(), cost.doubleValue(), url, imageUrl, description);
  }

  private List<OrderItem> parseOrderItems(Object raw) {
    if (!(raw instanceof JSONArray)) {
      return null;
    }
    JSONArray arr = (JSONArray) raw;
    List<OrderItem> list = new ArrayList<>();
    for (int i = 0; i < arr.length(); i++) {
      Object item = arr.opt(i);
      list.add(parseOrderItem(item));
    }
    return list;
  }

  private Order parseOrder(Object raw) {
    JSONObject obj = parseObject(raw, "order");
    String externalOrderId = parseRequiredString(obj.opt("externalOrderId"), "externalOrderId");
    String externalCustomerId = parseString(obj.opt("externalCustomerId"));
    Double totalCost = parseRequiredDouble(obj.opt("totalCost"), "totalCost");
    OrderStatus status = parseOrderStatus(obj.opt("status"));
    if (status == null) {
      throw new IllegalArgumentException("Missing argument: status");
    }
    ZonedDateTime date = parseZonedDateTime(obj.opt("date"));
    if (date == null) {
      throw new IllegalArgumentException("Missing argument: date");
    }

    Order.Builder builder = new Order.Builder(
      externalOrderId,
      externalCustomerId,
      totalCost.doubleValue(),
      status,
      date
    );

    builder.setCartId(parseString(obj.opt("cartId")));
    builder.setEmail(parseString(obj.opt("email")));
    builder.setPhone(parseString(obj.opt("phone")));
    builder.setFirstName(parseString(obj.opt("firstName")));
    builder.setLastName(parseString(obj.opt("lastName")));
    builder.setShipping(parseDoubleLenient(obj.opt("shipping")));
    builder.setDiscount(parseDoubleLenient(obj.opt("discount")));
    builder.setTaxes(parseDoubleLenient(obj.opt("taxes")));
    builder.setRestoreUrl(parseString(obj.opt("restoreUrl")));
    builder.setStatusDescription(parseString(obj.opt("statusDescription")));
    builder.setStoreId(parseString(obj.opt("storeId")));
    builder.setSource(parseString(obj.opt("source")));
    builder.setDeliveryMethod(parseString(obj.opt("deliveryMethod")));
    builder.setPaymentMethod(parseString(obj.opt("paymentMethod")));
    builder.setDeliveryAddress(parseString(obj.opt("deliveryAddress")));
    builder.setItems(parseOrderItems(obj.opt("items")));
    builder.setAttributes(parseOrderAttributes(obj.opt("attributes")));

    return builder.build();
  }

  private OrderStatus parseOrderStatus(Object raw) {
    String value = parseString(raw);
    if (value == null) {
      return null;
    }
    try {
      return OrderStatus.valueOf(value.toUpperCase(Locale.US));
    } catch (IllegalArgumentException ignored) {
      return null;
    }
  }

  private List<Attributes> parseAttributesList(Object raw) {
    if (raw == null || raw == JSONObject.NULL) {
      return null;
    }
    if (!(raw instanceof JSONArray)) {
      throw new IllegalArgumentException("Invalid argument: attributes");
    }
    JSONArray arr = (JSONArray) raw;
    List<Attributes> list = new ArrayList<>();
    for (int i = 0; i < arr.length(); i++) {
      Object item = arr.opt(i);
      if (!(item instanceof JSONObject)) {
        throw new IllegalArgumentException("Invalid argument: attributes");
      }
      JSONObject obj = (JSONObject) item;
      String name = parseRequiredString(obj.opt("name"), "attributes.name");
      List<String> values = parseStringList(obj.opt("value"));
      if (values == null || values.isEmpty()) {
        throw new IllegalArgumentException("Missing argument: attributes.value");
      }
      list.add(new Attributes(name, values));
    }
    return list;
  }

  private List<Pair<String, String>> parseOrderAttributes(Object raw) {
    if (raw == null || raw == JSONObject.NULL) {
      return null;
    }
    List<Pair<String, String>> list = new ArrayList<>();
    if (raw instanceof JSONArray) {
      JSONArray arr = (JSONArray) raw;
      for (int i = 0; i < arr.length(); i++) {
        Object item = arr.opt(i);
        if (!(item instanceof JSONObject)) {
          throw new IllegalArgumentException("Invalid argument: attributes");
        }
        JSONObject obj = (JSONObject) item;
        String key = parseString(obj.opt("key"));
        if (key == null) {
          key = parseString(obj.opt("name"));
        }
        String value = parseString(obj.opt("value"));
        if (key == null || value == null) {
          throw new IllegalArgumentException("Invalid argument: attributes");
        }
        list.add(new Pair<>(key, value));
      }
      return list;
    }
    if (raw instanceof JSONObject) {
      JSONObject obj = (JSONObject) raw;
      Iterator<String> it = obj.keys();
      while (it.hasNext()) {
        String key = it.next();
        Object valueRaw = obj.opt(key);
        if (valueRaw == null || valueRaw == JSONObject.NULL) {
          continue;
        }
        String value;
        if (valueRaw instanceof String) {
          value = ((String) valueRaw).trim();
        } else {
          value = String.valueOf(valueRaw);
        }
        if (value.length() == 0) {
          continue;
        }
        list.add(new Pair<>(key, value));
      }
      return list;
    }
    throw new IllegalArgumentException("Invalid argument: attributes");
  }

  private JSONObject parseObject(Object raw, String fieldName) {
    if (raw instanceof JSONObject) {
      return (JSONObject) raw;
    }
    throw new IllegalArgumentException("Invalid argument: " + fieldName);
  }

  private String parseRequiredString(Object raw, String fieldName) {
    String value = parseString(raw);
    if (value == null) {
      throw new IllegalArgumentException("Missing argument: " + fieldName);
    }
    return value;
  }

  private Double parseRequiredDouble(Object raw, String fieldName) {
    Double value = parseDoubleLenient(raw);
    if (value == null) {
      throw new IllegalArgumentException("Missing argument: " + fieldName);
    }
    return value;
  }

  private String parseString(Object raw) {
    if (raw == null || raw == JSONObject.NULL) {
      return null;
    }
    if (raw instanceof String) {
      String value = ((String) raw).trim();
      if (value.length() == 0) {
        return null;
      }
      return value;
    }
    return null;
  }

  private Double parseDoubleLenient(Object raw) {
    if (raw instanceof Number) {
      return ((Number) raw).doubleValue();
    }
    if (raw instanceof String) {
      String s = ((String) raw).trim();
      if (s.length() == 0) {
        return null;
      }
      try {
        return Double.valueOf(s);
      } catch (NumberFormatException ignored) {
        return null;
      }
    }
    return null;
  }

  private Boolean parseBooleanLenient(Object raw) {
    if (raw instanceof Boolean) {
      return (Boolean) raw;
    }
    if (raw instanceof Number) {
      return ((Number) raw).intValue() != 0;
    }
    if (raw instanceof String) {
      return parseBooleanLenient((String) raw, null);
    }
    return null;
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
      "Reteno SDK is not initialized. Ensure AndroidX Startup initializer is enabled and call RetenoPlugin.init(...) " +
      "after deviceready before using the plugin."
    );
  }
}
