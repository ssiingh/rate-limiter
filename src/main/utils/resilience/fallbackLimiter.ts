import type { RateLimitResponse, RateLimitConfig } from '../../models';
import { ALGORITHMS } from '../constants';
import logger from '../logger';

// Simple in-memory fallback rate limiter when Redis is unavailable
class InMemoryCounter {
  private counts = new Map<string, { count: number; resetAt: number }>();

  increment(key: string, windowMs: number): { count: number; resetAt: number } {
    const now = Date.now();
    const existing = this.counts.get(key);
    
    if (existing && existing.resetAt > now) {
      existing.count++;
      return existing;
    }
    
    const entry = { count: 1, resetAt: now + windowMs };
    this.counts.set(key, entry);
    return entry;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.counts) {
      if (value.resetAt <= now) this.counts.delete(key);
    }
  }
}

const counter = new InMemoryCounter();

// Cleanup expired entries every 60 seconds
setInterval(() => counter.cleanup(), 60_000).unref();

export class FallbackLimiter {
  private readonly degradedLimitMultiplier = 0.5; // 50% of normal limit in degraded mode

  check(key: string, config: RateLimitConfig): RateLimitResponse {
    const { limit, windowMs } = config;
    const degradedLimit = Math.max(1, Math.floor(limit * this.degradedLimitMultiplier));
    
    const { count, resetAt } = counter.increment(key, windowMs);
    const allowed = count <= degradedLimit;
    
    logger.warn('Fallback limiter active (Redis unavailable)', { key, count, limit: degradedLimit });

    return {
      allowed,
      remaining: Math.max(0, degradedLimit - count),
      limit: degradedLimit,
      resetMs: resetAt,
      algorithm: `fallback:${config.algorithm || ALGORITHMS.FIXED_WINDOW}`,
      key,
      metadata: { degraded: true, originalLimit: limit },
    };
  }
}

export const fallbackLimiter = new FallbackLimiter();
export default FallbackLimiter;
