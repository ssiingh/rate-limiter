import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdaptiveRateLimitEngine } from '../../main/services/adaptiveRateLimitEngine';
import rateLimiterConfig from '../../main/config/rateLimiterConfig';

vi.mock('../../src/config/rateLimiterConfig', () => ({
  default: {
    adaptiveEnabled: true,
    adaptiveEvaluationIntervalMs: 300000,
    adaptiveMinConfidenceThreshold: 0.7,
    adaptiveMaxAdjustmentFactor: 2.0,
    adaptiveMinCapacity: 10,
    adaptiveMaxCapacity: 100000,
  },
}));

describe('AdaptiveRateLimitEngine', () => {
  let engine: AdaptiveRateLimitEngine;
  let mockTrafficService: any;

  beforeEach(() => {
    mockTrafficService = {
      getAggregateStats: vi.fn().mockReturnValue({ totalKeys: 0, totalSnapshots: 0, signalCounts: {} }),
    };
    engine = new AdaptiveRateLimitEngine(mockTrafficService);
  });

  describe('Manual Overrides', () => {
    it('should set, retrieve, and clear a manual override', () => {
      engine.setManualOverride('test-key', 500);
      
      const status = engine.getStatus('test-key', 1.0);
      expect(status.isOverridden).toBe(true);
      expect(status.overrideLimit).toBe(500);

      const limit = engine.getAdjustedLimit('test-key', 100, 0.5, 0.9, 'THROTTLE', 'testing');
      expect(limit).toBe(500); // Override takes precedence

      engine.clearManualOverride('test-key');
      expect(engine.getStatus('test-key', 1.0).isOverridden).toBe(false);
    });
  });

  describe('Adaptive Adjustments', () => {
    it('returns the base limit when signal is STABLE', () => {
      const limit = engine.getAdjustedLimit('test-key', 100, 0.5, 0.9, 'STABLE', 'normal');
      expect(limit).toBe(100);
    });

    it('returns the base limit when confidence is below threshold', () => {
      const limit = engine.getAdjustedLimit('test-key', 100, 0.5, 0.5, 'THROTTLE', 'low confidence');
      expect(limit).toBe(100);
    });

    it('applies the limit multiplier and clamps within factors', () => {
      // Base limit 100, suggested 3.0x (300).
      // Since maxAdjustmentFactor is 2.0x, the multiplier should be clamped to 2.0
      // 100 * 2.0 = 200
      const limit = engine.getAdjustedLimit('test-key', 100, 3.0, 0.9, 'SCALE_UP', 'high traffic drop');
      expect(limit).toBe(200);
    });

    it('respects the absolute min and max capacity bounds', () => {
      // Rate limiter minimum capacity is configured to 10.
      const lowLimit = engine.getAdjustedLimit('low-key', 15, 0.1, 0.9, 'THROTTLE', 'testing');
      expect(lowLimit).toBe(10);

      // Rate limiter maximum capacity is configured to 100000.
      const highLimit = engine.getAdjustedLimit('high-key', 80000, 2.0, 0.9, 'SCALE_UP', 'testing');
      expect(highLimit).toBe(100000);
    });
  });

  describe('Config Status Lifecycle', () => {
    it('should return config matching properties', () => {
      const config = engine.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.minCapacity).toBe(10);
      expect(config.maxAdjustmentFactor).toBe(2.0);
    });
  });
});
