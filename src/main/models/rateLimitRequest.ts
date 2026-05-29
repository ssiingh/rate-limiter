export interface RateLimitRequest {
  key: string;
  algorithm?: string;
  limit?: number;
  windowMs?: number;
  cost?: number;
  endpoint?: string;
  tenantId?: string;
  userId?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}
