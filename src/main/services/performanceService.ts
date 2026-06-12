import logger from '../utils/logger';

export interface PerformanceBaseline {
  testName: string;
  timestamp: string;
  averageResponseTime: number;
  throughputPerSecond: number;
  successRate: number;
  maxResponseTime?: number;
  p95ResponseTime?: number;
  errorRate?: number;
}

export interface RegressionAnalysis {
  testName: string;
  regressionDetected: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  responseTimeRegression?: {
    current: number;
    baseline: number;
    change: number;
    threshold: number;
    isRegression: boolean;
  };
  throughputRegression?: {
    current: number;
    baseline: number;
    change: number;
    threshold: number;
    isRegression: boolean;
  };
  summary: string;
}

export class PerformanceService {
  private baselines = new Map<string, PerformanceBaseline[]>();

  storeBaseline(baseline: PerformanceBaseline): void {
    const list = this.baselines.get(baseline.testName) || [];
    list.push(baseline);
    // keep last 100
    if (list.length > 100) list.shift();
    this.baselines.set(baseline.testName, list);
    logger.info('Stored performance baseline', { testName: baseline.testName });
  }

  getBaselines(testName: string, limit: number = 10): PerformanceBaseline[] {
    const list = this.baselines.get(testName) || [];
    return list.slice(-limit).reverse();
  }

  analyzeRegression(
    current: PerformanceBaseline,
    rtThreshold: number = 20,
    tpThreshold: number = 15
  ): RegressionAnalysis {
    const list = this.baselines.get(current.testName) || [];
    if (list.length === 0) {
      return {
        testName: current.testName,
        regressionDetected: false,
        severity: 'LOW',
        summary: 'No previous baselines to compare against.',
      };
    }

    // Compare against the latest baseline
    const baseline = list[list.length - 1];
    
    const rtChange = ((current.averageResponseTime - baseline.averageResponseTime) / baseline.averageResponseTime) * 100;
    const isRtRegression = rtChange > rtThreshold;

    const tpChange = ((current.throughputPerSecond - baseline.throughputPerSecond) / baseline.throughputPerSecond) * 100;
    const isTpRegression = tpChange < -tpThreshold; // Throughput drops are regressions

    const regressionDetected = isRtRegression || isTpRegression;
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (regressionDetected) {
      severity = (rtChange > 50 || tpChange < -50) ? 'HIGH' : 'MEDIUM';
    }

    return {
      testName: current.testName,
      regressionDetected,
      severity,
      responseTimeRegression: {
        current: current.averageResponseTime,
        baseline: baseline.averageResponseTime,
        change: Number(rtChange.toFixed(2)),
        threshold: rtThreshold,
        isRegression: isRtRegression,
      },
      throughputRegression: {
        current: current.throughputPerSecond,
        baseline: baseline.throughputPerSecond,
        change: Number(tpChange.toFixed(2)),
        threshold: tpThreshold,
        isRegression: isTpRegression,
      },
      summary: regressionDetected 
        ? 'Performance regression detected' 
        : 'Performance is within acceptable thresholds',
    };
  }
}

export const performanceService = new PerformanceService();
