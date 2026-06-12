import { AnomalyDetectorService } from './anomalyDetectorService';
import type { PatternAnalysis, AdaptationSignal } from './adaptive/trafficPatternAnalyzer';
import logger from '../utils/logger';

interface TrafficSnapshot {
  key: string;
  timestamp: number;
  requestCount: number;
  rejectionRate: number;
  analysis: PatternAnalysis;
}

/**
 * Real-time traffic pattern analysis service.
 * Aggregates per-key traffic data and produces adaptation signals.
 */
export class TrafficAnalysisService {
  private readonly detector: AnomalyDetectorService;
  private readonly history: TrafficSnapshot[] = [];
  private readonly maxHistory: number;

  constructor(maxHistory = 1000) {
    this.detector = new AnomalyDetectorService();
    this.maxHistory = maxHistory;
  }

  /**
   * Record traffic data and analyze patterns.
   */
  analyze(key: string, requestCount: number, rejectionRate: number): PatternAnalysis {
    const analysis = this.detector.recordAndAnalyze(key, requestCount, rejectionRate);

    this.history.push({
      key,
      timestamp: Date.now(),
      requestCount,
      rejectionRate,
      analysis,
    });

    // Trim history
    if (this.history.length > this.maxHistory) {
      this.history.splice(0, this.history.length - this.maxHistory);
    }

    return analysis;
  }

  /**
   * Get the most recent snapshots, optionally filtered by signal.
   */
  getRecentSnapshots(limit = 50, signal?: AdaptationSignal): TrafficSnapshot[] {
    let snapshots = this.history;
    if (signal) {
      snapshots = snapshots.filter((s) => s.analysis.signal === signal);
    }
    return snapshots.slice(-limit);
  }

  /**
   * Get aggregate stats across all monitored keys.
   */
  getAggregateStats(): {
    totalKeys: number;
    totalSnapshots: number;
    signalCounts: Record<string, number>;
  } {
    const signalCounts: Record<string, number> = {};
    for (const snapshot of this.history) {
      signalCounts[snapshot.analysis.signal] =
        (signalCounts[snapshot.analysis.signal] || 0) + 1;
    }

    return {
      totalKeys: this.detector.getActiveCount(),
      totalSnapshots: this.history.length,
      signalCounts,
    };
  }

  reset(): void {
    this.detector.resetAll();
    this.history.length = 0;
  }
}

export default TrafficAnalysisService;
