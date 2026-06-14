import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis for unit tests
vi.mock('../../src/redis/redisClient', () => ({
  getRedisClient: () => ({
    evalsha: vi.fn().mockResolvedValue([1, 99, Date.now() + 60000, 100]),
    call: vi.fn().mockResolvedValue('mock_sha'),
    hgetall: vi.fn().mockResolvedValue({ tokens: '50', lastRefillTime: String(Date.now()), capacity: '100', refillRate: '1' }),
    del: vi.fn().mockResolvedValue(1),
    hset: vi.fn(),
  }),
  default: () => ({}),
}));

// Mock fs to avoid reading Lua files
vi.mock('fs', () => ({
  default: { readFileSync: () => 'return {1, 99, 60000, 100}' },
  readFileSync: () => 'return {1, 99, 60000, 100}',
}));

import { TokenBucketAlgorithm } from '@/services/ratelimit/algorithms/tokenBucket';

describe('TokenBucket', () => {
  it('exports a valid algorithm name', () => {
    expect(TokenBucketAlgorithm).toBeDefined();
    const algo = new (TokenBucketAlgorithm as any)({} as any);
    expect(algo.name).toBe('token_bucket');
  });

  it('has check, reset, and getState methods', () => {
    const algo = new (TokenBucketAlgorithm as any)({} as any);
    expect(typeof algo.check).toBe('function');
    expect(typeof algo.reset).toBe('function');
    expect(typeof algo.getState).toBe('function');
  });

  it('script SHA is loaded lazily', () => {
    const mockCall = vi.fn().mockResolvedValue('sha256_hash');
    const client = { call: mockCall, evalsha: vi.fn(), hgetall: vi.fn(), del: vi.fn() } as any;
    const algo = new TokenBucketAlgorithm(client);
    // SHA should not be loaded yet
    expect(mockCall).not.toHaveBeenCalled();
  });
});
