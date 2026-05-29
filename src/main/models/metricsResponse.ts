export interface MetricsResponse {
  uptime: number;
  totalRequests: number;
  allowedRequests: number;
  rejectedRequests: number;
  rejectionRate: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  activeKeys: number;
  redisConnected: boolean;
  circuitBreakerState: string;
  algorithm: Record<string, { requests: number; rejections: number }>;
  timestamp: string;
}
