import { nowMs } from '../utils/timeUtils';

/**
 * Calculates throughput (requests per second) over a sliding window.
 */
export class ThroughputCalculator {
  private timestamps: number[] = [];
  private readonly windowMs: number;

  constructor(windowMs = 1000) {
    this.windowMs = windowMs;
  }

  /**
   * Record a request timestamp.
   */
  record(): void {
    const now = nowMs();
    this.timestamps.push(now);
    this.cleanup(now);
  }

  /**
   * Get the current RPS (requests per second) based on the sliding window.
   */
  getRps(): number {
    const now = nowMs();
    this.cleanup(now);
    const windowSec = this.windowMs / 1000;
    return this.timestamps.length / windowSec;
  }

  /**
   * Get throughput statistics.
   */
  getStats(): {
    currentRps: number;
    totalRequests: number;
    windowMs: number;
  } {
    return {
      currentRps: Math.round(this.getRps() * 100) / 100,
      totalRequests: this.timestamps.length,
      windowMs: this.windowMs,
    };
  }

  /**
   * Reset all recordings.
   */
  reset(): void {
    this.timestamps = [];
  }

  private cleanup(now: number): void {
    const cutoff = now - this.windowMs;
    // Binary search for the cutoff point
    let low = 0;
    let high = this.timestamps.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.timestamps[mid] < cutoff) low = mid + 1;
      else high = mid;
    }
    if (low > 0) {
      this.timestamps = this.timestamps.slice(low);
    }
  }
}

export default ThroughputCalculator;
