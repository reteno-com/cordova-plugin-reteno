const { setupPlugin, teardownPlugin } = require('./test-helpers');

describe('cordova-plugin-reteno events', () => {
  let plugin;

  beforeEach(() => {
    plugin = setupPlugin('android');
  });

  afterEach(() => {
    teardownPlugin();
  });

  describe('logEvent()', () => {
    it('should call exec with event payload', async () => {
      const mockExec = require('cordova/exec');
      const payload = {
        eventName: 'test-event',
        date: '2024-01-01T00:00:00Z',
        parameters: [{ name: 'key', value: 'val' }],
      };
      await plugin.logEvent(payload);
      const call = mockExec.mock.calls.find((c) => c[3] === 'logEvent');
      expect(call).toBeTruthy();
      expect(call[4][0]).toEqual(payload);
    });
  });

  describe('logEcommerceEvent()', () => {
    it('should reject when payload is missing', async () => {
      await expect(plugin.logEcommerceEvent(null)).rejects.toThrow('Missing argument: payload');
    });

    it('should reject when payload is not an object', async () => {
      await expect(plugin.logEcommerceEvent('string')).rejects.toThrow('Missing argument: payload');
    });

    it('should reject when eventType is missing', async () => {
      await expect(plugin.logEcommerceEvent({})).rejects.toThrow('Missing argument: eventType');
    });

    it('should reject when eventType is empty string', async () => {
      await expect(plugin.logEcommerceEvent({ eventType: '  ' })).rejects.toThrow('Missing argument: eventType');
    });

    it('should accept valid productViewed event', async () => {
      const result = await plugin.logEcommerceEvent({
        eventType: 'productViewed',
        product: { productId: 'p1', price: 100, isInStock: true },
      });
      expect(result).toBe(1);
    });

    it('should unwrap legacy array argument', async () => {
      const mockExec = require('cordova/exec');
      await plugin.logEcommerceEvent([
        {
          eventType: 'productViewed',
          product: { productId: 'p1', price: 100, isInStock: true },
        },
      ]);
      const call = mockExec.mock.calls.find((c) => c[3] === 'logEcommerceEvent');
      expect(call[4][0]).toEqual(expect.objectContaining({ eventType: 'productViewed' }));
    });
  });

  describe('logScreenView()', () => {
    it('should reject when screenName is falsy', async () => {
      await expect(plugin.logScreenView(null)).rejects.toThrow('Missing argument: screenName');
      await expect(plugin.logScreenView('')).rejects.toThrow('Missing argument: screenName');
      await expect(plugin.logScreenView(0)).rejects.toThrow('Missing argument: screenName');
    });

    it('should accept valid screenName', async () => {
      const result = await plugin.logScreenView('HomeScreen');
      expect(result).toBe(1);
    });
  });
});
