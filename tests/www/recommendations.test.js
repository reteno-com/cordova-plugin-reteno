const { setupPlugin, teardownPlugin } = require('./test-helpers');

describe('cordova-plugin-reteno recommendations', () => {
  let plugin;

  beforeEach(() => {
    plugin = setupPlugin('android');
  });

  afterEach(() => {
    teardownPlugin();
  });

  describe('getRecommendations()', () => {
    it('should reject when payload is missing', async () => {
      await expect(plugin.getRecommendations(null)).rejects.toThrow('Missing argument: payload');
    });

    it('should reject when recomVariantId is missing', async () => {
      await expect(plugin.getRecommendations({})).rejects.toThrow('Missing argument: recomVariantId');
    });

    it('should reject when recomVariantId is empty', async () => {
      await expect(plugin.getRecommendations({ recomVariantId: '  ' })).rejects.toThrow('Missing argument: recomVariantId');
    });

    it('should accept valid payload', async () => {
      const result = await plugin.getRecommendations({ recomVariantId: 'rv-1' });
      expect(result).toBe(1);
    });
  });

  describe('logRecommendations()', () => {
    it('should reject when payload is missing', async () => {
      await expect(plugin.logRecommendations(null)).rejects.toThrow('Missing argument: payload');
    });

    it('should reject when recomVariantId is missing', async () => {
      await expect(plugin.logRecommendations({ recomEvents: [{}] })).rejects.toThrow('Missing argument: recomVariantId');
    });

    it('should reject when recomEvents is missing', async () => {
      await expect(plugin.logRecommendations({ recomVariantId: 'rv-1' })).rejects.toThrow('Missing argument: recomEvents');
    });

    it('should reject when recomEvents is empty array', async () => {
      await expect(plugin.logRecommendations({ recomVariantId: 'rv-1', recomEvents: [] })).rejects.toThrow(
        'Missing argument: recomEvents'
      );
    });

    it('should accept valid payload', async () => {
      const result = await plugin.logRecommendations({
        recomVariantId: 'rv-1',
        recomEvents: [
          {
            recomEventType: 'IMPRESSIONS',
            occurred: '2024-01-01T00:00:00Z',
            productId: 'p1',
          },
        ],
      });
      expect(result).toBe(1);
    });
  });
});
