/**
 * HDR-histogram-inspired latency tracker for benchmark measurements.
 * Tracks P50, P95, P99, min, max, and mean latencies.
 */
export class LatencyTracker {
  private samples: number[] = [];
  private sorted = false;

  /**
   * Record a latency measurement in milliseconds.
   */
  record(latencyMs: number): void {
    this.samples.push(latencyMs);
    this.sorted = false;
  }

  /**
   * Get a percentile value (0–100).
   */
  percentile(p: number): number {
    this.ensureSorted();
    if (this.samples.length === 0) return 0;
    const idx = Math.ceil((p / 100) * this.samples.length) - 1;
    return this.samples[Math.max(0, idx)];
  }

  get p50(): number { return this.percentile(50); }
  get p95(): number { return this.percentile(95); }
  get p99(): number { return this.percentile(99); }

  get min(): number {
    return this.samples.length > 0 ? Math.min(...this.samples) : 0;
  }

  get max(): number {
    return this.samples.length > 0 ? Math.max(...this.samples) : 0;
  }

  get mean(): number {
    if (this.samples.length === 0) return 0;
    return this.samples.reduce((sum, s) => sum + s, 0) / this.samples.length;
  }

  get count(): number {
    return this.samples.length;
  }

  /**
   * Get a full summary of all tracked latencies.
   */
  getSummary(): {
    count: number;
    min: number;
    max: number;
    mean: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    return {
      count: this.count,
      min: this.min,
      max: this.max,
      mean: Math.round(this.mean * 100) / 100,
      p50: this.p50,
      p95: this.p95,
      p99: this.p99,
    };
  }

  /**
   * Reset all tracked samples.
   */
  reset(): void {
    this.samples = [];
    this.sorted = false;
  }

  private ensureSorted(): void {
    if (!this.sorted) {
      this.samples.sort((a, b) => a - b);
      this.sorted = true;
    }
  }
}

export default LatencyTracker;
