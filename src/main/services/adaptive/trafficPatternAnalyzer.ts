import { ADAPTIVE } from '../../utils/constants';

export type AdaptationSignal = 'SCALE_UP' | 'SCALE_DOWN' | 'ALERT' | 'THROTTLE' | 'STABLE';

export interface TrafficWindow {
  timestamp: number;
  requestCount: number;
  rejectionRate: number;
}

export interface PatternAnalysis {
  signal: AdaptationSignal;
  ema: number;
  variance: number;
  zScore: number;
  anomalyScore: number;
  confidence: number;
  suggestedLimitMultiplier: number;
  reason: string;
}

/**
 * Adaptive rate limiting engine using Exponential Moving Average + Z-score anomaly detection
 */
export class TrafficPatternAnalyzer {
  private windows: TrafficWindow[] = [];
  private ema: number = 0;
  private emaVariance: number = 0;

  addSample(requestCount: number, rejectionRate: number): void {
    this.windows.push({ timestamp: Date.now(), requestCount, rejectionRate });

    // Keep only last N windows
    const maxWindows = ADAPTIVE.MIN_SAMPLES;
    if (this.windows.length > maxWindows) {
      this.windows = this.windows.slice(-maxWindows);
    }

    // Update EMA
    if (this.ema === 0) {
      this.ema = requestCount;
    } else {
      this.ema = ADAPTIVE.EMA_ALPHA * requestCount + (1 - ADAPTIVE.EMA_ALPHA) * this.ema;
    }

    // Update EMA variance (for Z-score)
    const diff = requestCount - this.ema;
    this.emaVariance = ADAPTIVE.EMA_ALPHA * diff * diff + (1 - ADAPTIVE.EMA_ALPHA) * this.emaVariance;
  }

  analyze(): PatternAnalysis {
    if (this.windows.length < 5) {
      return this.stableResult();
    }

    const stdDev = Math.sqrt(this.emaVariance);
    const lastWindow = this.windows[this.windows.length - 1];
    const zScore = stdDev > 0 ? (lastWindow.requestCount - this.ema) / stdDev : 0;

    // Anomaly score: normalized z-score influence
    const anomalyScore = Math.min(1, Math.abs(zScore) / ADAPTIVE.ZSCORE_THRESHOLD);

    let signal: AdaptationSignal = 'STABLE';
    let multiplier = 1.0;
    let reason = 'Traffic within normal range';

    if (zScore > ADAPTIVE.ZSCORE_THRESHOLD) {
      signal = 'THROTTLE';
      multiplier = Math.max(ADAPTIVE.MIN_SCALE_FACTOR, 1 / (1 + anomalyScore));
      reason = `Traffic spike detected (z-score: ${zScore.toFixed(2)})`;
    } else if (zScore < -ADAPTIVE.ZSCORE_THRESHOLD) {
      signal = 'SCALE_UP';
      multiplier = Math.min(ADAPTIVE.MAX_SCALE_FACTOR, 1 + anomalyScore * 0.5);
      reason = `Traffic drop detected, relaxing limits (z-score: ${zScore.toFixed(2)})`;
    } else if (lastWindow.rejectionRate > 0.8) {
      signal = 'ALERT';
      reason = `High rejection rate: ${(lastWindow.rejectionRate * 100).toFixed(1)}%`;
    }

    return {
      signal,
      ema: Math.round(this.ema),
      variance: Math.round(this.emaVariance),
      zScore: Math.round(zScore * 100) / 100,
      anomalyScore: Math.round(anomalyScore * 100) / 100,
      confidence: Math.min(1, this.windows.length / ADAPTIVE.MIN_SAMPLES),
      suggestedLimitMultiplier: multiplier,
      reason,
    };
  }

  private stableResult(): PatternAnalysis {
    return {
      signal: 'STABLE',
      ema: this.ema,
      variance: 0,
      zScore: 0,
      anomalyScore: 0,
      confidence: 0,
      suggestedLimitMultiplier: 1.0,
      reason: 'Insufficient samples for analysis',
    };
  }

  reset(): void {
    this.windows = [];
    this.ema = 0;
    this.emaVariance = 0;
  }
}

export default TrafficPatternAnalyzer;
