import { getMetricsString, requestsTotal, requestsAllowed, requestsRejected, requestDuration } from '../utils/observability/prometheusMetrics';
import type { MetricsResponse } from '../models';
import logger from '../utils/logger';

/**
 * Aggregates metrics from Prometheus counters and in-memory state
 * to produce a unified MetricsResponse.
 */
export class MetricsService {
  private startTime = Date.now();
  private totalRequests = 0;
  private allowedRequests = 0;
  private rejectedRequests = 0;
  private latencies: number[] = [];
  private algorithmStats: Record<string, { requests: number; rejections: number }> = {};

  recordRequest(algorithm: string, allowed: boolean, latencyMs: number): void {
    this.totalRequests++;
    if (allowed) {
      this.allowedRequests++;
    } else {
      this.rejectedRequests++;
    }
    this.latencies.push(latencyMs);

    // Keep latencies bounded (rolling 10k window)
    if (this.latencies.length > 10_000) {
      this.latencies = this.latencies.slice(-10_000);
    }

    if (!this.algorithmStats[algorithm]) {
      this.algorithmStats[algorithm] = { requests: 0, rejections: 0 };
    }
    this.algorithmStats[algorithm].requests++;
    if (!allowed) {
      this.algorithmStats[algorithm].rejections++;
    }
  }

  getMetrics(redisConnected: boolean, circuitBreakerState: string): MetricsResponse {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const pct = (p: number): number => {
      if (sorted.length === 0) return 0;
      const idx = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, idx)];
    };

    return {
      uptime: Date.now() - this.startTime,
      totalRequests: this.totalRequests,
      allowedRequests: this.allowedRequests,
      rejectedRequests: this.rejectedRequests,
      rejectionRate: this.totalRequests > 0 ? this.rejectedRequests / this.totalRequests : 0,
      p50LatencyMs: pct(50),
      p95LatencyMs: pct(95),
      p99LatencyMs: pct(99),
      activeKeys: 0, // Populated by caller via Redis DBSIZE
      redisConnected,
      circuitBreakerState,
      algorithm: { ...this.algorithmStats },
      timestamp: new Date().toISOString(),
    };
  }

  async getPrometheusText(): Promise<string> {
    try {
      return await getMetricsString();
    } catch (error) {
      logger.error('Failed to get Prometheus metrics', { error });
      return '# Error collecting metrics\n';
    }
  }

  reset(): void {
    this.totalRequests = 0;
    this.allowedRequests = 0;
    this.rejectedRequests = 0;
    this.latencies = [];
    this.algorithmStats = {};
  }
}

export default MetricsService;
