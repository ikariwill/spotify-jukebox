import { describe, expect, it } from 'vitest';

import { apiLimiter, searchLimiter } from '../rateLimit';

describe('rate limiters', () => {
  it('apiLimiter is a middleware function', () => {
    expect(typeof apiLimiter).toBe('function');
  });

  it('searchLimiter is a middleware function', () => {
    expect(typeof searchLimiter).toBe('function');
  });

  it('apiLimiter and searchLimiter are distinct instances', () => {
    expect(apiLimiter).not.toBe(searchLimiter);
  });
});
