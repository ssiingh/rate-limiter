import { Request, Response } from 'express';
import { rateLimiterService } from '../services/rateLimiterService';
import { validate, BenchmarkRequestSchema } from '../utils/validation';
import { sleep } from '../utils/helpers';
import { percentile } from '../utils/helpers';
import { HTTP_STATUS, ALGORITHMS } from '../utils/constants';
import type { BenchmarkResult } from '../models';

export async function runBenchmark(req: Request, res: Response): Promise<void> {
  const input = validate(BenchmarkRequestSchema, req.body);
  const scenario = input.scenario ?? 'sustained';
  const concurrency = input.concurrency ?? 50;
  const durationMs = input.durationMs ?? 30_000;
  const algorithm = input.algorithm;

  const startTime = Date.now();
  const latencies: number[] = [];
  let totalRequests = 0;
  let allowedRequests = 0;
  let rejectedRequests = 0;

  const testKey = `benchmark:${scenario}:${Date.now()}`;
  const endTime = startTime + durationMs;

  const sendRequest = async () => {
    while (Date.now() < endTime) {
      const reqStart = Date.now();
      const result = await rateLimiterService.check({
        key: testKey,
        algorithm: algorithm || ALGORITHMS.TOKEN_BUCKET,
        limit: 10000,
        windowMs: 1000,
      });
      latencies.push(Date.now() - reqStart);
      totalRequests++;
      result.allowed ? allowedRequests++ : rejectedRequests++;
      await sleep(0); // yield
    }
  };

  // Run concurrent workers
  await Promise.all(Array.from({ length: concurrency }, sendRequest));

  const actualDuration = Date.now() - startTime;
  latencies.sort((a, b) => a - b);

  const result: BenchmarkResult = {
    scenario,
    totalRequests,
    allowedRequests,
    rejectedRequests,
    durationMs: actualDuration,
    actualRps: Math.round((totalRequests / actualDuration) * 1000),
    p50LatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
    p99LatencyMs: percentile(latencies, 99),
    maxLatencyMs: latencies[latencies.length - 1] || 0,
    errorRate: totalRequests > 0 ? rejectedRequests / totalRequests : 0,
    algorithm,
  };

  res.status(HTTP_STATUS.OK).json(result);
}
