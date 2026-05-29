export interface AdminLimitRequest {
  key: string;
  limit: number;
  windowMs: number;
  algorithm?: string;
  expiresAt?: number;
}
