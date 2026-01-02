/*
 * Cordova hook: validate required plugin variables on install.
 */

module.exports = function (context) {
  const opts = (context && context.opts) || {};

  // Cordova/plugman variants
  const variables =
    (opts.plugin && opts.plugin.variables) ||
    opts.cli_variables ||
    (opts.options && opts.options.plugin && opts.options.plugin.variables) ||
    {};

  const accessKey = variables.SDK_ACCESS_KEY;
  const accessKeyStr = accessKey == null ? '' : String(accessKey).trim();

  if (accessKeyStr.length === 0) {
    throw new Error(
      'cordova-plugin-reteno: SDK_ACCESS_KEY is required. Install with: ' +
        'cordova plugin add cordova-plugin-reteno --variable SDK_ACCESS_KEY=YOUR_KEY'
    );
  }
};
