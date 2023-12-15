var exec = require("cordova/exec");

var PLUGIN_NAME = "RetenoPlugin";

var onApplicationDidBecomeActiveCallback = function () {};
var onApplicationDidEnterBackgroundCallback = function () {};

/***********************
 * Protected internals
 ***********************/
// iOS only
exports._applicationDidBecomeActive = function () {
    onApplicationDidBecomeActiveCallback();
};

exports._applicationDidEnterBackground = function () {
    onApplicationDidEnterBackgroundCallback();
};

/**
 * @deprecated this method of Reteno initialization is deprecated, becuase it led to incorrect initializations of native libraries,
 * please refer to new documentation https://docs.reteno.com/reference/cordova-sdk-setup, IOS and Android SDK Setup sections
 */
exports.setApiKey = function (arg0, success, error) {};

exports.logEvent = function (arg0, success, error) {
    exec(success, error, PLUGIN_NAME, "logEvent", [arg0]);
};

exports.setUserAttributes = function (arg0, success, error) {
    exec(success, error, PLUGIN_NAME, "setUserAttributes", [arg0]);
};

exports.setAnonymousUserAttributes = function (arg0, success, error) {
    exec(success, error, PLUGIN_NAME, "setAnonymousUserAttributes", [arg0]);
};

exports.getInitialNotification = function (arg0, success, error) {
    exec(success, error, PLUGIN_NAME, "getInitialNotification", [arg0]);
};

exports.performRemoteToken = function (arg0, success, error) {
    exec(success, error, PLUGIN_NAME, "performRemoteToken", [arg0]);
};

exports.setOnRetenoPushReceivedListener = function (success, error) {
    exec(success, error, PLUGIN_NAME, "setOnRetenoPushReceivedListener", []);
};

exports.setDeviceToken = function (arg0, success, error) {
    exec(success, error, PLUGIN_NAME, "setDeviceToken", [arg0]);
};
