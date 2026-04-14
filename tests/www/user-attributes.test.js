const { setupPlugin, teardownPlugin } = require('./test-helpers');

describe('cordova-plugin-reteno user attributes', () => {
  let plugin;

  beforeEach(() => {
    plugin = setupPlugin('android');
  });

  afterEach(() => {
    teardownPlugin();
  });

  describe('setUserAttributes()', () => {
    it('should reject when externalUserId is missing', async () => {
      await expect(plugin.setUserAttributes({})).rejects.toThrow('Missing argument: "externalUserId"');
    });

    it('should reject when externalUserId is empty', async () => {
      await expect(plugin.setUserAttributes({ externalUserId: '' })).rejects.toThrow(
        'Missing argument: "externalUserId"'
      );
    });

    it('should reject when payload is null', async () => {
      await expect(plugin.setUserAttributes(null)).rejects.toThrow('Missing argument: "externalUserId"');
    });

    it('should accept a valid payload', async () => {
      const result = await plugin.setUserAttributes({
        externalUserId: 'user-123',
        user: { userAttributes: { email: 'test@example.com' } },
      });
      expect(result).toBe(1);
    });

    it('should unwrap legacy array argument', async () => {
      const mockExec = require('cordova/exec');
      await plugin.setUserAttributes([{ externalUserId: 'u1' }]);
      const call = mockExec.mock.calls.find((c) => c[3] === 'setUserAttributes');
      expect(call[4][0]).toEqual({ externalUserId: 'u1' });
    });

    it('should invoke success callback on resolution', async () => {
      const success = jest.fn();
      await plugin.setUserAttributes({ externalUserId: 'u1' }, success);
      expect(success).toHaveBeenCalledWith(1);
    });
  });

  describe('setAnonymousUserAttributes()', () => {
    it('should reject when payload is not an object', async () => {
      await expect(plugin.setAnonymousUserAttributes(null)).rejects.toThrow('Missing argument: payload');
    });

    it('should reject when payload contains phone', async () => {
      await expect(plugin.setAnonymousUserAttributes({ phone: '+1234567890' })).rejects.toThrow(
        'Anonymous user attributes cannot include phone/email'
      );
    });

    it('should reject when payload contains email', async () => {
      await expect(plugin.setAnonymousUserAttributes({ email: 'test@test.com' })).rejects.toThrow(
        'Anonymous user attributes cannot include phone/email'
      );
    });

    it('should reject when nested userAttributes contains phone', async () => {
      await expect(plugin.setAnonymousUserAttributes({ userAttributes: { phone: '+1234567890' } })).rejects.toThrow(
        'Anonymous user attributes cannot include phone/email'
      );
    });

    it('should reject when nested userAttributes contains email', async () => {
      await expect(plugin.setAnonymousUserAttributes({ userAttributes: { email: 'test@test.com' } })).rejects.toThrow(
        'Anonymous user attributes cannot include phone/email'
      );
    });

    it('should accept valid anonymous attributes', async () => {
      const result = await plugin.setAnonymousUserAttributes({
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result).toBe(1);
    });

    it('should unwrap legacy array argument', async () => {
      const result = await plugin.setAnonymousUserAttributes([{ firstName: 'Jane' }]);
      expect(result).toBe(1);
    });
  });

  describe('setMultiAccountUserAttributes()', () => {
    it('should reject when externalUserId is missing', async () => {
      await expect(plugin.setMultiAccountUserAttributes({ user: {} })).rejects.toThrow(
        'Missing argument: "externalUserId"'
      );
    });

    it('should reject when externalUserId is empty', async () => {
      await expect(plugin.setMultiAccountUserAttributes({ externalUserId: '', user: {} })).rejects.toThrow(
        'Missing argument: "externalUserId"'
      );
    });

    it('should reject when user is missing', async () => {
      await expect(plugin.setMultiAccountUserAttributes({ externalUserId: 'u1' })).rejects.toThrow(
        'Missing argument: "user"'
      );
    });

    it('should reject when user is not an object', async () => {
      await expect(
        plugin.setMultiAccountUserAttributes({
          externalUserId: 'u1',
          user: 'invalid',
        })
      ).rejects.toThrow('Missing argument: "user"');
    });

    it('should accept a valid payload', async () => {
      const result = await plugin.setMultiAccountUserAttributes({
        externalUserId: 'u1',
        user: { userAttributes: { email: 'a@b.com' } },
      });
      expect(result).toBe(1);
    });
  });
});
