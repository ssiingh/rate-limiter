export interface RateLimitResponse {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetMs: number;
  algorithm: string;
  key: string;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}
