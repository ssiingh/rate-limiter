import dotenv from 'dotenv';
import { ALGORITHMS, DEFAULT_LIMITS } from '../utils/constants';
import type { AlgorithmName } from '../utils/constants';
dotenv.config();

export interface AlgorithmConfig {
  algorithm: AlgorithmName;
  limit: number;
  windowMs: number;
  burstSize?: number;
  refillRate?: number;
  drainRate?: number;
  capacity?: number;
  components?: ComponentConfig[];
}

export interface ComponentConfig {
  algorithm: AlgorithmName;
  limit: number;
  windowMs: number;
  weight?: number;
}

export interface RateLimiterConfig {
  defaultAlgorithm: AlgorithmName;
  defaultLimit: number;
  defaultWindowMs: number;
  burstMultiplier: number;
  adaptiveEnabled: boolean;
  adaptiveEvaluationIntervalMs: number;
  adaptiveMinConfidenceThreshold: number;
  adaptiveMaxAdjustmentFactor: number;
  adaptiveMinCapacity: number;
  adaptiveMaxCapacity: number;
  endpoints: Record<string, AlgorithmConfig>;
  ip: AlgorithmConfig;
  tenant: AlgorithmConfig;
}

const rateLimiterConfig: RateLimiterConfig = {
  defaultAlgorithm: (process.env.DEFAULT_ALGORITHM as AlgorithmName) || ALGORITHMS.TOKEN_BUCKET,
  defaultLimit: parseInt(process.env.DEFAULT_RATE_LIMIT || '100', 10),
  defaultWindowMs: parseInt(process.env.DEFAULT_WINDOW_MS || '60000', 10),
  burstMultiplier: parseFloat(process.env.BURST_MULTIPLIER || '1.5'),
  adaptiveEnabled: process.env.ADAPTIVE_ENABLED === 'true',
  adaptiveEvaluationIntervalMs: parseInt(process.env.ADAPTIVE_EVALUATION_INTERVAL_MS || '300000', 10),
  adaptiveMinConfidenceThreshold: parseFloat(process.env.ADAPTIVE_MIN_CONFIDENCE_THRESHOLD || '0.7'),
  adaptiveMaxAdjustmentFactor: parseFloat(process.env.ADAPTIVE_MAX_ADJUSTMENT_FACTOR || '2.0'),
  adaptiveMinCapacity: parseInt(process.env.ADAPTIVE_MIN_CAPACITY || '10', 10),
  adaptiveMaxCapacity: parseInt(process.env.ADAPTIVE_MAX_CAPACITY || '100000', 10),
  endpoints: {
    '/api/v1/data': {
      algorithm: ALGORITHMS.TOKEN_BUCKET,
      limit: 1000,
      windowMs: DEFAULT_LIMITS.WINDOW_MS,
      burstSize: 50,
      refillRate: 16,
    },
    '/api/v1/auth': {
      algorithm: ALGORITHMS.FIXED_WINDOW,
      limit: 10,
      windowMs: DEFAULT_LIMITS.WINDOW_MS,
    },
    '/api/v1/search': {
      algorithm: ALGORITHMS.SLIDING_WINDOW,
      limit: 30,
      windowMs: DEFAULT_LIMITS.WINDOW_MS,
    },
  },
  ip: {
    algorithm: ALGORITHMS.SLIDING_WINDOW,
    limit: 200,
    windowMs: DEFAULT_LIMITS.WINDOW_MS,
  },
  tenant: {
    algorithm: ALGORITHMS.TOKEN_BUCKET,
    limit: 10000,
    windowMs: DEFAULT_LIMITS.WINDOW_MS,
    burstSize: 500,
    refillRate: 166,
  },
};

export default rateLimiterConfig;
