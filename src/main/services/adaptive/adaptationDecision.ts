import type { AdaptationSignal } from './adaptationSignal';

/**
 * Represents a decision made by the adaptive engine about how to adjust rate limits.
 */
export interface AdaptationDecision {
  /** The signal that triggered this decision */
  signal: AdaptationSignal;
  /** Multiplier to apply to the current limit (e.g., 0.8 = reduce by 20%) */
  limitMultiplier: number;
  /** Confidence level 0–1 */
  confidence: number;
  /** Human-readable reason */
  reason: string;
  /** Target key or scope */
  scope: string;
  /** When this decision was made */
  timestamp: number;
  /** Time-to-live: how long this decision should remain in effect (ms) */
  ttlMs: number;
}

/**
 * Decision engine that translates pattern analysis into concrete limit adjustments.
 */
export class AdaptationDecisionEngine {
  private readonly minMultiplier: number;
  private readonly maxMultiplier: number;
  private readonly defaultTtlMs: number;

  constructor(
    minMultiplier = 0.1,
    maxMultiplier = 3.0,
    defaultTtlMs = 60_000
  ) {
    this.minMultiplier = minMultiplier;
    this.maxMultiplier = maxMultiplier;
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Produce an adaptation decision from a signal and analysis data.
   */
  decide(
    signal: AdaptationSignal,
    suggestedMultiplier: number,
    confidence: number,
    reason: string,
    scope = 'global'
  ): AdaptationDecision {
    const clampedMultiplier = Math.max(
      this.minMultiplier,
      Math.min(this.maxMultiplier, suggestedMultiplier)
    );

    // Only apply decisions we're confident about (>50%)
    const effectiveMultiplier = confidence >= 0.5 ? clampedMultiplier : 1.0;

    return {
      signal,
      limitMultiplier: effectiveMultiplier,
      confidence,
      reason,
      scope,
      timestamp: Date.now(),
      ttlMs: this.defaultTtlMs,
    };
  }

  /**
   * Check whether a decision is still in effect.
   */
  isExpired(decision: AdaptationDecision): boolean {
    return Date.now() > decision.timestamp + decision.ttlMs;
  }
}

export default AdaptationDecisionEngine;
