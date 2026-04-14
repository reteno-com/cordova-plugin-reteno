const { requireFreshPlugin, setupPlugin, teardownPlugin } = require('./test-helpers');

describe('cordova-plugin-reteno init', () => {
  let plugin;

  beforeEach(() => {
    plugin = setupPlugin('android');
  });

  afterEach(() => {
    teardownPlugin();
  });

  describe('init()', () => {
    it('should resolve successfully', async () => {
      const result = await plugin.init();
      expect(result).toBe(1);
    });

    it('should call exec with "initialize" action', async () => {
      const mockExec = require('cordova/exec');
      await plugin.init();
      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'RetenoPlugin',
        'initialize',
        expect.any(Array)
      );
    });

    it('should support legacy init(successCb, errorCb) signature', async () => {
      const success = jest.fn();
      await plugin.init(success);
      expect(success).toHaveBeenCalledWith(1);
    });

    it('should support init(options)', async () => {
      const mockExec = require('cordova/exec');
      await plugin.init({ accessKey: 'test-key', pauseInAppMessages: true });
      const initArgs = mockExec.mock.calls.find((c) => c[3] === 'initialize');
      expect(initArgs[4][0]).toEqual(
        expect.objectContaining({ accessKey: 'test-key', pauseInAppMessages: true })
      );
    });

    it('should be idempotent', async () => {
      const mockExec = require('cordova/exec');
      await plugin.init();
      await plugin.init();
      const initCalls = mockExec.mock.calls.filter((c) => c[3] === 'initialize');
      expect(initCalls).toHaveLength(1);
    });
  });

  describe('Init state machine', () => {
    it('should auto-init when calling methods that require init', async () => {
      const freshPlugin = requireFreshPlugin();
      const mockExec = require('cordova/exec');
      await freshPlugin.logEvent({ eventName: 'test' });
      const initCalls = mockExec.mock.calls.filter((c) => c[3] === 'initialize');
      expect(initCalls).toHaveLength(1);
    });

    it('should share one init promise for concurrent calls', async () => {
      const freshPlugin = requireFreshPlugin();
      const mockExec = require('cordova/exec');
      await Promise.all([freshPlugin.logEvent({ eventName: 'e1' }), freshPlugin.logScreenView('Screen1')]);
      const initCalls = mockExec.mock.calls.filter((c) => c[3] === 'initialize');
      expect(initCalls).toHaveLength(1);
    });

    it('should recover from init failure', async () => {
      const freshPlugin = requireFreshPlugin();
      const mockExec = require('cordova/exec');

      let callCount = 0;
      mockExec.mockImplementation((success, error, _plugin, action, _args) => {
        callCount++;
        if (action === 'initialize' && callCount === 1) {
          if (typeof error === 'function') error('init-fail');
        } else if (typeof success === 'function') {
          success(1);
        }
      });

      const p1 = freshPlugin.logEvent({ eventName: 'e1' });
      p1.catch(() => {});
      await expect(p1).rejects.toBe('init-fail');

      const result = await freshPlugin.logEvent({ eventName: 'e2' });
      expect(result).toBe(1);
    });
  });

  describe('getInitialNotification()', () => {
    it('should call exec without requiring init', async () => {
      const freshPlugin = requireFreshPlugin();
      await freshPlugin.getInitialNotification(null);
      const initCalls = require('cordova/exec').mock.calls.filter((c) => c[3] === 'initialize');
      expect(initCalls).toHaveLength(0);
      const call = require('cordova/exec').mock.calls.find((c) => c[3] === 'getInitialNotification');
      expect(call).toBeTruthy();
    });
  });
});
