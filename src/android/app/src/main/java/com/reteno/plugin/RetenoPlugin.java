package com.reteno.plugin;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;

import android.app.Application;
import android.content.pm.PackageManager;
import android.content.pm.ApplicationInfo;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.text.TextUtils;
import android.widget.Toast;

import java.lang.reflect.Field;
import java.lang.reflect.Method;

import com.google.gson.Gson;
import com.reteno.core.RetenoApplication;
import com.reteno.core.domain.model.user.User;

public class RetenoPlugin extends CordovaPlugin {
  private static final int REQ_CODE_POST_NOTIFICATIONS = 10001;
  private static final String PERMISSION_POST_NOTIFICATIONS = "android.permission.POST_NOTIFICATIONS";
  private static final String SDK_ACCESS_KEY_META = "com.reteno.SDK_ACCESS_KEY";

  private CallbackContext notificationPermissionCallback;

  private JSONObject pendingInitOptions;

  private JSONObject initialNotification;

  private static volatile RetenoPlugin activeInstance;

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
      // Fallback for older engines.
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
  public boolean execute(
    String action, JSONArray args, CallbackContext callbackContext
  ) throws JSONException {

    if ("initialize".equals(action)) {
      // Save optional initialization options (first argument).
      pendingInitOptions = (args != null && args.length() > 0) ? args.optJSONObject(0) : null;
      initialize(callbackContext);
      return true;
    }

    if ("logEvent".equals(action)){
      logEvent(args, callbackContext);
      return true;
    }
    if ("setUserAttributes".equals(action)){
      echo(action + "\n" + args.toString(), callbackContext);

      RetenoUserAttributes.SetUserAttributesParsed parsed =
        RetenoUserAttributes.parseSetUserAttributesArgs(args);
      if (!parsed.isOk()) {
        callbackContext.error(parsed.error);
        return true;
      }

      setUserAttributes(parsed.externalUserId, parsed.user, callbackContext);
      return true;
    }

    if ("setAnonymousUserAttributes".equals(action)) {
      echo(action + "\n" + args.toString(), callbackContext);

      RetenoUserAttributes.ParsedPayload parsed =
        RetenoUserAttributes.parseAnonymousUserAttributesArgs(args);
      if (!parsed.isOk()) {
        callbackContext.error(parsed.error);
        return true;
      }

      setAnonymousUserAttributes(parsed.payload, callbackContext);
      return true;
    }
    if ("getInitialNotification".equals(action)){
      getInitialNotification(callbackContext);
      return true;
    }
    if ("setDeviceToken".equals(action)){
      echo(action + "\n" + args.toString(), callbackContext);

      setDeviceToken(args, callbackContext);
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

    try {
      // If host app already provides Reteno, accept it as initialized.
      if (tryGetRetenoFromApplication() != null || tryGetRetenoFromSingleton() != null) {
        initialized = true;
        callbackContext.success(1);
        return;
      }

      String accessKey = readAccessKeyFromManifest();
      if (TextUtils.isEmpty(accessKey)) {
        callbackContext.error("Missing SDK_ACCESS_KEY. Reinstall plugin with --variable SDK_ACCESS_KEY=YOUR_KEY");
        return;
      }

      initRetenoWithConfig(accessKey, pendingInitOptions);
      pendingInitOptions = null;

      if (tryGetRetenoFromSingleton() == null && tryGetRetenoFromApplication() == null) {
        callbackContext.error("Reteno SDK initialization failed: instance is not available.");
        return;
      }

      initialized = true;
      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void requestNotificationPermission(CallbackContext callbackContext) {
    // Runtime notification permission exists only on Android 13+ (API 33).
    if (Build.VERSION.SDK_INT < 33) {
      callbackContext.success(1);
      return;
    }

    if (cordova.hasPermission(PERMISSION_POST_NOTIFICATIONS)) {
      if (!updateRetenoPushPermissionStatus(callbackContext)) {
        return;
      }
      callbackContext.success(1);
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

    boolean granted = grantResults != null && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
    CallbackContext cb = notificationPermissionCallback;
    notificationPermissionCallback = null;
    if (cb == null) {
      return;
    }

    if (granted) {
      if (!updateRetenoPushPermissionStatus(cb)) {
        return;
      }
      cb.success(1);
    } else {
      cb.success(0);
    }
  }

  private boolean updateRetenoPushPermissionStatus(CallbackContext callbackContext) {
    try {
      Object reteno = getRetenoInstanceOrThrow();
      Method update = reteno.getClass().getMethod("updatePushPermissionStatus");
      update.invoke(reteno);
      return true;
    } catch (Exception e) {
      if (callbackContext != null) {
        callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
      }
      return false;
    }
  }

  private void logEvent(JSONArray args, CallbackContext callbackContext) {
    if (args == null || args.length() == 0) {
      callbackContext.error("Empty event!");
    } else {
      try {
        Object reteno = getRetenoInstanceOrThrow();
        Object event = RetenoEvent.buildEventFromPayload(args.getJSONObject(0));

        Method logEvent = null;
        for (Method m : reteno.getClass().getMethods()) {
          if (!"logEvent".equals(m.getName())) {
            continue;
          }
          Class<?>[] pts = m.getParameterTypes();
          if (pts.length == 1 && pts[0].isAssignableFrom(event.getClass())) {
            logEvent = m;
            break;
          }
        }

        if (logEvent == null) {
          throw new NoSuchMethodException("Reteno.logEvent(Event) method not found");
        }

        logEvent.invoke(reteno, event);
      } catch (Exception e) {
        callbackContext. error("Reteno Android SDK Error " + e.getLocalizedMessage());
        return;
      }
      callbackContext.success(1);
    }
  }

  public void setDeviceToken(JSONArray args, CallbackContext callbackContext) {
    try {
      // Ensure Reteno is initialized (consistent with other SDK calls).
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

      // Forward token to Reteno's internal FCM pipeline.
      // We use reflection to avoid hard compile-time coupling to optional modules.
      Context appContext = cordova.getActivity().getApplicationContext();
      Class<?> serviceClass = Class.forName("com.reteno.push.RetenoNotificationService");
      Object service = serviceClass.getConstructor(Context.class).newInstance(appContext);
      Method onNewToken = serviceClass.getMethod("onNewToken", String.class);
      onNewToken.invoke(service, deviceToken);

      callbackContext.success(1);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
    }
  }

  private void setAnonymousUserAttributes(JSONObject payload, CallbackContext callbackContext) {
    try {
      Object reteno = getRetenoInstanceOrThrow();

      Class<?> attrsClass = Class.forName("com.reteno.core.domain.model.user.UserAttributesAnonymous");
      Object attrs = new Gson().fromJson(payload.toString(), attrsClass);
      Method setAnonymousUserAttributes = reteno.getClass().getMethod("setAnonymousUserAttributes", attrsClass);
      setAnonymousUserAttributes.invoke(reteno, attrs);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
      return;
    }

    callbackContext.success(1);
  }

  public void setUserAttributes(String externalUserId, User user, CallbackContext callbackContext) throws JSONException {
    try {
      Object reteno = getRetenoInstanceOrThrow();
      Method setUserAttributes = reteno.getClass().getMethod("setUserAttributes", String.class, User.class);
      setUserAttributes.invoke(reteno, externalUserId, user);
    } catch (Exception e) {
      callbackContext.error("Reteno Android SDK Error: " + e.getLocalizedMessage());
      return;
    }
    callbackContext.success(1);
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
    JSONObject payload = initialNotification;
    initialNotification = null;

    if (payload == null) {
      // No initial notification captured.
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

    // Best-effort: capture all extras. Host apps can decide how to interpret/filter them.
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
        // Best-effort: skip keys that can't be serialized.
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

    // Fallback for Parcelables and other types.
    return value.toString();
  }

  private String readAccessKeyFromManifest() throws Exception {
    Context context = this.cordova.getActivity();
    if (context == null) {
      return null;
    }
    PackageManager pm = context.getPackageManager();
    ApplicationInfo info = pm.getApplicationInfo(context.getPackageName(), PackageManager.GET_META_DATA);
    if (info == null || info.metaData == null) {
      return null;
    }
    String key = info.metaData.getString(SDK_ACCESS_KEY_META);
    if (key == null) {
      return null;
    }
    key = key.trim();
    return key.length() == 0 ? null : key;
  }

  private void initRetenoWithConfig(String accessKey, JSONObject options) throws Exception {
    // Reteno 2.5.0+ initialization: Reteno.initWithConfig(RetenoConfig.Builder().accessKey(key).build())
    Class<?> retenoClass = Class.forName("com.reteno.core.Reteno");

    Class<?> builderClass = Class.forName("com.reteno.core.RetenoConfig$Builder");
    Object builder = builderClass.getDeclaredConstructor().newInstance();
    Method accessKeyMethod = builderClass.getMethod("accessKey", String.class);
    accessKeyMethod.invoke(builder, accessKey);

    // Optional parameters (best-effort, only applied when the SDK supports them).
    applyOptionalInitOptions(builderClass, builder, options);

    Method buildMethod = builderClass.getMethod("build");
    Object config = buildMethod.invoke(builder);

    Method init = null;
    for (Method m : retenoClass.getMethods()) {
      if ("initWithConfig".equals(m.getName()) && m.getParameterTypes().length == 1) {
        init = m;
        break;
      }
    }

    if (init != null) {
      try {
        init.invoke(null, config);
        return;
      } catch (Exception ignored) {
        // fall through
      }
    }

    // Kotlin object fallback: Reteno.INSTANCE.initWithConfig(config)
    Field instanceField = retenoClass.getField("INSTANCE");
    Object retenoObject = instanceField.get(null);
    if (init == null) {
      init = retenoObject.getClass().getMethod("initWithConfig", config.getClass());
    }
    init.invoke(retenoObject, config);
  }

  private void applyOptionalInitOptions(Class<?> builderClass, Object builder, JSONObject options) {
    if (options == null) {
      return;
    }

    // pauseInAppMessages(boolean)
    if (options.has("pauseInAppMessages")) {
      boolean value = options.optBoolean("pauseInAppMessages", false);
      invokeBuilderBooleanIfExists(builderClass, builder, "pauseInAppMessages", value);
    }

    // pausePushInAppMessages(boolean) OR pausePushInAppMessages()
    if (options.has("pausePushInAppMessages")) {
      boolean value = options.optBoolean("pausePushInAppMessages", false);
      if (!invokeBuilderBooleanIfExists(builderClass, builder, "pausePushInAppMessages", value) && value) {
        invokeBuilderNoArgIfExists(builderClass, builder, "pausePushInAppMessages");
      }
    }

    // lifecycleTrackingOptions(ALL|NONE|...)
    if (options.has("lifecycleTrackingOptions")) {
      String name = options.optString("lifecycleTrackingOptions", null);
      if (name != null) {
        name = name.trim();
      }
      if (name != null && name.length() > 0) {
        applyLifecycleTrackingOptions(builderClass, builder, name);
      }
    }
  }

  private boolean invokeBuilderBooleanIfExists(Class<?> builderClass, Object builder, String methodName, boolean value) {
    try {
      Method m = builderClass.getMethod(methodName, boolean.class);
      m.invoke(builder, value);
      return true;
    } catch (Exception ignored) {
      return false;
    }
  }

  private boolean invokeBuilderNoArgIfExists(Class<?> builderClass, Object builder, String methodName) {
    try {
      Method m = builderClass.getMethod(methodName);
      m.invoke(builder);
      return true;
    } catch (Exception ignored) {
      return false;
    }
  }

  private void applyLifecycleTrackingOptions(Class<?> builderClass, Object builder, String enumName) {
    // Class name may vary across SDK versions; try a small set of likely candidates.
    String[] candidates = new String[] {
      "com.reteno.core.domain.model.lifecycle.LifecycleTrackingOptions",
      "com.reteno.core.domain.model.app.lifecycle.LifecycleTrackingOptions",
      "com.reteno.core.domain.model.LifecycleTrackingOptions"
    };

    for (String className : candidates) {
      try {
        Class<?> enumClass = Class.forName(className);
        if (!enumClass.isEnum()) {
          continue;
        }

        @SuppressWarnings("unchecked")
        Class<? extends Enum> eClass = (Class<? extends Enum>) enumClass;
        Enum value = Enum.valueOf(eClass, enumName);

        Method m = builderClass.getMethod("lifecycleTrackingOptions", enumClass);
        m.invoke(builder, value);
        return;
      } catch (Exception ignored) {
        // try next candidate
      }
    }
  }

  private Object getRetenoInstanceOrThrow() throws Exception {
    Object appReteno = tryGetRetenoFromApplication();
    if (appReteno != null) {
      return appReteno;
    }

    Object singletonReteno = tryGetRetenoFromSingleton();
    if (singletonReteno != null) {
      return singletonReteno;
    }

    throw new IllegalStateException(
      "Reteno SDK is not initialized. Call retenosdk.initialize() before using the plugin."
    );
  }

  private Object tryGetRetenoFromApplication() {
    try {
      Activity activity = this.cordova.getActivity();
      if (activity == null) {
        return null;
      }
      Application application = activity.getApplication();
      if (application == null) {
        return null;
      }

      Class<?> retenoAppClass = Class.forName("com.reteno.core.RetenoApplication");
      if (!retenoAppClass.isInstance(application)) {
        return null;
      }
      Method getRetenoInstance = retenoAppClass.getMethod("getRetenoInstance");
      return getRetenoInstance.invoke(application);
    } catch (Exception ignored) {
      return null;
    }
  }

  private Object tryGetRetenoFromSingleton() {
    try {
      Class<?> retenoClass = Class.forName("com.reteno.core.Reteno");

      // Kotlin object: Reteno.INSTANCE.getInstance()
      Field objField = retenoClass.getField("INSTANCE");
      Object retenoObject = objField.get(null);
      try {
        Method getInstance = retenoObject.getClass().getMethod("getInstance");
        Object instance = getInstance.invoke(retenoObject);
        return instance;
      } catch (Exception ignored) {
        return null;
      }
    } catch (Exception ignored) {
      return null;
    }
  }

}