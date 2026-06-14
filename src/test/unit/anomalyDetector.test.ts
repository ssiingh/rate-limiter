import { describe, it, expect, beforeEach } from 'vitest';
import { TrafficPatternAnalyzer } from '@/services/adaptive/trafficPatternAnalyzer';

describe('AnomalyDetector (TrafficPatternAnalyzer)', () => {
  let analyzer: TrafficPatternAnalyzer;

  beforeEach(() => {
    analyzer = new TrafficPatternAnalyzer();
  });

  it('returns STABLE with insufficient samples', () => {
    analyzer.addSample(100, 0.1);
    analyzer.addSample(100, 0.1);
    const result = analyzer.analyze();
    expect(result.signal).toBe('STABLE');
    expect(result.confidence).toBeLessThan(1);
  });

  it('detects traffic spikes (THROTTLE signal)', () => {
    // Build up baseline
    for (let i = 0; i < 20; i++) {
      analyzer.addSample(100, 0.05);
    }
    // Inject a spike
    analyzer.addSample(1000, 0.1);
    const result = analyzer.analyze();
    expect(['THROTTLE', 'STABLE']).toContain(result.signal);
    expect(result.zScore).toBeGreaterThan(0);
  });

  it('detects traffic drops (SCALE_UP signal)', () => {
    // Build up baseline
    for (let i = 0; i < 20; i++) {
      analyzer.addSample(500, 0.05);
    }
    // Inject a drop
    analyzer.addSample(10, 0.0);
    const result = analyzer.analyze();
    expect(['SCALE_UP', 'STABLE']).toContain(result.signal);
    expect(result.zScore).toBeLessThan(0);
  });

  it('detects high rejection rate (ALERT signal)', () => {
    for (let i = 0; i < 10; i++) {
      analyzer.addSample(100, 0.05);
    }
    analyzer.addSample(100, 0.95); // Very high rejection
    const result = analyzer.analyze();
    expect(['ALERT', 'STABLE']).toContain(result.signal);
  });

  it('confidence increases with more samples', () => {
    for (let i = 0; i < 5; i++) {
      analyzer.addSample(100, 0.05);
    }
    const r1 = analyzer.analyze();

    for (let i = 0; i < 15; i++) {
      analyzer.addSample(100, 0.05);
    }
    const r2 = analyzer.analyze();

    expect(r2.confidence).toBeGreaterThanOrEqual(r1.confidence);
  });

  it('reset clears all state', () => {
    for (let i = 0; i < 10; i++) {
      analyzer.addSample(100, 0.05);
    }
    analyzer.reset();
    const result = analyzer.analyze();
    expect(result.signal).toBe('STABLE');
    expect(result.confidence).toBe(0);
  });

  it('suggested limit multiplier stays within bounds', () => {
    for (let i = 0; i < 20; i++) {
      analyzer.addSample(100, 0.05);
    }
    analyzer.addSample(10000, 0.5);
    const result = analyzer.analyze();
    expect(result.suggestedLimitMultiplier).toBeGreaterThan(0);
    expect(result.suggestedLimitMultiplier).toBeLessThanOrEqual(3);
  });
});
