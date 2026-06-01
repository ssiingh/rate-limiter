import type { RateLimitResponse, RateLimitConfig } from '../../../models';

/**
 * Abstract interface for all rate limiting algorithms
 */
export interface RateLimitAlgorithm {
  readonly name: string;
  check(key: string, config: RateLimitConfig): Promise<RateLimitResponse>;
  reset(key: string): Promise<void>;
  getState(key: string): Promise<Record<string, unknown> | null>;
}
