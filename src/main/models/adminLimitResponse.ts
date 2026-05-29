export interface AdminLimitResponse {
  key: string;
  limit: number;
  windowMs: number;
  algorithm: string;
  expiresAt?: number;
  createdAt: string;
  updatedAt: string;
}
