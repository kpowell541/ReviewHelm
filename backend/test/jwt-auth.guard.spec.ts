import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../src/common/auth/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  function createGuard() {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as any;

    const config = {
      get: jest.fn((key: string) => {
        if (key === 'SUPABASE_JWKS_URL') return 'https://example.com/.well-known/jwks.json';
        if (key === 'SUPABASE_JWT_ISSUER') return 'https://issuer';
        if (key === 'SUPABASE_JWT_AUDIENCE') return 'aud';
        if (key === 'SUPABASE_JWT_ALGORITHMS') return 'RS256';
        if (key === 'SUPABASE_MAX_JWT_AGE_SECONDS') return 86400;
        if (key === 'SUPABASE_REQUIRE_SESSION_ID_CLAIM') return false;
        if (key === 'ADMIN_USER_IDS') return '';
        return '';
      }),
    } as any;

    const audit = {
      write: jest.fn().mockResolvedValue(undefined),
    } as any;

    const guard = new JwtAuthGuard(reflector, config, audit);
    return { guard, reflector, config, audit };
  }

  function createContext(authorization?: string | string[]) {
    const request = {
      headers: {
        authorization,
      },
      path: '/api/v1/example',
      method: 'GET',
      requestId: 'req-1',
    };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  it('extracts a valid bearer token from a strict Authorization header', () => {
    const { guard } = createGuard();

    expect(
      (guard as any).extractBearerToken('Bearer abcDEF123_.def.ghi'),
    ).toBe('abcDEF123_.def.ghi');
  });

  it('rejects malformed bearer headers', async () => {
    const { guard } = createGuard();
    const extract = (authorization: string | string[] | undefined): string | null =>
      (guard as any).extractBearerToken(authorization);

    expect(extract(undefined)).toBeNull();
    expect(extract('Token abc.def.ghi')).toBeNull();
    expect(extract('Bearer abc.def')).toBeNull();
    expect(extract('Bearer abc.def.ghi.zzz')).toBeNull();
    expect(extract('Bearer t=1710000000,v1=abc')).toBeNull();
  });

  it('rejects oversized bearer tokens', () => {
    const { guard } = createGuard();
    const oversized = `Bearer ${'a'.repeat(4_100)}.def.ghi`;

    expect((guard as any).extractBearerToken(oversized)).toBeNull();
  });

  it('rejects requests without a bearer token in canActivate', async () => {
    const { guard, audit } = createGuard();
    const context = createContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'auth_failed',
        details: expect.objectContaining({ reason: 'missing_bearer_token' }),
      }),
    );
  });
});
