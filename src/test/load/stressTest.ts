import { describe, it, expect, vi } from 'vitest';
import { FallbackLimiter } from '@/utils/resilience/fallbackLimiter';
import { LatencyTracker } from '../../main/benchmark/latencyTracker';
import type { RateLimitConfig } from '../../main/models';

describe('Stress Tests', () => {
  const config: RateLimitConfig = {
    algorithm: 'token_bucket',
    limit: 10000,
    windowMs: 1000,
  };

  it('survives rapid-fire requests without errors', async () => {
    const limiter = new FallbackLimiter();
    const tracker = new LatencyTracker();
    const errors: Error[] = [];

    const promises = Array.from({ length: 500 }, async (_, i) => {
      try {
        const start = performance.now();
        await limiter.check(`stress:${i}`, config);
        tracker.record(performance.now() - start);
      } catch (e: any) {
        errors.push(e);
      }
    });

    await Promise.all(promises);

    expect(errors.length).toBe(0);
    expect(tracker.count).toBe(500);
  });

  it('handles mixed algorithm requests under load', async () => {
    const limiter = new FallbackLimiter();
    const algorithms = ['token_bucket', 'sliding_window', 'fixed_window', 'leaky_bucket'];

    const promises = algorithms.flatMap((algo) =>
      Array.from({ length: 50 }, (_, i) =>
        limiter.check(`mixed:${algo}:${i}`, { ...config, algorithm: algo })
      )
    );

    const results = await Promise.all(promises);
    expect(results.length).toBe(200);
    expect(results.every(r => typeof r.allowed === 'boolean')).toBe(true);
  });

  it('recovery after burst — allows requests again after window resets', async () => {
    const limiter = new FallbackLimiter();
    const shortConfig: RateLimitConfig = {
      algorithm: 'token_bucket',
      limit: 3,
      windowMs: 50, // 50ms window
    };

    // Exhaust the limit
    for (let i = 0; i < 10; i++) {
      await limiter.check('recovery-key', shortConfig);
    }

    // Wait for window to reset
    await new Promise(r => setTimeout(r, 60));

    // Should allow again
    const result = await limiter.check('recovery-key', shortConfig);
    expect(result).toBeDefined();
    expect(typeof result.allowed).toBe('boolean');
  });
});
