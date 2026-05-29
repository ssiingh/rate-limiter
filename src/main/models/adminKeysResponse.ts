export interface AdminKeysResponse {
  keys: { key: string; algorithm: string; limit: number; windowMs: number }[];
  total: number;
  page: number;
  limit: number;
}
