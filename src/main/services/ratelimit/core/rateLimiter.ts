import Redis from 'ioredis';
import type { RateLimitConfig, RateLimitResponse } from '../../../models';
import { AlgorithmFactory } from './algorithmFactory';
import { CircuitBreaker } from '../../../utils/resilience/circuitBreaker';
import { FallbackLimiter } from '../../../utils/resilience/fallbackLimiter';
import { requestsTotal, requestsAllowed, requestsRejected, requestDuration } from '../../../utils/observability/prometheusMetrics';
import { KeyGenerator } from '../keys/keyGenerator';
import logger from '../../../utils/logger';
import { nowMs } from '../../../utils/timeUtils';

export interface RateLimiterOptions {
  redis: Redis;
  defaultAlgorithm?: string;
  defaultLimit?: number;
  defaultWindowMs?: number;
  circuitBreakerEnabled?: boolean;
  metricsEnabled?: boolean;
}

/**
 * Main rate limiter orchestrator.
 * Wraps algorithm resolution, circuit breaker, fallback, and metrics into a single entry point.
 */
export class RateLimiter {
  private readonly factory: AlgorithmFactory;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly fallback: FallbackLimiter;
  private readonly metricsEnabled: boolean;

  constructor(private readonly opts: RateLimiterOptions) {
    this.factory = new AlgorithmFactory(opts.redis);
    this.circuitBreaker = new CircuitBreaker('rate-limiter');
    this.fallback = new FallbackLimiter();
    this.metricsEnabled = opts.metricsEnabled ?? true;
  }

  /**
   * Check whether a request should be allowed.
   */
  async check(key: string, config: Partial<RateLimitConfig> = {}): Promise<RateLimitResponse> {
    const start = nowMs();
    const fullConfig = this.resolveConfig(config);
    const prefixedKey = KeyGenerator.generate({ algorithm: fullConfig.algorithm, key });

    try {
      const response = await this.circuitBreaker.execute<RateLimitResponse>(
        async () => {
          const algorithm = await this.factory.create(fullConfig.algorithm);
          return algorithm.check(prefixedKey, fullConfig);
        },
        async () => this.fallback.check(prefixedKey, fullConfig)
      );

      const latencyMs = nowMs() - start;
      if (this.metricsEnabled) {
        this.recordMetrics(fullConfig.algorithm, response.allowed, latencyMs);
      }

      return { ...response, latencyMs };
    } catch (error) {
      logger.error('Rate limiter check failed', { key, error });
      // Fail-open: allow the request on error
      return {
        allowed: true,
        remaining: -1,
        limit: fullConfig.limit,
        resetMs: start + fullConfig.windowMs,
        algorithm: fullConfig.algorithm,
        key: prefixedKey,
        latencyMs: nowMs() - start,
        metadata: { error: 'fail_open' },
      };
    }
  }

  /**
   * Reset rate limit state for a key.
   */
  async reset(key: string, algorithm?: string): Promise<void> {
    const algo = algorithm || this.opts.defaultAlgorithm || 'token_bucket';
    const prefixedKey = KeyGenerator.generate({ algorithm: algo, key });
    const alg = await this.factory.create(algo);
    await alg.reset(prefixedKey);
  }

  /**
   * Get current state of a rate limit key.
   */
  async getState(key: string, algorithm?: string): Promise<Record<string, unknown> | null> {
    const algo = algorithm || this.opts.defaultAlgorithm || 'token_bucket';
    const prefixedKey = KeyGenerator.generate({ algorithm: algo, key });
    const alg = await this.factory.create(algo);
    return alg.getState(prefixedKey);
  }

  getCircuitBreakerState(): string {
    return this.circuitBreaker.getState();
  }

  private resolveConfig(partial: Partial<RateLimitConfig>): RateLimitConfig {
    return {
      algorithm: partial.algorithm || this.opts.defaultAlgorithm || 'token_bucket',
      limit: partial.limit || this.opts.defaultLimit || 100,
      windowMs: partial.windowMs || this.opts.defaultWindowMs || 60_000,
      burstSize: partial.burstSize,
      refillRate: partial.refillRate,
      drainRate: partial.drainRate,
      capacity: partial.capacity,
      components: partial.components,
      combinationMode: partial.combinationMode,
    };
  }

  private recordMetrics(algorithm: string, allowed: boolean, latencyMs: number): void {
    try {
      requestsTotal.inc({ algorithm, tenant: 'default' });
      if (allowed) {
        requestsAllowed.inc({ algorithm, tenant: 'default' });
      } else {
        requestsRejected.inc({ algorithm, tenant: 'default' });
      }
      requestDuration.observe({ algorithm }, latencyMs / 1000);
    } catch {
      // Metrics should never block the main path
    }
  }
}

export default RateLimiter;
