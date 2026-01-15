/*
 * Cordova hook: validate required plugin variables on install.
 */

module.exports = function (context) {
  const opts = (context && context.opts) || {};
  const path = require('path');
  const fs = require('fs');

  function resolveProjectRoot() {
    const candidates = [
      opts && opts.projectRoot,
      opts && opts.cordova && opts.cordova.project && opts.cordova.project.root,
      process.cwd(),
    ].filter(Boolean);

    for (const candidate of candidates) {
      try {
        const abs = path.isAbsolute(candidate)
          ? candidate
          : path.resolve(process.cwd(), candidate);
        const pkgPath = path.join(abs, 'package.json');
        if (fs.existsSync(pkgPath)) {
          return abs;
        }
      } catch (_) {
        // try next
      }
    }
    return null;
  }

  function readVarFromPackageJson(varName) {
    const projectRoot = resolveProjectRoot();
    if (!projectRoot) return undefined;

    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const pkg = require(path.join(projectRoot, 'package.json'));
      const pluginCfg =
        pkg &&
        pkg.cordova &&
        pkg.cordova.plugins &&
        pkg.cordova.plugins['cordova-plugin-reteno'];
      const val = pluginCfg ? pluginCfg[varName] : undefined;
      return val;
    } catch (_) {
      return undefined;
    }
  }

  function readVarFromCmdLine(varName) {
    const cmdLine = (context && context.cmdLine) ? String(context.cmdLine) : '';
    if (!cmdLine) return undefined;

    // Supports: --variable NAME=value
    // Also tolerates quotes around the whole NAME=value token.
    const re = new RegExp(`(?:^|\\s)--variable\\s+(["']?)${varName}=([^\\s"']+)\\1`);
    const m = cmdLine.match(re);
    return m ? m[2] : undefined;
  }

  // Cordova/plugman variants (cordova-lib has changed where it stores variables across versions)
  const variables =
    (opts.plugin && opts.plugin.variables) ||
    opts.cli_variables ||
    opts.variables ||
    opts.pluginVariables ||
    (opts.options && opts.options.plugin && opts.options.plugin.variables) ||
    (opts.options && opts.options.cli_variables) ||
    (opts.options && opts.options.options && opts.options.options.cli_variables) ||
    {};

  const accessKey =
    variables.SDK_ACCESS_KEY ||
    readVarFromCmdLine('SDK_ACCESS_KEY') ||
    readVarFromPackageJson('SDK_ACCESS_KEY') ||
    process.env.SDK_ACCESS_KEY;
  const accessKeyStr = accessKey == null ? '' : String(accessKey).trim();

  if (accessKeyStr.length === 0) {
    throw new Error(
      'cordova-plugin-reteno: SDK_ACCESS_KEY is required. Install with: ' +
        'cordova plugin add cordova-plugin-reteno --variable SDK_ACCESS_KEY=YOUR_KEY'
    );
  }
};
