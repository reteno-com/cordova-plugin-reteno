const { setupPlugin, teardownPlugin } = require('./test-helpers');

describe('cordova-plugin-reteno listeners and callbacks', () => {
  let plugin;

  beforeEach(() => {
    plugin = setupPlugin('android');
  });

  afterEach(() => {
    teardownPlugin();
  });

  describe('Event listeners', () => {
    let addSpy;
    let removeSpy;

    beforeEach(() => {
      addSpy = jest.spyOn(document, 'addEventListener');
      removeSpy = jest.spyOn(document, 'removeEventListener');
    });

    it('setOnRetenoPushReceivedListener registers listener', () => {
      const fn = jest.fn();
      plugin.setOnRetenoPushReceivedListener(fn);
      expect(addSpy).toHaveBeenCalledWith('reteno-push-received', fn);
    });

    it('setOnRetenoPushReceivedListener supports legacy signature', () => {
      const fn = jest.fn();
      plugin.setOnRetenoPushReceivedListener('reteno', fn);
      expect(addSpy).toHaveBeenCalledWith('reteno-push-received', fn);
    });

    it('setOnRetenoPushReceivedListener ignores non-function', () => {
      plugin.setOnRetenoPushReceivedListener('not-a-function');
      expect(addSpy).not.toHaveBeenCalled();
    });

    it('removeOnRetenoPushReceivedListener removes listener', () => {
      const fn = jest.fn();
      plugin.removeOnRetenoPushReceivedListener(fn);
      expect(removeSpy).toHaveBeenCalledWith('reteno-push-received', fn);
    });

    it('removeOnRetenoPushReceivedListener ignores non-function', () => {
      plugin.removeOnRetenoPushReceivedListener(null);
      expect(removeSpy).not.toHaveBeenCalled();
    });

    it('setOnRetenoNotificationClickedListener registers listener', () => {
      const fn = jest.fn();
      plugin.setOnRetenoNotificationClickedListener(fn);
      expect(addSpy).toHaveBeenCalledWith('reteno-notification-clicked', fn);
    });

    it('setOnRetenoNotificationClickedListener supports legacy signature', () => {
      const fn = jest.fn();
      plugin.setOnRetenoNotificationClickedListener('reteno', fn);
      expect(addSpy).toHaveBeenCalledWith('reteno-notification-clicked', fn);
    });

    it('removeOnRetenoNotificationClickedListener removes listener', () => {
      const fn = jest.fn();
      plugin.removeOnRetenoNotificationClickedListener(fn);
      expect(removeSpy).toHaveBeenCalledWith('reteno-notification-clicked', fn);
    });

    it('setOnInAppMessageCustomDataReceivedListener registers listener', () => {
      const fn = jest.fn();
      plugin.setOnInAppMessageCustomDataReceivedListener(fn);
      expect(addSpy).toHaveBeenCalledWith('reteno-in-app-custom-data', fn);
    });

    it('removeOnInAppMessageCustomDataReceivedListener removes listener', () => {
      const fn = jest.fn();
      plugin.removeOnInAppMessageCustomDataReceivedListener(fn);
      expect(removeSpy).toHaveBeenCalledWith('reteno-in-app-custom-data', fn);
    });

    it('setOnRetenoPushDismissedListener registers listener', () => {
      const fn = jest.fn();
      plugin.setOnRetenoPushDismissedListener(fn);
      expect(addSpy).toHaveBeenCalledWith('reteno-push-dismissed', fn);
    });

    it('removeOnRetenoPushDismissedListener removes listener', () => {
      const fn = jest.fn();
      plugin.removeOnRetenoPushDismissedListener(fn);
      expect(removeSpy).toHaveBeenCalledWith('reteno-push-dismissed', fn);
    });

    it('setOnRetenoCustomPushReceivedListener registers listener', () => {
      const fn = jest.fn();
      plugin.setOnRetenoCustomPushReceivedListener(fn);
      expect(addSpy).toHaveBeenCalledWith('reteno-custom-push-received', fn);
    });

    it('removeOnRetenoCustomPushReceivedListener removes listener', () => {
      const fn = jest.fn();
      plugin.removeOnRetenoCustomPushReceivedListener(fn);
      expect(removeSpy).toHaveBeenCalledWith('reteno-custom-push-received', fn);
    });

    it('setOnRetenoPushButtonClickedListener registers listener', () => {
      const fn = jest.fn();
      plugin.setOnRetenoPushButtonClickedListener(fn);
      expect(addSpy).toHaveBeenCalledWith('reteno-push-button-clicked', fn);
    });

    it('removeOnRetenoPushButtonClickedListener removes listener', () => {
      const fn = jest.fn();
      plugin.removeOnRetenoPushButtonClickedListener(fn);
      expect(removeSpy).toHaveBeenCalledWith('reteno-push-button-clicked', fn);
    });
  });

  describe('Callback patterns', () => {
    it('should call success callback for methods with auto-init', async () => {
      const success = jest.fn();
      await plugin.logEvent({ eventName: 'test' }, success);
      expect(success).toHaveBeenCalledWith(1);
    });

    it('should call error callback when exec fails', async () => {
      const mockExec = require('cordova/exec');
      mockExec.mockImplementation((success, error, _plugin, action, _args) => {
        if (action === 'logEvent') {
          if (typeof error === 'function') error('bridge-error');
        } else if (typeof success === 'function') {
          success(1);
        }
      });

      const success = jest.fn();
      const error = jest.fn();

      const p = plugin.logEvent({ eventName: 'test' }, success, error);
      p.catch(() => {});

      await expect(p).rejects.toBe('bridge-error');
      expect(error).toHaveBeenCalledWith('bridge-error');
      expect(success).not.toHaveBeenCalled();
    });
  });
});
