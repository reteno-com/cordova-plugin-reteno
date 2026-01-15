var exec = require('cordova/exec');
var channel = require('cordova/channel');
var urlutil = require('cordova/urlutil');

var PLUGIN_NAME = 'RetenoPlugin';

var __retenoState = {
  initialized: false,
  initPromise: null,
};

function __isFn(f) {
  return typeof f === 'function';
}

function __promiseExec(action, args) {
  return new Promise(function (resolve, reject) {
    exec(resolve, reject, PLUGIN_NAME, action, args);
  });
}

function __ensureInit(options) {
  if (__retenoState.initialized) {
    return Promise.resolve(1);
  }

  if (__retenoState.initPromise) {
    return __retenoState.initPromise;
  }

  var opts = options || {};
  __retenoState.initPromise = __promiseExec('initialize', [opts])
    .then(function (res) {
      __retenoState.initialized = true;
      __retenoState.initPromise = null;
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
  var useCallbacks = __isFn(success) || __isFn(error);

  if (useCallbacks) {
    __ensureInit()
      .then(function () {
        exec(success, error, PLUGIN_NAME, action, args);
      })
      .catch(function (err) {
        if (__isFn(error)) error(err);
      });
    return;
  }

  return __ensureInit().then(function () {
    return __promiseExec(action, args);
  });
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
      exec(null, null, PLUGIN_NAME, 'loadAfterBeforeload', [strUrl]);
    },
    close: function (eventname) {
      exec(null, null, PLUGIN_NAME, 'close', []);
    },
    show: function (eventname) {
      exec(null, null, PLUGIN_NAME, 'show', []);
    },
    hide: function (eventname) {
      exec(null, null, PLUGIN_NAME, 'hide', []);
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
        return __ensureInit({})
          .then(function (res) {
            if (__isFn(success)) success(res);
            return res;
          })
          .catch(function (err) {
            if (__isFn(error)) error(err);
            throw err;
          });
      }

      var options = arg0 || {};
      var useCallbacks = __isFn(success) || __isFn(error);
      if (useCallbacks) {
        __ensureInit(options)
          .then(function (res) {
            if (__isFn(success)) success(res);
          })
          .catch(function (err) {
            if (__isFn(error)) error(err);
          });
        return;
      }
      return __ensureInit(options);
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
        throw new Error('Missing argument: "externalUserId"');
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
        throw new Error('Missing argument: payload');
      }

      // Reteno docs: anonymous user attributes cannot include phone/email.
      if (payload.phone || payload.email) {
        throw new Error(
          'Anonymous user attributes cannot include phone/email. Use setUserAttributes(externalUserId, user) instead.'
        );
      }
      if (
        payload.userAttributes &&
        (payload.userAttributes.phone || payload.userAttributes.email)
      ) {
        throw new Error(
          'Anonymous user attributes cannot include phone/email. Use setUserAttributes(externalUserId, user) instead.'
        );
      }
      return __callWithAutoInit('setAnonymousUserAttributes', [payload], success, error);
    },

    getInitialNotification: function (arg0, success, error) {
      // Allowed before init (used on cold start).
      exec(success, error, PLUGIN_NAME, 'getInitialNotification', [arg0]);
    },

    setOnRetenoPushReceivedListener: function (arg0, arg1) {
      // Back-compat:
      // - setOnRetenoPushReceivedListener(listener)
      // - setOnRetenoPushReceivedListener(reteno, listener) (legacy)
      var listener = typeof arg0 === 'function' ? arg0 : arg1;
      if (typeof listener !== 'function') return;
      document.addEventListener('reteno-push-received', listener);
    },
    /*
        deviceToken: string
        */
    setDeviceToken: function (arg0, success, error) {
      return __callWithAutoInit('setDeviceToken', [arg0], success, error);
    },

    requestNotificationPermission: function (success, error) {
      // If Reteno isn't initialized yet, permission can still be requested,
      // but Reteno's internal status update will fail until init().
      exec(success, error, PLUGIN_NAME, 'requestNotificationPermission', []);
    },
  };

  module.exports = RetenoPluginFunctions;
})();
