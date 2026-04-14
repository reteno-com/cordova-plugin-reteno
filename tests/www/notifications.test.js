const { requireFreshPlugin, setupPlugin, teardownPlugin } = require('./test-helpers');

describe('cordova-plugin-reteno notifications', () => {
  let plugin;

  beforeEach(() => {
    plugin = setupPlugin('android');
  });

  afterEach(() => {
    teardownPlugin();
  });

  describe('requestNotificationPermission()', () => {
    it('should call exec', async () => {
      const mockExec = require('cordova/exec');
      await plugin.requestNotificationPermission();
      const call = mockExec.mock.calls.find((c) => c[3] === 'requestNotificationPermission');
      expect(call).toBeTruthy();
    });
  });

  describe('setWillPresentNotificationOptions()', () => {
    it('should forward options', async () => {
      const mockExec = require('cordova/exec');
      await plugin.setWillPresentNotificationOptions(['badge', 'sound']);
      const call = mockExec.mock.calls.find((c) => c[3] === 'setWillPresentNotificationOptions');
      expect(call).toBeTruthy();
      expect(call[4][0]).toEqual(['badge', 'sound']);
    });
  });

  describe('setDidReceiveNotificationResponseHandler()', () => {
    it('should forward config', async () => {
      const mockExec = require('cordova/exec');
      await plugin.setDidReceiveNotificationResponseHandler({
        enabled: true,
        emitEvent: true,
      });
      const call = mockExec.mock.calls.find((c) => c[3] === 'setDidReceiveNotificationResponseHandler');
      expect(call).toBeTruthy();
    });
  });

  describe('setNotificationActionHandler()', () => {
    it('should forward payload', async () => {
      const mockExec = require('cordova/exec');
      await plugin.setNotificationActionHandler({
        enabled: true,
        emitEvent: true,
      });
      const call = mockExec.mock.calls.find((c) => c[3] === 'setNotificationActionHandler');
      expect(call).toBeTruthy();
    });
  });

  describe('updateDefaultNotificationChannel()', () => {
    it('should reject when config is missing', async () => {
      await expect(plugin.updateDefaultNotificationChannel(null)).rejects.toThrow('Missing argument: config');
    });

    it('should reject when config is not an object', async () => {
      await expect(plugin.updateDefaultNotificationChannel('string')).rejects.toThrow('Missing argument: config');
    });

    it('should reject when name is missing', async () => {
      await expect(plugin.updateDefaultNotificationChannel({ description: 'desc' })).rejects.toThrow(
        'Missing argument: name'
      );
    });

    it('should reject when name is empty', async () => {
      await expect(plugin.updateDefaultNotificationChannel({ name: '  ', description: 'desc' })).rejects.toThrow(
        'Missing argument: name'
      );
    });

    it('should reject when description is missing', async () => {
      await expect(plugin.updateDefaultNotificationChannel({ name: 'ch' })).rejects.toThrow(
        'Missing argument: description'
      );
    });

    it('should reject when description is empty', async () => {
      await expect(plugin.updateDefaultNotificationChannel({ name: 'ch', description: '  ' })).rejects.toThrow(
        'Missing argument: description'
      );
    });

    it('should accept valid config', async () => {
      const result = await plugin.updateDefaultNotificationChannel({
        name: 'General',
        description: 'General notifications',
      });
      expect(result).toBe(1);
    });

    it('should unwrap legacy array argument', async () => {
      const result = await plugin.updateDefaultNotificationChannel([
        { name: 'General', description: 'General notifications' },
      ]);
      expect(result).toBe(1);
    });
  });

  describe('forcePushData()', () => {
    it('should call forcePushData on Android', async () => {
      const mockExec = require('cordova/exec');
      await plugin.forcePushData();
      const call = mockExec.mock.calls.find((c) => c[3] === 'forcePushData');
      expect(call).toBeTruthy();
    });

    it('should send logEvent with forcePush on iOS', async () => {
      global.cordova = { platformId: 'ios' };
      const iosPlugin = requireFreshPlugin();
      global.cordova = { platformId: 'ios' };
      const mockExec = require('cordova/exec');
      await iosPlugin.forcePushData();
      const call = mockExec.mock.calls.find((c) => c[3] === 'logEvent');
      expect(call).toBeTruthy();
      expect(call[4][0]).toEqual(expect.objectContaining({ forcePush: true }));
    });
  });

  describe('setDeviceToken()', () => {
    it('should call exec with token', async () => {
      const mockExec = require('cordova/exec');
      await plugin.setDeviceToken('abc123');
      const call = mockExec.mock.calls.find((c) => c[3] === 'setDeviceToken');
      expect(call).toBeTruthy();
      expect(call[4][0]).toBe('abc123');
    });
  });

  describe('setLifecycleTrackingOptions()', () => {
    it('should reject when options is falsy', async () => {
      await expect(plugin.setLifecycleTrackingOptions(null)).rejects.toThrow('Missing argument: options');
    });

    it('should call exec on Android', async () => {
      const mockExec = require('cordova/exec');
      await plugin.setLifecycleTrackingOptions({
        appLifecycleEnabled: true,
      });
      const call = mockExec.mock.calls.find((c) => c[3] === 'setLifecycleTrackingOptions');
      expect(call).toBeTruthy();
    });

    it('should store pending options on iOS before init', async () => {
      global.cordova = { platformId: 'ios' };
      const iosPlugin = requireFreshPlugin();
      global.cordova = { platformId: 'ios' };
      const result = await iosPlugin.setLifecycleTrackingOptions({
        appLifecycleEnabled: true,
      });
      expect(result).toBe(1);
    });

    it('should reject on iOS after init', async () => {
      global.cordova = { platformId: 'ios' };
      const iosPlugin = requireFreshPlugin();
      global.cordova = { platformId: 'ios' };
      await iosPlugin.init();
      await expect(
        iosPlugin.setLifecycleTrackingOptions({
          appLifecycleEnabled: true,
        })
      ).rejects.toThrow('iOS supports lifecycleTrackingOptions only during init');
    });
  });
});
