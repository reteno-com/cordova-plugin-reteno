/**
 * Mock for cordova/exec used by the plugin.
 * By default resolves successfully. Tests can override via mockImplementation.
 */
const exec = jest.fn((success, error, plugin, action, args) => {
  if (typeof success === 'function') success(1);
});

module.exports = exec;
