import { isLocalHost, isSecureWebUrl } from '../utils/urlSecurity';

describe('urlSecurity', () => {
  describe('isLocalHost', () => {
    it('matches localhost', () => {
      expect(isLocalHost('localhost')).toBe(true);
    });

    it('matches IPv4 loopback', () => {
      expect(isLocalHost('127.0.0.1')).toBe(true);
    });

    it('matches IPv6 loopback', () => {
      expect(isLocalHost('::1')).toBe(true);
    });

    it('rejects external hostnames', () => {
      expect(isLocalHost('example.com')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isLocalHost('')).toBe(false);
    });
  });

  describe('isSecureWebUrl', () => {
    it('accepts HTTPS URLs', () => {
      expect(isSecureWebUrl('https://example.com')).toBe(true);
    });

    it('accepts HTTP localhost', () => {
      expect(isSecureWebUrl('http://localhost:3000')).toBe(true);
    });

    it('rejects HTTP to external host', () => {
      expect(isSecureWebUrl('http://example.com')).toBe(false);
    });

    it('rejects javascript: URLs', () => {
      expect(isSecureWebUrl('javascript:alert(1)')).toBe(false);
    });

    it('rejects data: URLs', () => {
      expect(isSecureWebUrl('data:text/html,foo')).toBe(false);
    });

    it('rejects invalid URLs', () => {
      expect(isSecureWebUrl('not-a-url')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isSecureWebUrl('')).toBe(false);
    });
  });
});
