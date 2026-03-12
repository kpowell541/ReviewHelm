import { getDeviceId, initDeviceId } from '../utils/deviceId';

describe('deviceId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDeviceId (web)', () => {
    it('returns a UUID string', () => {
      const id = getDeviceId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });

    it('returns the same value on subsequent calls', () => {
      const id1 = getDeviceId();
      const id2 = getDeviceId();
      expect(id1).toBe(id2);
    });
  });

  describe('initDeviceId', () => {
    it('resolves without error on web', async () => {
      await expect(initDeviceId()).resolves.toBeUndefined();
    });
  });
});
