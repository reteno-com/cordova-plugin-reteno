var exec = require('cordova/exec');
var channel = require('cordova/channel');
var urlutil = require('cordova/urlutil');

var PLUGIN_NAME = 'RetenoPlugin';

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
        exec(success, error, PLUGIN_NAME, 'initialize', []);
        return;
      }

      var options = arg0 || {};
      exec(success, error, PLUGIN_NAME, 'initialize', [options]);
    },

    /* arg0:
            eventName: string,
            date: string,
            // date parameter should be in ISO8601 format
            parameters: CustomEventParameter[],
            forcePush?: boolean
          */
    logEvent: function (arg0, success, error) {
      exec(success, error, PLUGIN_NAME, 'logEvent', [arg0]);
    },

    /*
        payload: SetUserAttributesPayload
        */
    setUserAttributes: function (arg0, success, error) {
      var payload = arg0 && arg0[0];
      if (
        !payload.externalUserId ||
        (payload.externalUserId && payload.externalUserId.length === 0)
      ) {
        throw new Error('Missing argument: "externalUserId"');
      }
      exec(success, error, PLUGIN_NAME, 'setUserAttributes', [arg0]);
    },

    getInitialNotification: function (arg0, success, error) {
      exec(success, error, PLUGIN_NAME, 'getInitialNotification', [arg0]);
    },

    setOnRetenoPushReceivedListener: function (reteno, listener) {
      reteno.addEventListener('reteno-push-received', listener);
    },
    /*
        deviceToken: string
        */
    setDeviceToken: function (arg0, success, error) {
      exec(success, error, PLUGIN_NAME, 'setDeviceToken', [arg0]);
    },

    requestNotificationPermission: function (success, error) {
      exec(success, error, PLUGIN_NAME, 'requestNotificationPermission', []);
    },
  };

  module.exports = RetenoPluginFunctions;
})();
