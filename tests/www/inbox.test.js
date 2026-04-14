const { setupPlugin, teardownPlugin } = require('./test-helpers');

describe('cordova-plugin-reteno inbox', () => {
  let plugin;

  beforeEach(() => {
    plugin = setupPlugin('android');
  });

  afterEach(() => {
    teardownPlugin();
  });

  describe('getAppInboxMessages()', () => {
    it('should reject when payload is missing', async () => {
      await expect(plugin.getAppInboxMessages(null)).rejects.toThrow('Missing argument: payload');
    });

    it('should reject when page is missing', async () => {
      await expect(plugin.getAppInboxMessages({ pageSize: 10 })).rejects.toThrow('Missing argument: page');
    });

    it('should reject when pageSize is missing', async () => {
      await expect(plugin.getAppInboxMessages({ page: 0 })).rejects.toThrow('Missing argument: pageSize');
    });

    it('should accept valid payload', async () => {
      const result = await plugin.getAppInboxMessages({ page: 0, pageSize: 10 });
      expect(result).toBe(1);
    });

    it('should accept zero values', async () => {
      const result = await plugin.getAppInboxMessages({ page: 0, pageSize: 0 });
      expect(result).toBe(1);
    });
  });

  describe('getAppInboxMessagesCount()', () => {
    it('should call exec', async () => {
      const mockExec = require('cordova/exec');
      await plugin.getAppInboxMessagesCount();
      const call = mockExec.mock.calls.find((c) => c[3] === 'getAppInboxMessagesCount');
      expect(call).toBeTruthy();
    });
  });

  describe('markAsOpened()', () => {
    it('should reject when messageId is missing', async () => {
      await expect(plugin.markAsOpened(null)).rejects.toThrow('Missing argument: messageId');
    });

    it('should reject when messageId is empty', async () => {
      await expect(plugin.markAsOpened('  ')).rejects.toThrow('Missing argument: messageId');
    });

    it('should accept valid messageId', async () => {
      const result = await plugin.markAsOpened('msg-001');
      expect(result).toBe(1);
    });

    it('should unwrap legacy array argument', async () => {
      const result = await plugin.markAsOpened(['msg-002']);
      expect(result).toBe(1);
    });
  });

  describe('markAllMessagesAsOpened()', () => {
    it('should call exec', async () => {
      const mockExec = require('cordova/exec');
      await plugin.markAllMessagesAsOpened();
      const call = mockExec.mock.calls.find((c) => c[3] === 'markAllMessagesAsOpened');
      expect(call).toBeTruthy();
    });
  });

  describe('subscribeOnMessagesCountChanged()', () => {
    it('should subscribe with provided callbacks', async () => {
      const mockExec = require('cordova/exec');
      const success = jest.fn();
      const error = jest.fn();
      const result = await plugin.subscribeOnMessagesCountChanged(success, error);
      expect(result).toBe(1);
      const call = mockExec.mock.calls.find((c) => c[3] === 'subscribeOnMessagesCountChanged');
      expect(call).toBeTruthy();
      expect(call[0]).toBe(success);
      expect(call[1]).toBe(error);
    });
  });
});
