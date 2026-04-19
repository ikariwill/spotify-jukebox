import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock must use the path as seen from THIS file to src/index.ts
const mocks = vi.hoisted(() => ({
  isExpired: vi.fn(),
  refreshTokens: vi.fn(),
}));

vi.mock('../../index', () => ({
  spotifyService: {
    isExpired: mocks.isExpired,
    refreshTokens: mocks.refreshTokens,
  },
}));

import { requireAuth } from '../auth';

const makeTokens = (expiresAt = Date.now() + 3_600_000) => ({
  accessToken: 'at',
  refreshToken: 'rt',
  expiresAt,
});

const makeReq = (overrides: any = {}): Partial<Request> => ({
  session: {
    tokens: makeTokens(),
    save: vi.fn((cb: any) => cb(null)),
    destroy: vi.fn((cb: any) => cb(null)),
    ...overrides.session,
  } as any,
  ...overrides,
});

const makeRes = (): Partial<Response> => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('requireAuth middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('returns 401 when there are no tokens in the session', async () => {
    const req = makeReq({ session: { tokens: undefined } });
    const res = makeRes();
    await requireAuth(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when tokens are valid and not expired', async () => {
    mocks.isExpired.mockReturnValue(false);
    const req = makeReq();
    const res = makeRes();
    await requireAuth(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('refreshes tokens when expired, saves session, and calls next()', async () => {
    const freshTokens = makeTokens(Date.now() + 7_200_000);
    mocks.isExpired.mockReturnValue(true);
    mocks.refreshTokens.mockResolvedValue(freshTokens);

    const saveMock = vi.fn((cb: any) => cb(null));
    const req = makeReq({ session: { tokens: makeTokens(0), save: saveMock } });
    const res = makeRes();

    await requireAuth(req as Request, res as Response, next);

    expect(mocks.refreshTokens).toHaveBeenCalled();
    expect(saveMock).toHaveBeenCalled();
    expect((req as any).session.tokens).toBe(freshTokens);
    expect(next).toHaveBeenCalled();
  });

  it('destroys session and returns 401 when token refresh fails', async () => {
    mocks.isExpired.mockReturnValue(true);
    mocks.refreshTokens.mockRejectedValue(new Error('refresh failed'));

    const destroyMock = vi.fn((cb: any) => cb(null));
    const req = makeReq({ session: { tokens: makeTokens(0), destroy: destroyMock } });
    const res = makeRes();

    await requireAuth(req as Request, res as Response, next);

    expect(destroyMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
