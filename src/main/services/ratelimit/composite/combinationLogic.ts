import type { RateLimitResponse } from '../../../models';
import type { ComponentResult } from './limitComponent';

export type CombinationMode = 'AND' | 'OR' | 'PRIORITY';

/**
 * Combination logic for composite rate limiting.
 * Determines the final allow/deny decision from multiple component results.
 */
export class CombinationLogic {
  /**
   * Combine results from multiple rate limit components.
   *
   * - AND: All components must allow → request is allowed
   * - OR:  Any component allows → request is allowed
   * - PRIORITY: Use the result from the highest-weight component
   */
  static combine(results: ComponentResult[], mode: CombinationMode): RateLimitResponse {
    if (results.length === 0) {
      throw new Error('CombinationLogic: no component results provided');
    }

    switch (mode) {
      case 'AND':
        return this.combineAnd(results);
      case 'OR':
        return this.combineOr(results);
      case 'PRIORITY':
        return this.combinePriority(results);
      default:
        throw new Error(`CombinationLogic: unknown mode "${mode}"`);
    }
  }

  private static combineAnd(results: ComponentResult[]): RateLimitResponse {
    const allowed = results.every((r) => r.response.allowed);
    // Use the most restrictive (lowest remaining) component's view
    const mostRestrictive = results.reduce((prev, curr) =>
      curr.response.remaining < prev.response.remaining ? curr : prev
    );
    return {
      ...mostRestrictive.response,
      allowed,
      metadata: {
        combinationMode: 'AND',
        components: results.map((r) => ({
          id: r.component.id,
          allowed: r.response.allowed,
          remaining: r.response.remaining,
        })),
      },
    };
  }

  private static combineOr(results: ComponentResult[]): RateLimitResponse {
    const allowed = results.some((r) => r.response.allowed);
    // Use the most permissive component's view
    const mostPermissive = results.reduce((prev, curr) =>
      curr.response.remaining > prev.response.remaining ? curr : prev
    );
    return {
      ...mostPermissive.response,
      allowed,
      metadata: {
        combinationMode: 'OR',
        components: results.map((r) => ({
          id: r.component.id,
          allowed: r.response.allowed,
          remaining: r.response.remaining,
        })),
      },
    };
  }

  private static combinePriority(results: ComponentResult[]): RateLimitResponse {
    // Sort by weight descending, take the winner
    const sorted = [...results].sort((a, b) => b.component.weight - a.component.weight);
    const winner = sorted[0];
    return {
      ...winner.response,
      metadata: {
        combinationMode: 'PRIORITY',
        selectedComponent: winner.component.id,
        components: results.map((r) => ({
          id: r.component.id,
          weight: r.component.weight,
          allowed: r.response.allowed,
        })),
      },
    };
  }
}

export default CombinationLogic;
