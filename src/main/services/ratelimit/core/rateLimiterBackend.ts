import type { RateLimitResponse, RateLimitConfig } from '../../../models';

/**
 * Backend interface for rate limit storage (Redis or in-memory)
 */
export interface RateLimiterBackend {
  readonly isAvailable: boolean;
  check(key: string, config: RateLimitConfig, algorithm: string): Promise<RateLimitResponse>;
  reset(key: string, algorithm: string): Promise<void>;
  getState(key: string, algorithm: string): Promise<Record<string, unknown> | null>;
  ping(): Promise<boolean>;
}
