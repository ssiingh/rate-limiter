import type { RateLimitConfig, RateLimitResponse } from '../../../models';

/**
 * Represents a single component within a composite rate limiter.
 * Each component runs an independent algorithm and produces its own response.
 */
export interface LimitComponent {
  /** Unique identifier for this component */
  id: string;
  /** The algorithm type (e.g. 'token_bucket', 'sliding_window') */
  algorithm: string;
  /** Configuration for this component */
  config: RateLimitConfig;
  /** Weight used in priority-based combination (higher = more important) */
  weight: number;
}

/**
 * Result from evaluating a single component within a composite limiter.
 */
export interface ComponentResult {
  component: LimitComponent;
  response: RateLimitResponse;
}

/**
 * Creates a LimitComponent from a partial configuration.
 */
export function createLimitComponent(
  id: string,
  algorithm: string,
  config: Partial<RateLimitConfig>,
  weight = 1.0
): LimitComponent {
  return {
    id,
    algorithm,
    config: {
      algorithm,
      limit: config.limit ?? 100,
      windowMs: config.windowMs ?? 60_000,
      burstSize: config.burstSize,
      refillRate: config.refillRate,
      drainRate: config.drainRate,
      capacity: config.capacity,
    },
    weight,
  };
}
