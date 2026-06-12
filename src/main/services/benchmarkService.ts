import type { BenchmarkRequest, BenchmarkResult } from '../models';
import logger from '../utils/logger';
import { nowMs } from '../utils/timeUtils';

interface CheckFn {
  (key: string): Promise<{ allowed: boolean }>;
}

/**
 * Orchestrates load generation scenarios for benchmarking the rate limiter.
 * Supports burst, sustained, mixed, and stress test scenarios.
 */
export class BenchmarkService {
  /**
   * Run a benchmark scenario.
   * @param request  Benchmark configuration
   * @param checkFn Function to call for each rate-limit check
   */
  async run(request: BenchmarkRequest, checkFn: CheckFn): Promise<BenchmarkResult> {
    const { scenario, concurrency, durationMs, algorithm } = request;
    logger.info('Starting benchmark', { scenario, concurrency, durationMs, algorithm });

    const latencies: number[] = [];
    let allowed = 0;
    let rejected = 0;
    let errors = 0;
    const stopAt = nowMs() + durationMs;
    let requestId = 0;

    const worker = async (): Promise<void> => {
      while (nowMs() < stopAt) {
        const key = `bench:${scenario}:${requestId++}`;
        const start = nowMs();
        try {
          const result = await checkFn(key);
          const elapsed = nowMs() - start;
          latencies.push(elapsed);
          if (result.allowed) allowed++;
          else rejected++;
        } catch {
          errors++;
        }

        // For sustained scenario, add small delay between requests
        if (scenario === 'sustained') {
          await this.sleep(1);
        }
      }
    };

    const start = nowMs();
    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);
    const actualDuration = nowMs() - start;

    const sorted = [...latencies].sort((a, b) => a - b);
    const percentile = (p: number): number => {
      if (sorted.length === 0) return 0;
      const idx = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, idx)];
    };

    const total = allowed + rejected + errors;
    const result: BenchmarkResult = {
      scenario,
      totalRequests: total,
      allowedRequests: allowed,
      rejectedRequests: rejected,
      durationMs: actualDuration,
      actualRps: total / (actualDuration / 1000),
      p50LatencyMs: percentile(50),
      p95LatencyMs: percentile(95),
      p99LatencyMs: percentile(99),
      maxLatencyMs: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
      errorRate: total > 0 ? errors / total : 0,
      algorithm,
    };

    logger.info('Benchmark complete', result);
    return result;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default BenchmarkService;
