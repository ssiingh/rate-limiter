import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/redis/redisClient', () => ({
  getRedisClient: () => ({
    evalsha: vi.fn().mockResolvedValue([1, 9, Date.now() + 60000, 10]),
    call: vi.fn().mockResolvedValue('mock_sha'),
    zcard: vi.fn().mockResolvedValue(5),
    ttl: vi.fn().mockResolvedValue(55),
    del: vi.fn().mockResolvedValue(1),
  }),
  default: () => ({}),
}));

vi.mock('fs', () => ({
  default: { readFileSync: () => 'return {1, 9, 60000, 10}' },
  readFileSync: () => 'return {1, 9, 60000, 10}',
}));

import { SlidingWindowAlgorithm } from '@/services/ratelimit/algorithms/slidingWindow';

describe('SlidingWindow', () => {
  it('has a valid algorithm name', () => {
    const algo = new SlidingWindowAlgorithm({} as any);
    expect(algo.name).toBe('sliding_window');
  });

  it('implements the RateLimitAlgorithm interface', () => {
    const algo = new SlidingWindowAlgorithm({} as any);
    expect(typeof algo.check).toBe('function');
    expect(typeof algo.reset).toBe('function');
    expect(typeof algo.getState).toBe('function');
  });

  it('getState returns count and ttl from sorted set', async () => {
    const client = {
      zcard: vi.fn().mockResolvedValue(7),
      ttl: vi.fn().mockResolvedValue(45),
    } as any;
    const algo = new SlidingWindowAlgorithm(client);
    const state = await algo.getState('test-key');
    expect(state).toEqual({ count: 7, ttl: 45 });
  });
});
