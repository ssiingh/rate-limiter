import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/redis/redisClient', () => ({
  getRedisClient: () => ({
    evalsha: vi.fn().mockResolvedValue([1, 99, Date.now() + 60000, 100]),
    call: vi.fn().mockResolvedValue('mock_sha'),
    get: vi.fn().mockResolvedValue('5'),
    ttl: vi.fn().mockResolvedValue(55),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
  }),
  default: () => ({}),
}));

vi.mock('fs', () => ({
  default: { readFileSync: () => 'return {1, 99, 60000, 100}' },
  readFileSync: () => 'return {1, 99, 60000, 100}',
}));

import { FixedWindowAlgorithm } from '@/services/ratelimit/algorithms/fixedWindow';

describe('FixedWindow', () => {
  it('has a valid algorithm name', () => {
    const algo = new FixedWindowAlgorithm({} as any);
    expect(algo.name).toBe('fixed_window');
  });

  it('implements the RateLimitAlgorithm interface', () => {
    const algo = new FixedWindowAlgorithm({} as any);
    expect(typeof algo.check).toBe('function');
    expect(typeof algo.reset).toBe('function');
    expect(typeof algo.getState).toBe('function');
  });

  it('getState returns count and ttl when keys exist', async () => {
    const client = {
      keys: vi.fn().mockResolvedValue(['test-key:fw:123']),
      get: vi.fn().mockResolvedValue('42'),
      ttl: vi.fn().mockResolvedValue(30),
    } as any;
    const algo = new FixedWindowAlgorithm(client);
    const state = await algo.getState('test-key');
    expect(state).toEqual({ count: 42, ttl: 30 });
  });

  it('getState returns null when no window keys exist', async () => {
    const client = {
      keys: vi.fn().mockResolvedValue([]),
    } as any;
    const algo = new FixedWindowAlgorithm(client);
    const state = await algo.getState('missing-key');
    expect(state).toBeNull();
  });

  it('reset deletes all matching window keys', async () => {
    const delFn = vi.fn().mockResolvedValue(2);
    const client = {
      keys: vi.fn().mockResolvedValue(['key:fw:1', 'key:fw:2']),
      del: delFn,
    } as any;
    const algo = new FixedWindowAlgorithm(client);
    await algo.reset('key');
    expect(delFn).toHaveBeenCalledWith('key:fw:1', 'key:fw:2');
  });

  it('reset does nothing when no matching keys exist', async () => {
    const delFn = vi.fn();
    const client = {
      keys: vi.fn().mockResolvedValue([]),
      del: delFn,
    } as any;
    const algo = new FixedWindowAlgorithm(client);
    await algo.reset('key');
    expect(delFn).not.toHaveBeenCalled();
  });
});
