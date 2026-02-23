var exec = require('cordova/exec');
var channel = require('cordova/channel');
var urlutil = require('cordova/urlutil');

var PLUGIN_NAME = 'RetenoPlugin';

var __retenoState = {
  initialized: false,
  initPromise: null,
  pendingInitOptions: {},
};

function __isFn(f) {
  return typeof f === 'function';
}

function __isIosPlatform() {
  return typeof cordova !== 'undefined' && cordova && cordova.platformId === 'ios';
}

function __promiseExec(action, args) {
  return new Promise(function (resolve, reject) {
    exec(resolve, reject, PLUGIN_NAME, action, args);
  });
}

function __callWithExec(action, args, success, error) {
  var p = __promiseExec(action, args);
  if (__isFn(success) || __isFn(error)) {
    p.then(function (res) {
      if (__isFn(success)) success(res);
      return res;
    }).catch(function (err) {
      if (__isFn(error)) error(err);
      throw err;
    });
  }
  return p;
}

function __ensureInit(options) {
  if (__retenoState.initialized) {
    return Promise.resolve(1);
  }

  if (__retenoState.initPromise) {
    return __retenoState.initPromise;
  }

  var pendingOptions = __retenoState.pendingInitOptions || {};
  var opts = Object.assign({}, pendingOptions, options || {});
  __retenoState.initPromise = __promiseExec('initialize', [opts])
    .then(function (res) {
      __retenoState.initialized = true;
      __retenoState.initPromise = null;
      __retenoState.pendingInitOptions = {};
      return res;
    })
    .catch(function (err) {
      __retenoState.initialized = false;
      __retenoState.initPromise = null;
      throw err;
    });

  return __retenoState.initPromise;
}

function __callWithAutoInit(action, args, success, error) {
  var p = __ensureInit().then(function () {
    return __promiseExec(action, args);
  });
  if (__isFn(success) || __isFn(error)) {
    p.then(function (res) {
      if (__isFn(success)) success(res);
      return res;
    }).catch(function (err) {
      if (__isFn(error)) error(err);
      throw err;
    });
  }
  return p;
}

(function RetenoPlugin() {
  this.channels = {
    beforeload: channel.create('beforeload'),
    loadstart: channel.create('loadstart'),
    loadstop: channel.create('loadstop'),
    loaderror: channel.create('loaderror'),
    exit: channel.create('exit'),
    customscheme: channel.create('customscheme'),
    message: channel.create('message'),
  };

  RetenoPlugin.prototype = {
    _eventHandler: function (event) {
      if (event && event.type in this.channels) {
        if (event.type === 'beforeload') {
          this.channels[event.type].fire(event, this._loadAfterBeforeload);
        } else {
          this.channels[event.type].fire(event);
        }
      }
    },
    _loadAfterBeforeload: function (strUrl) {
      strUrl = urlutil.makeAbsolute(strUrl);
      return __callWithExec('loadAfterBeforeload', [strUrl]);
    },
    close: function (eventname) {
      return __callWithExec('close', []);
    },
    show: function (eventname) {
      return __callWithExec('show', []);
    },
    hide: function (eventname) {
      return __callWithExec('hide', []);
    },
    addEventListener: function (eventname, f) {
      if (eventname in this.channels) {
        this.channels[eventname].subscribe(f);
      }
    },
    removeEventListener: function (eventname, f) {
      if (eventname in this.channels) {
        this.channels[eventname].unsubscribe(f);
      }
    },
  };

  var RetenoPluginFunctions = {
    init: function (arg0, success, error) {
      // Back-compat: init(success, error)
      if (typeof arg0 === 'function') {
        error = success;
        success = arg0;
        arg0 = {};
      }

      var options = arg0 || {};
      var p = __ensureInit(options);
      if (__isFn(success) || __isFn(error)) {
        p.then(function (res) {
          if (__isFn(success)) success(res);
          return res;
        }).catch(function (err) {
          if (__isFn(error)) error(err);
          throw err;
        });
      }
      return p;
    },

    /* arg0:
            eventName: string,
            date: string,
            // date parameter should be in ISO8601 format
            parameters: CustomEventParameter[],
            forcePush?: boolean
          */
    logEvent: function (arg0, success, error) {
      return __callWithAutoInit('logEvent', [arg0], success, error);
    },

    /*
        payload: LogEcommerceEventPayload
        See https://docs.reteno.com/reference/android-ecommerce-activity-tracking
        */
    logEcommerceEvent: function (arg0, success, error) {
      // Accept either `payload` or legacy `[payload]`.
      var payload = Array.isArray(arg0) ? arg0[0] : arg0;
      if (!payload || typeof payload !== 'object') {
        return Promise.reject(new Error('Missing argument: payload'));
      }
      if (!payload.eventType || typeof payload.eventType !== 'string' || payload.eventType.trim().length === 0) {
        return Promise.reject(new Error('Missing argument: eventType'));
      }
      return __callWithAutoInit('logEcommerceEvent', [payload], success, error);
    },

    /*
        payload: SetUserAttributesPayload
        */
    setUserAttributes: function (arg0, success, error) {
      // Accept either `payload` or legacy `[payload]`.
      var payload = Array.isArray(arg0) ? arg0[0] : arg0;
      if (
        !payload ||
        !payload.externalUserId ||
        (payload.externalUserId && payload.externalUserId.length === 0)
      ) {
        return Promise.reject(new Error('Missing argument: "externalUserId"'));
      }
      return __callWithAutoInit('setUserAttributes', [payload], success, error);
    },

    /*
        payload: UserAttributesAnonymous
        */
    setAnonymousUserAttributes: function (arg0, success, error) {
      // Accept either `payload` or legacy `[payload]`.
      var payload = Array.isArray(arg0) ? arg0[0] : arg0;
      if (!payload || typeof payload !== 'object') {
        return Promise.reject(new Error('Missing argument: payload'));
      }

      // Reteno docs: anonymous user attributes cannot include phone/email.
      if (payload.phone || payload.email) {
        return Promise.reject(
          new Error(
            'Anonymous user attributes cannot include phone/email. Use setUserAttributes(externalUserId, user) instead.'
          )
        );
      }
      if (
        payload.userAttributes &&
        (payload.userAttributes.phone || payload.userAttributes.email)
      ) {
        return Promise.reject(
          new Error(
            'Anonymous user attributes cannot include phone/email. Use setUserAttributes(externalUserId, user) instead.'
          )
        );
      }
      return __callWithAutoInit('setAnonymousUserAttributes', [payload], success, error);
    },

    /*
        payload: SetMultiAccountUserAttributesPayload
        */
    setMultiAccountUserAttributes: function (arg0, success, error) {
      // Accept either `payload` or legacy `[payload]`.
      var payload = Array.isArray(arg0) ? arg0[0] : arg0;
      if (
        !payload ||
        !payload.externalUserId ||
        (payload.externalUserId && payload.externalUserId.length === 0)
      ) {
        return Promise.reject(new Error('Missing argument: "externalUserId"'));
      }
      if (!payload.user || typeof payload.user !== 'object') {
        return Promise.reject(new Error('Missing argument: "user"'));
      }
      return __callWithAutoInit('setMultiAccountUserAttributes', [payload], success, error);
    },

    getInitialNotification: function (arg0, success, error) {
      // Allowed before init (used on cold start).
      return __callWithExec('getInitialNotification', [arg0], success, error);
    },

    setOnRetenoPushReceivedListener: function (arg0, arg1) {
      // Back-compat:
      // - setOnRetenoPushReceivedListener(listener)
      // - setOnRetenoPushReceivedListener(reteno, listener) (legacy)
      var listener = typeof arg0 === 'function' ? arg0 : arg1;
      if (typeof listener !== 'function') return;
      document.addEventListener('reteno-push-received', listener);
    },

    setOnRetenoNotificationClickedListener: function (arg0, arg1) {
      // Back-compat:
      // - setOnRetenoNotificationClickedListener(listener)
      // - setOnRetenoNotificationClickedListener(reteno, listener) (legacy)
      var listener = typeof arg0 === 'function' ? arg0 : arg1;
      if (typeof listener !== 'function') return;
      document.addEventListener('reteno-notification-clicked', listener);
    },

    removeOnRetenoPushReceivedListener: function (listener) {
      if (typeof listener !== 'function') return;
      document.removeEventListener('reteno-push-received', listener);
    },

    removeOnRetenoNotificationClickedListener: function (listener) {
      if (typeof listener !== 'function') return;
      document.removeEventListener('reteno-notification-clicked', listener);
    },

    setOnInAppMessageCustomDataReceivedListener: function (arg0, arg1) {
      // Back-compat:
      // - setOnInAppMessageCustomDataReceivedListener(listener)
      // - setOnInAppMessageCustomDataReceivedListener(reteno, listener) (legacy)
      var listener = typeof arg0 === 'function' ? arg0 : arg1;
      if (typeof listener !== 'function') return;
      document.addEventListener('reteno-in-app-custom-data', listener);
    },

    removeOnInAppMessageCustomDataReceivedListener: function (arg0, arg1) {
      var listener = typeof arg0 === 'function' ? arg0 : arg1;
      if (typeof listener !== 'function') return;
      document.removeEventListener('reteno-in-app-custom-data', listener);
    },

    setOnInAppLifecycleCallback: function (arg0, arg1) {
      var listener = typeof arg0 === 'function' ? arg0 : arg1;
      if (listener === null) {
        return __callWithAutoInit('setInAppLifecycleCallback', [null]);
      }
      if (typeof listener !== 'function') return;
      document.addEventListener('reteno-in-app-lifecycle', listener);
      return __callWithAutoInit('setInAppLifecycleCallback', []);
    },

    /*
        deviceToken: string
        */
    setDeviceToken: function (arg0, success, error) {
      return __callWithAutoInit('setDeviceToken', [arg0], success, error);
    },

    /*
        options: LifecycleTrackingOptions
        */
    setLifecycleTrackingOptions: function (arg0, success, error) {
      // Accept either `options` or legacy `[options]`.
      var options = Array.isArray(arg0) ? arg0[0] : arg0;
      if (!options) {
        return Promise.reject(new Error('Missing argument: options'));
      }

      if (__isIosPlatform()) {
        var p;
        if (__retenoState.initialized || __retenoState.initPromise) {
          p = Promise.reject(
            new Error('iOS supports lifecycleTrackingOptions only during init(...) before SDK initialization.')
          );
        } else {
          __retenoState.pendingInitOptions = Object.assign({}, __retenoState.pendingInitOptions, {
            lifecycleTrackingOptions: options,
          });
          p = Promise.resolve(1);
        }

        if (__isFn(success) || __isFn(error)) {
          p.then(function (res) {
            if (__isFn(success)) success(res);
            return res;
          }).catch(function (err) {
            if (__isFn(error)) error(err);
            throw err;
          });
        }
        return p;
      }

      return __callWithAutoInit('setLifecycleTrackingOptions', [options], success, error);
    },

    /*
        screenName: string
        */
    logScreenView: function (arg0, success, error) {
      if (!arg0) {
        return Promise.reject(new Error('Missing argument: screenName'));
      }
      return __callWithAutoInit('logScreenView', [arg0], success, error);
    },

    forcePushData: function (success, error) {
      if (__isIosPlatform()) {
        return __callWithAutoInit(
          'logEvent',
          [
            {
              eventName: '__cordova_force_push_data__',
              parameters: [],
              forcePush: true,
            },
          ],
          success,
          error
        );
      }
      return __callWithAutoInit('forcePushData', [], success, error);
    },

    /*
        isPaused: boolean
        */
    pauseInAppMessages: function (arg0, success, error) {
      var isPaused = !!arg0;
      return __callWithAutoInit('pauseInAppMessages', [isPaused], success, error);
    },

    /*
        behaviour: 'SKIP_IN_APPS' | 'POSTPONE_IN_APPS'
        */
    setInAppMessagesPauseBehaviour: function (arg0, success, error) {
      if (!arg0 || typeof arg0 !== 'string') {
        return Promise.reject(new Error("Missing argument: behaviour ('SKIP_IN_APPS' or 'POSTPONE_IN_APPS')"));
      }
      return __callWithAutoInit('setInAppMessagesPauseBehaviour', [arg0], success, error);
    },

    requestNotificationPermission: function (success, error) {
      // If Reteno isn't initialized yet, permission can still be requested,
      // but Reteno's internal status update will fail until init().
      return __callWithExec('requestNotificationPermission', [], success, error);
    },

    /*
        options: string[] | { options?: string[], presentationOptions?: string[], emitEvent?: boolean }
        Passing null removes the handler.
        Supported options: "badge", "sound", "alert", "banner", "list"
        If emitEvent is true, the plugin will emit "reteno-push-received".
        */
    setWillPresentNotificationOptions: function (arg0, success, error) {
      return __callWithExec('setWillPresentNotificationOptions', [arg0], success, error);
    },

    /*
        payload: boolean | { enabled?: boolean, emitEvent?: boolean }
        If emitEvent is true, the plugin will emit "reteno-notification-clicked".
        Passing false or null removes the handler.
        */
    setDidReceiveNotificationResponseHandler: function (arg0, success, error) {
      return __callWithExec('setDidReceiveNotificationResponseHandler', [arg0], success, error);
    },

    /*
        config: NotificationChannelConfig
        {
          name: string,
          description: string
        }
        */
    updateDefaultNotificationChannel: function (arg0, success, error) {
      // Accept either `config` or legacy `[config]`.
      var config = Array.isArray(arg0) ? arg0[0] : arg0;
      if (!config || typeof config !== 'object') {
        return Promise.reject(new Error('Missing argument: config'));
      }
      if (!config.name || typeof config.name !== 'string' || config.name.trim().length === 0) {
        return Promise.reject(new Error('Missing argument: name'));
      }
      if (!config.description || typeof config.description !== 'string' || config.description.trim().length === 0) {
        return Promise.reject(new Error('Missing argument: description'));
      }
      return __callWithAutoInit('updateDefaultNotificationChannel', [config], success, error);
    },

    /*
        payload: GetAppInboxMessagesPayload
        {
          page: number,
          pageSize: number,
          status?: 'OPENED' | 'UNOPENED'
        }
        */
    getAppInboxMessages: function (arg0, success, error) {
      // Accept either `payload` or legacy `[payload]`.
      var payload = Array.isArray(arg0) ? arg0[0] : arg0;
      if (!payload || typeof payload !== 'object') {
        return Promise.reject(new Error('Missing argument: payload'));
      }
      if (payload.page == null) {
        return Promise.reject(new Error('Missing argument: page'));
      }
      if (payload.pageSize == null) {
        return Promise.reject(new Error('Missing argument: pageSize'));
      }
      return __callWithAutoInit('getAppInboxMessages', [payload], success, error);
    },

    getAppInboxMessagesCount: function (success, error) {
      return __callWithAutoInit('getAppInboxMessagesCount', [], success, error);
    },

    subscribeOnMessagesCountChanged: function (arg0, arg1) {
      var success = typeof arg0 === 'function' ? arg0 : arg1;
      var error = typeof arg0 === 'function' ? arg1 : undefined;
      return __ensureInit().then(function () {
        exec(success, error, PLUGIN_NAME, 'subscribeOnMessagesCountChanged', []);
        return 1;
      });
    },

    unsubscribeMessagesCountChanged: function (success, error) {
      return __callWithAutoInit('unsubscribeMessagesCountChanged', [], success, error);
    },

    /*
        messageId: string
        */
    markAsOpened: function (arg0, success, error) {
      // Accept either `messageId` or legacy `[messageId]`.
      var messageId = Array.isArray(arg0) ? arg0[0] : arg0;
      if (!messageId || typeof messageId !== 'string' || messageId.trim().length === 0) {
        return Promise.reject(new Error('Missing argument: messageId'));
      }
      return __callWithAutoInit('markAsOpened', [messageId], success, error);
    },

    markAllMessagesAsOpened: function (success, error) {
      return __callWithAutoInit('markAllMessagesAsOpened', [], success, error);
    },

    /*
        payload: GetRecommendationsPayload
        */
    getRecommendations: function (arg0, success, error) {
      // Accept either `payload` or legacy `[payload]`.
      var payload = Array.isArray(arg0) ? arg0[0] : arg0;
      if (!payload || typeof payload !== 'object') {
        return Promise.reject(new Error('Missing argument: payload'));
      }
      if (
        !payload.recomVariantId ||
        typeof payload.recomVariantId !== 'string' ||
        payload.recomVariantId.trim().length === 0
      ) {
        return Promise.reject(new Error('Missing argument: recomVariantId'));
      }
      return __callWithAutoInit('getRecommendations', [payload], success, error);
    },

    /*
        payload: LogRecommendationsPayload
        */
    logRecommendations: function (arg0, success, error) {
      // Accept either `payload` or legacy `[payload]`.
      var payload = Array.isArray(arg0) ? arg0[0] : arg0;
      if (!payload || typeof payload !== 'object') {
        return Promise.reject(new Error('Missing argument: payload'));
      }
      if (
        !payload.recomVariantId ||
        typeof payload.recomVariantId !== 'string' ||
        payload.recomVariantId.trim().length === 0
      ) {
        return Promise.reject(new Error('Missing argument: recomVariantId'));
      }
      if (!Array.isArray(payload.recomEvents) || payload.recomEvents.length === 0) {
        return Promise.reject(new Error('Missing argument: recomEvents'));
      }
      return __callWithAutoInit('logRecommendations', [payload], success, error);
    },
  };

  module.exports = RetenoPluginFunctions;
})();
