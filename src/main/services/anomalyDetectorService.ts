import { TrafficPatternAnalyzer, type PatternAnalysis } from './adaptive/trafficPatternAnalyzer';
import logger from '../utils/logger';

/**
 * Wraps TrafficPatternAnalyzer with persistence-aware anomaly detection.
 * Maintains per-key analyzers and produces adaptation decisions.
 */
export class AnomalyDetectorService {
  private readonly analyzers = new Map<string, TrafficPatternAnalyzer>();
  private readonly maxAnalyzers: number;

  constructor(maxAnalyzers = 1000) {
    this.maxAnalyzers = maxAnalyzers;
  }

  /**
   * Record a traffic sample for a given key and return the current analysis.
   */
  recordAndAnalyze(key: string, requestCount: number, rejectionRate: number): PatternAnalysis {
    let analyzer = this.analyzers.get(key);
    if (!analyzer) {
      if (this.analyzers.size >= this.maxAnalyzers) {
        // Evict oldest key (first entry in Map insertion order)
        const firstKey = this.analyzers.keys().next().value;
        if (firstKey !== undefined) {
          this.analyzers.delete(firstKey);
        }
      }
      analyzer = new TrafficPatternAnalyzer();
      this.analyzers.set(key, analyzer);
    }

    analyzer.addSample(requestCount, rejectionRate);
    const analysis = analyzer.analyze();

    if (analysis.signal !== 'STABLE') {
      logger.info('Anomaly detected', { key, signal: analysis.signal, zScore: analysis.zScore });
    }

    return analysis;
  }

  /**
   * Get the current analysis for a key without recording a new sample.
   */
  getAnalysis(key: string): PatternAnalysis | null {
    const analyzer = this.analyzers.get(key);
    return analyzer ? analyzer.analyze() : null;
  }

  /**
   * Reset the analyzer for a specific key.
   */
  resetKey(key: string): void {
    this.analyzers.delete(key);
  }

  /**
   * Get the number of active analyzers.
   */
  getActiveCount(): number {
    return this.analyzers.size;
  }

  /**
   * Reset all analyzers.
   */
  resetAll(): void {
    this.analyzers.clear();
  }
}

export default AnomalyDetectorService;
