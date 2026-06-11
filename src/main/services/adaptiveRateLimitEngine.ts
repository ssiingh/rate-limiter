import rateLimiterConfig from '../config/rateLimiterConfig';
import { TrafficAnalysisService } from './trafficAnalysisService';
import { AdaptationDecisionEngine } from './adaptive/adaptationDecision';
import logger from '../utils/logger';

export interface AdaptiveStatus {
  key: string;
  enabled: boolean;
  isOverridden: boolean;
  overrideLimit?: number;
  currentMultiplier: number;
  lastEvaluated?: number;
}

export class AdaptiveRateLimitEngine {
  private manualOverrides: Map<string, number> = new Map();
  private timers: NodeJS.Timeout[] = [];
  private readonly decisionEngine: AdaptationDecisionEngine;

  constructor(private readonly trafficAnalysisService: TrafficAnalysisService) {
    this.decisionEngine = new AdaptationDecisionEngine(
      1 / rateLimiterConfig.adaptiveMaxAdjustmentFactor,
      rateLimiterConfig.adaptiveMaxAdjustmentFactor,
      rateLimiterConfig.adaptiveEvaluationIntervalMs * 2 // TTL is double the interval
    );
  }

  /**
   * Start the periodic evaluation task.
   */
  start(): void {
    if (!rateLimiterConfig.adaptiveEnabled) return;

    logger.info('Starting Adaptive ML Rate Limit Engine evaluation task');
    const timer = setInterval(() => {
      this.evaluateAll();
    }, rateLimiterConfig.adaptiveEvaluationIntervalMs);

    this.timers.push(timer);
  }

  /**
   * Stop the periodic evaluation task.
   */
  stop(): void {
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers = [];
  }

  /**
   * Evaluates all tracked keys and computes heuristic logic constraint-checked limits.
   */
  private evaluateAll(): void {
    // Phase 1 implementation applies rules proactively and logs.
    const stats = this.trafficAnalysisService.getAggregateStats();
    logger.info('Adaptive Engine Evaluation Cycle Started', { stats });
    // Core decision-making logic is driven through analyzing the TrafficPatternAnalyzer inside applyAdaptiveAdjustment proactively currently.
  }

  /**
   * Get the adaptive limit for a given key, considering bounds, confidence, and overrides.
   * If there is a manual override, it returns the explicit limit.
   */
  getAdjustedLimit(key: string, baseLimit: number, suggestedMultiplier: number, confidence: number, signal: string, reason: string): number {
    if (this.manualOverrides.has(key)) {
      return this.manualOverrides.get(key)!;
    }

    if (signal === 'STABLE' || confidence < rateLimiterConfig.adaptiveMinConfidenceThreshold) {
      return baseLimit;
    }

    const decision = this.decisionEngine.decide(signal as any, suggestedMultiplier, confidence, reason, key);

    const minLimit = rateLimiterConfig.adaptiveMinCapacity;
    const maxLimit = rateLimiterConfig.adaptiveMaxCapacity;

    const adjustedLimit = Math.floor(baseLimit * decision.limitMultiplier);
    
    return Math.max(minLimit, Math.min(maxLimit, adjustedLimit));
  }

  setManualOverride(key: string, limit: number): void {
    this.manualOverrides.set(key, limit);
    logger.info(`Manual override set for ${key}: ${limit}`);
  }

  clearManualOverride(key: string): void {
    this.manualOverrides.delete(key);
    logger.info(`Manual override cleared for ${key}`);
  }

  getStatus(key: string, currentMultiplier: number = 1.0): AdaptiveStatus {
    return {
      key,
      enabled: rateLimiterConfig.adaptiveEnabled,
      isOverridden: this.manualOverrides.has(key),
      overrideLimit: this.manualOverrides.get(key),
      currentMultiplier,
      lastEvaluated: Date.now(), // Abstracted for now
    };
  }

  getConfig(): Record<string, unknown> {
    return {
      enabled: rateLimiterConfig.adaptiveEnabled,
      evaluationIntervalMs: rateLimiterConfig.adaptiveEvaluationIntervalMs,
      minConfidenceThreshold: rateLimiterConfig.adaptiveMinConfidenceThreshold,
      maxAdjustmentFactor: rateLimiterConfig.adaptiveMaxAdjustmentFactor,
      minCapacity: rateLimiterConfig.adaptiveMinCapacity,
      maxCapacity: rateLimiterConfig.adaptiveMaxCapacity,
    };
  }
}

// Ensure the singleton binds to existing traffic service
const defaultTrafficService = new TrafficAnalysisService();
export const adaptiveRateLimitEngine = new AdaptiveRateLimitEngine(defaultTrafficService);
export default AdaptiveRateLimitEngine;
