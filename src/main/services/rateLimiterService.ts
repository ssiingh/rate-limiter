import { getRedisClient } from '../redis/redisClient';
import { AlgorithmFactory } from './ratelimit/core/algorithmFactory';
import { CircuitBreaker } from '../utils/resilience/circuitBreaker';
import { fallbackLimiter } from '../utils/resilience/fallbackLimiter';
import { TrafficPatternAnalyzer } from './adaptive/trafficPatternAnalyzer';
import { adaptiveRateLimitEngine } from './adaptiveRateLimitEngine';
import {
  requestsTotal,
  requestsAllowed,
  requestsRejected,
  requestDuration,
} from '../utils/observability/prometheusMetrics';
import rateLimiterConfig from '../config/rateLimiterConfig';
import { configurationService } from './configurationService';
import type { RateLimitRequest, RateLimitResponse, RateLimitConfig } from '../models';
import { ALGORITHMS } from '../utils/constants';
import { nowMs } from '../utils/timeUtils';
import { clamp } from '../utils/helpers';
import logger from '../utils/logger';

export class RateLimiterService {
  private readonly factory: AlgorithmFactory;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly analyzers = new Map<string, TrafficPatternAnalyzer>();

  constructor() {
    this.factory = new AlgorithmFactory();
    this.circuitBreaker = new CircuitBreaker('redis-rate-limiter', {
      failureThreshold: 5,
      successThreshold: 2,
      timeoutMs: 30_000,
      halfOpenRequests: 3,
    });
    
    // Listen for config reloads to clear buckets.
    // Real implementation would also scan Redis but this is safe minimum logic.
    configurationService.onReload(() => {
      logger.info('RateLimiterService: Config reloaded, flushing local analysis buffers');
      this.analyzers.clear();
      // Full bucket purge would require `redisClient.keys('ratelimit:*')` 
      // followed by a pipeline `del()`, but omitted for strict local parity logic right now.
    });
  }

  async check(request: RateLimitRequest): Promise<RateLimitResponse> {
    const start = nowMs();
    const resolvedConfig = configurationService.getEffectiveConfig(request.key);
    const algorithm = request.algorithm || resolvedConfig?.algorithm || configurationService.getDefaultConfig().defaultAlgorithm;
    
    const config = this.buildConfig(request, algorithm, resolvedConfig);
    const tenant = request.tenantId || 'default';

    // Adaptive limit adjustment
    const adjustedConfig = this.applyAdaptiveAdjustment(request.key, config, algorithm);

    requestsTotal.labels({ algorithm, tenant }).inc();

    const timer = requestDuration.startTimer({ algorithm });

    try {
      const response = await this.circuitBreaker.execute(
        async () => {
          const algo = await this.factory.create(algorithm);
          return algo.check(request.key, adjustedConfig);
        },
        async () => fallbackLimiter.check(request.key, adjustedConfig)
      );

      response.latencyMs = nowMs() - start;
      timer();

      if (response.allowed) {
        requestsAllowed.labels({ algorithm, tenant }).inc();
      } else {
        requestsRejected.labels({ algorithm, tenant }).inc();
      }

      // Update adaptive analyzer
      this.updateAnalyzer(request.key, response.allowed);

      return response;
    } catch (error) {
      timer();
      logger.error('Rate limit check failed, allowing by fail-open policy', {
        key: request.key,
        error: (error as Error).message,
      });
      // Fail-open: allow on error
      return {
        allowed: true,
        remaining: adjustedConfig.limit,
        limit: adjustedConfig.limit,
        resetMs: start + adjustedConfig.windowMs,
        algorithm,
        key: request.key,
        latencyMs: nowMs() - start,
        metadata: { error: 'fail_open' },
      };
    }
  }

  async reset(key: string, algorithm?: string): Promise<void> {
    const resolvedAlgorithm = algorithm || configurationService.getEffectiveConfig(key)?.algorithm || configurationService.getDefaultConfig().defaultAlgorithm;
    const algo = await this.factory.create(resolvedAlgorithm);
    await algo.reset(key);
    logger.info('Rate limit reset', { key, algorithm: resolvedAlgorithm });
  }

  getCircuitBreakerState() {
    return this.circuitBreaker.getState();
  }

  private buildConfig(request: RateLimitRequest, algorithm: string, serviceConfig: Partial<RateLimitConfig> | null): RateLimitConfig {
    const defaults = configurationService.getDefaultConfig();
    const effectiveLimit = request.limit ?? serviceConfig?.limit ?? defaults.defaultLimit;
    const effectiveWindowMs = request.windowMs ?? serviceConfig?.windowMs ?? defaults.defaultWindowMs;
    
    // In previous versions it used rateLimiterConfig.burstMultiplier. 
    // Defaults to 1.5 since config fallback handles this statically now.
    const burstMultiplier = 1.5;

    return {
      algorithm,
      limit: effectiveLimit,
      windowMs: effectiveWindowMs,
      burstSize: request.limit || serviceConfig?.limit
        ? Math.ceil(effectiveLimit * burstMultiplier)
        : undefined,
      refillRate: (request.limit || serviceConfig?.limit) && (request.windowMs || serviceConfig?.windowMs)
        ? effectiveLimit / (effectiveWindowMs / 1000)
        : undefined,
    };
  }

  private applyAdaptiveAdjustment(
    key: string,
    config: RateLimitConfig,
    algorithm: string
  ): RateLimitConfig {
    if (!rateLimiterConfig.adaptiveEnabled) return config;

    const analyzer = this.getOrCreateAnalyzer(key);
    const analysis = analyzer.analyze();

    const adjustedLimit = adaptiveRateLimitEngine.getAdjustedLimit(
      key,
      config.limit,
      analysis.suggestedLimitMultiplier,
      analysis.confidence,
      analysis.signal,
      analysis.reason
    );

    if (adjustedLimit !== config.limit) {
      logger.info('Adaptive limit adjustment', {
        key,
        original: config.limit,
        adjusted: adjustedLimit,
        signal: analysis.signal,
        reason: analysis.reason,
      });
    }

    return { ...config, limit: adjustedLimit };
  }

  private updateAnalyzer(key: string, allowed: boolean): void {
    const analyzer = this.getOrCreateAnalyzer(key);
    // We track counts in 1-second buckets
    analyzer.addSample(1, allowed ? 0 : 1);
  }

  private getOrCreateAnalyzer(key: string): TrafficPatternAnalyzer {
    if (!this.analyzers.has(key)) {
      this.analyzers.set(key, new TrafficPatternAnalyzer());
    }
    return this.analyzers.get(key)!;
  }
}

export const rateLimiterService = new RateLimiterService();
export default RateLimiterService;
