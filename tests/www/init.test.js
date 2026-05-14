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

    it('should pass sessionDurationSeconds to exec', async () => {
      const mockExec = require('cordova/exec');
      await plugin.init({ sessionDurationSeconds: 120 });
      const initArgs = mockExec.mock.calls.find((c) => c[3] === 'initialize');
      expect(initArgs[4][0]).toEqual(expect.objectContaining({ sessionDurationSeconds: 120 }));
    });

    it('should pass lifecycleTrackingOptions with new fields to exec', async () => {
      const mockExec = require('cordova/exec');
      await plugin.init({
        lifecycleTrackingOptions: {
          appLifecycleEnabled: true,
          foregroundLifecycleEnabled: true,
          pushSubscriptionEnabled: false,
          sessionStartEventsEnabled: true,
          sessionEndEventsEnabled: false,
        },
      });
      const initArgs = mockExec.mock.calls.find((c) => c[3] === 'initialize');
      expect(initArgs[4][0]).toEqual(
        expect.objectContaining({
          lifecycleTrackingOptions: expect.objectContaining({
            foregroundLifecycleEnabled: true,
            sessionStartEventsEnabled: true,
            sessionEndEventsEnabled: false,
          }),
        })
      );
    });

    it('should pass lifecycleTrackingOptions "ALL" string to exec', async () => {
      const mockExec = require('cordova/exec');
      await plugin.init({ lifecycleTrackingOptions: 'ALL' });
      const initArgs = mockExec.mock.calls.find((c) => c[3] === 'initialize');
      expect(initArgs[4][0]).toEqual(
        expect.objectContaining({ lifecycleTrackingOptions: 'ALL' })
      );
    });

    it('should pass lifecycleTrackingOptions "NONE" string to exec', async () => {
      const mockExec = require('cordova/exec');
      await plugin.init({ lifecycleTrackingOptions: 'NONE' });
      const initArgs = mockExec.mock.calls.find((c) => c[3] === 'initialize');
      expect(initArgs[4][0]).toEqual(
        expect.objectContaining({ lifecycleTrackingOptions: 'NONE' })
      );
    });

    it('should pass backward-compat sessionEventsEnabled in lifecycleTrackingOptions to exec', async () => {
      const mockExec = require('cordova/exec');
      await plugin.init({ lifecycleTrackingOptions: { sessionEventsEnabled: false } });
      const initArgs = mockExec.mock.calls.find((c) => c[3] === 'initialize');
      expect(initArgs[4][0]).toEqual(
        expect.objectContaining({
          lifecycleTrackingOptions: expect.objectContaining({ sessionEventsEnabled: false }),
        })
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

    it('should invoke error callback when init fails', async () => {
      const freshPlugin = requireFreshPlugin();
      const mockExec = require('cordova/exec');
      mockExec.mockImplementation((_success, error, _plugin, action) => {
        if (action === 'initialize' && typeof error === 'function') error('init-fail');
      });

      const errorCb = jest.fn();
      await expect(freshPlugin.init({}, null, errorCb)).rejects.toBe('init-fail');
      expect(errorCb).toHaveBeenCalledWith('init-fail');
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

    it('should invoke success callback when exec resolves', async () => {
      const freshPlugin = requireFreshPlugin();
      const successCb = jest.fn();
      await freshPlugin.getInitialNotification(null, successCb);
      expect(successCb).toHaveBeenCalledWith(1);
    });

    it('should invoke error callback when exec rejects', async () => {
      const freshPlugin = requireFreshPlugin();
      const mockExec = require('cordova/exec');
      mockExec.mockImplementation((_success, error, _plugin, action) => {
        if (action === 'getInitialNotification' && typeof error === 'function') error('no-notification');
      });

      const errorCb = jest.fn();
      await expect(freshPlugin.getInitialNotification(null, null, errorCb)).rejects.toBe('no-notification');
      expect(errorCb).toHaveBeenCalledWith('no-notification');
    });
  });
});
