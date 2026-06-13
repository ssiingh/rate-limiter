import { LoadGenerator } from './loadGenerator';
import { LatencyTracker } from './latencyTracker';
import { ThroughputCalculator } from './throughputCalculator';
import type { BenchmarkRequest, BenchmarkResult } from '../models';
import logger from '../utils/logger';
import { nowMs } from '../utils/timeUtils';

interface ScenarioCheckFn {
  (key: string): Promise<{ allowed: boolean }>;
}

/**
 * Orchestrates benchmark scenarios using LoadGenerator, LatencyTracker,
 * and ThroughputCalculator components.
 */
export class ScenarioRunner {
  private readonly generator: LoadGenerator;
  private readonly latency: LatencyTracker;
  private readonly throughput: ThroughputCalculator;

  constructor() {
    this.generator = new LoadGenerator();
    this.latency = new LatencyTracker();
    this.throughput = new ThroughputCalculator();
  }

  /**
   * Run a complete benchmark scenario.
   */
  async run(request: BenchmarkRequest, checkFn: ScenarioCheckFn): Promise<BenchmarkResult> {
    const { scenario, concurrency, durationMs, algorithm } = request;
    const targetRps = request.targetRps || concurrency * 100;

    logger.info('Scenario starting', { scenario, concurrency, durationMs, targetRps });

    this.latency.reset();
    this.throughput.reset();

    let allowed = 0;
    let rejected = 0;
    let errors = 0;
    const start = nowMs();

    await this.generator.generate(
      targetRps,
      durationMs,
      concurrency,
      async (requestId: number) => {
        const key = `bench:${scenario}:${requestId}`;
        const reqStart = nowMs();
        try {
          const result = await checkFn(key);
          const elapsed = nowMs() - reqStart;
          this.latency.record(elapsed);
          this.throughput.record();
          if (result.allowed) allowed++;
          else rejected++;
        } catch {
          errors++;
        }
      }
    );

    const actualDuration = nowMs() - start;
    const total = allowed + rejected + errors;

    const result: BenchmarkResult = {
      scenario,
      totalRequests: total,
      allowedRequests: allowed,
      rejectedRequests: rejected,
      durationMs: actualDuration,
      actualRps: total / (actualDuration / 1000),
      p50LatencyMs: this.latency.p50,
      p95LatencyMs: this.latency.p95,
      p99LatencyMs: this.latency.p99,
      maxLatencyMs: this.latency.max,
      errorRate: total > 0 ? errors / total : 0,
      algorithm,
    };

    logger.info('Scenario complete', result);
    return result;
  }

  /**
   * Run multiple scenarios in sequence.
   */
  async runSuite(
    scenarios: BenchmarkRequest[],
    checkFn: ScenarioCheckFn
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];
    for (const scenario of scenarios) {
      const result = await this.run(scenario, checkFn);
      results.push(result);
      // Brief pause between scenarios
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return results;
  }
}

export default ScenarioRunner;
