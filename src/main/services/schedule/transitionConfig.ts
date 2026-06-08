import type { RateLimitConfig } from '../../models';

/**
 * Configuration for transitioning between different rate limit configurations
 * based on schedule activations.
 */
export interface TransitionConfig {
  /** Unique ID for this transition rule */
  id: string;
  /** The schedule key this transition applies to */
  key: string;
  /** Configuration to apply when the schedule is active */
  activeConfig: Partial<RateLimitConfig>;
  /** Configuration to apply when the schedule is inactive (defaults to original) */
  inactiveConfig?: Partial<RateLimitConfig>;
  /** Whether to use gradual transition (ramp up/down) */
  gradual: boolean;
  /** Duration of the ramp transition in ms */
  rampDurationMs?: number;
  /** Priority (higher = evaluated first) */
  priority: number;
}

/**
 * Calculate the interpolated limit during a gradual transition.
 */
export function interpolateLimit(
  fromLimit: number,
  toLimit: number,
  progress: number // 0.0–1.0
): number {
  const clamped = Math.max(0, Math.min(1, progress));
  return Math.round(fromLimit + (toLimit - fromLimit) * clamped);
}
