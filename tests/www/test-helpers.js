function requireFreshPlugin() {
  jest.resetModules();
  // Re-register the mock after module reset.
  jest.doMock('cordova/exec', () =>
    jest.fn((success, _error, _plugin, _action, _args) => {
      if (typeof success === 'function') success(1);
    })
  );
  return require('../../www/cordova-plugin-reteno');
}

function setupPlugin(platformId) {
  const plugin = requireFreshPlugin();
  global.cordova = { platformId: platformId || 'android' };
  return plugin;
}

function teardownPlugin() {
  delete global.cordova;
  jest.restoreAllMocks();
}

module.exports = {
  requireFreshPlugin,
  setupPlugin,
  teardownPlugin,
};
