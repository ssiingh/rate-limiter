import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/redis/redisClient', () => ({
  getRedisClient: () => ({
    evalsha: vi.fn().mockResolvedValue([1, 99, Date.now() + 60000, 100]),
    call: vi.fn().mockResolvedValue('mock_sha'),
    hgetall: vi.fn().mockResolvedValue({ queue: '5', last_drain: String(Date.now()) }),
    del: vi.fn().mockResolvedValue(1),
  }),
  default: () => ({}),
}));

vi.mock('fs', () => ({
  default: { readFileSync: () => 'return {1, 99, 60000, 100}' },
  readFileSync: () => 'return {1, 99, 60000, 100}',
}));

import { LeakyBucketAlgorithm } from '@/services/ratelimit/algorithms/leakyBucket';

describe('LeakyBucket', () => {
  it('has a valid algorithm name', () => {
    const algo = new LeakyBucketAlgorithm({} as any);
    expect(algo.name).toBe('leaky_bucket');
  });

  it('implements the RateLimitAlgorithm interface', () => {
    const algo = new LeakyBucketAlgorithm({} as any);
    expect(typeof algo.check).toBe('function');
    expect(typeof algo.reset).toBe('function');
    expect(typeof algo.getState).toBe('function');
  });

  it('reset deletes the key from Redis', async () => {
    const delFn = vi.fn().mockResolvedValue(1);
    const client = { del: delFn } as any;
    const algo = new LeakyBucketAlgorithm(client);
    await algo.reset('leak-key');
    expect(delFn).toHaveBeenCalledWith('leak-key');
  });

  it('getState returns queue and lastDrain for existing keys', async () => {
    const client = {
      hgetall: vi.fn().mockResolvedValue({ queue: '10', last_drain: '1700000000' }),
    } as any;
    const algo = new LeakyBucketAlgorithm(client);
    const state = await algo.getState('test-key');
    expect(state).toBeTruthy();
    expect(state!.queue).toBe(10);
    expect(state!.lastDrain).toBe(1700000000);
  });

  it('getState returns null for non-existent keys', async () => {
    const client = {
      hgetall: vi.fn().mockResolvedValue(null),
    } as any;
    const algo = new LeakyBucketAlgorithm(client);
    const state = await algo.getState('missing-key');
    expect(state).toBeNull();
  });

  it('getState returns null for empty hash', async () => {
    const client = {
      hgetall: vi.fn().mockResolvedValue({}),
    } as any;
    const algo = new LeakyBucketAlgorithm(client);
    const state = await algo.getState('empty-key');
    expect(state).toBeNull();
  });
});
