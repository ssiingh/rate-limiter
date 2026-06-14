import { describe, it, expect, vi } from 'vitest';
import { FallbackLimiter } from '@/utils/resilience/fallbackLimiter';
import { LatencyTracker } from '../../main/benchmark/latencyTracker';
import { ThroughputCalculator } from '../../main/benchmark/throughputCalculator';
import type { RateLimitConfig } from '../../main/models';

describe('Rate Limiter Load Tests', () => {
  const config: RateLimitConfig = {
    algorithm: 'token_bucket',
    limit: 1000,
    windowMs: 1000,
  };

  it('handles 1000 sequential requests with consistent latency', async () => {
    const limiter = new FallbackLimiter();
    const tracker = new LatencyTracker();
    const COUNT = 1000;

    for (let i = 0; i < COUNT; i++) {
      const start = performance.now();
      await limiter.check(`load:${i}`, config);
      tracker.record(performance.now() - start);
    }

    const summary = tracker.getSummary();
    expect(summary.count).toBe(COUNT);
    expect(summary.p95).toBeLessThan(10); // < 10ms for in-memory fallback
    expect(summary.mean).toBeLessThan(5);
  });

  it('handles concurrent requests across workers', async () => {
    const limiter = new FallbackLimiter();
    const CONCURRENCY = 10;
    const PER_WORKER = 100;
    const throughput = new ThroughputCalculator(5000);

    const worker = async (workerId: number) => {
      const results = [];
      for (let i = 0; i < PER_WORKER; i++) {
        const result = await limiter.check(`concurrent:${workerId}:${i}`, config);
        results.push(result);
        throughput.record();
      }
      return results;
    };

    const allResults = await Promise.all(
      Array.from({ length: CONCURRENCY }, (_, i) => worker(i))
    );

    const flat = allResults.flat();
    expect(flat.length).toBe(CONCURRENCY * PER_WORKER);
    expect(throughput.getRps()).toBeGreaterThan(0);
  });

  it('maintains correctness under load', async () => {
    const limiter = new FallbackLimiter();
    const strictConfig: RateLimitConfig = {
      algorithm: 'token_bucket',
      limit: 5,
      windowMs: 60000,
    };

    const results = [];
    for (let i = 0; i < 20; i++) {
      results.push(await limiter.check('strict-key', strictConfig));
    }

    const allowed = results.filter(r => r.allowed).length;
    // With limit=5, at most ~6 should be allowed (with timing tolerance)
    expect(allowed).toBeLessThanOrEqual(7);
  });
});
