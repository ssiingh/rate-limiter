export interface ComponentConfig {
  key: string;
  algorithm: string;
  limit: number;
  windowMs: number;
  weight?: number;
}

export interface RateLimitConfig {
  algorithm: string;
  limit: number;
  windowMs: number;
  burstSize?: number;
  refillRate?: number;
  drainRate?: number;
  capacity?: number;
  components?: ComponentConfig[];
  combinationMode?: 'AND' | 'OR' | 'PRIORITY';
}
