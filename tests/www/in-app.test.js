const { setupPlugin, teardownPlugin } = require('./test-helpers');

describe('cordova-plugin-reteno in-app', () => {
  let plugin;

  beforeEach(() => {
    plugin = setupPlugin('android');
  });

  afterEach(() => {
    teardownPlugin();
  });

  describe('pauseInAppMessages()', () => {
    it('should coerce truthy to true', async () => {
      const mockExec = require('cordova/exec');
      await plugin.pauseInAppMessages(1);
      const call = mockExec.mock.calls.find((c) => c[3] === 'pauseInAppMessages');
      expect(call[4][0]).toBe(true);
    });

    it('should coerce falsy to false', async () => {
      const mockExec = require('cordova/exec');
      await plugin.pauseInAppMessages(0);
      const call = mockExec.mock.calls.find((c) => c[3] === 'pauseInAppMessages');
      expect(call[4][0]).toBe(false);
    });
  });

  describe('setInAppMessagesPauseBehaviour()', () => {
    it('should reject when behaviour is missing', async () => {
      await expect(plugin.setInAppMessagesPauseBehaviour(null)).rejects.toThrow('Missing argument: behaviour');
    });

    it('should reject when behaviour is not a string', async () => {
      await expect(plugin.setInAppMessagesPauseBehaviour(123)).rejects.toThrow('Missing argument: behaviour');
    });

    it('should accept SKIP_IN_APPS', async () => {
      const result = await plugin.setInAppMessagesPauseBehaviour('SKIP_IN_APPS');
      expect(result).toBe(1);
    });

    it('should accept POSTPONE_IN_APPS', async () => {
      const result = await plugin.setInAppMessagesPauseBehaviour('POSTPONE_IN_APPS');
      expect(result).toBe(1);
    });
  });

  describe('setOnInAppLifecycleCallback()', () => {
    it('should register listener via document event', async () => {
      const addSpy = jest.spyOn(document, 'addEventListener');
      const fn = jest.fn();
      await plugin.setOnInAppLifecycleCallback(fn);
      expect(addSpy).toHaveBeenCalledWith('reteno-in-app-lifecycle', fn);
    });

    it('should call exec with null when passed null', async () => {
      const mockExec = require('cordova/exec');
      await plugin.setOnInAppLifecycleCallback(null);
      const call = mockExec.mock.calls.find((c) => c[3] === 'setInAppLifecycleCallback');
      expect(call).toBeTruthy();
      expect(call[4][0]).toBeNull();
    });

    it('should reject invalid argument', async () => {
      await expect(plugin.setOnInAppLifecycleCallback('invalid')).rejects.toThrow('expected a function or null');
    });
  });
});
