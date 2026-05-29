export interface BenchmarkRequest {
  scenario: 'burst' | 'sustained' | 'mixed' | 'stress';
  concurrency: number;
  durationMs: number;
  targetRps?: number;
  algorithm?: string;
}

export interface BenchmarkResult {
  scenario: string;
  totalRequests: number;
  allowedRequests: number;
  rejectedRequests: number;
  durationMs: number;
  actualRps: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;
  errorRate: number;
  algorithm?: string;
}
