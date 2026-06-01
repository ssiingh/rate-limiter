import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';
import { getRedisClient } from '../../../redis/redisClient';
import type { RateLimitAlgorithm } from './rateLimitAlgorithm';
import type { RateLimitResponse, RateLimitConfig } from '../../../models';
import { ALGORITHMS } from '../../../utils/constants';

// Lazy imports to avoid circular deps
let TokenBucket: new (client: Redis) => RateLimitAlgorithm;
let SlidingWindow: new (client: Redis) => RateLimitAlgorithm;
let FixedWindow: new (client: Redis) => RateLimitAlgorithm;
let LeakyBucket: new (client: Redis) => RateLimitAlgorithm;
let CompositeLimiter: new (client: Redis) => RateLimitAlgorithm;

const registry = new Map<string, RateLimitAlgorithm>();

async function ensureLoaded() {
  if (!TokenBucket) {
    ({ TokenBucketAlgorithm: TokenBucket } = await import('../algorithms/tokenBucket'));
    ({ SlidingWindowAlgorithm: SlidingWindow } = await import('../algorithms/slidingWindow'));
    ({ FixedWindowAlgorithm: FixedWindow } = await import('../algorithms/fixedWindow'));
    ({ LeakyBucketAlgorithm: LeakyBucket } = await import('../algorithms/leakyBucket'));
    ({ CompositeLimiterAlgorithm: CompositeLimiter } = await import('../algorithms/compositeLimiter'));
  }
}

/**
 * Factory that creates and caches algorithm instances
 */
export class AlgorithmFactory {
  private client: Redis;

  constructor(client?: Redis) {
    this.client = client || getRedisClient();
  }

  async create(algorithmName: string): Promise<RateLimitAlgorithm> {
    await ensureLoaded();

    const cached = registry.get(algorithmName);
    if (cached) return cached;

    let algo: RateLimitAlgorithm;

    switch (algorithmName) {
      case ALGORITHMS.TOKEN_BUCKET:
        algo = new TokenBucket(this.client);
        break;
      case ALGORITHMS.SLIDING_WINDOW:
        algo = new SlidingWindow(this.client);
        break;
      case ALGORITHMS.FIXED_WINDOW:
        algo = new FixedWindow(this.client);
        break;
      case ALGORITHMS.LEAKY_BUCKET:
        algo = new LeakyBucket(this.client);
        break;
      case ALGORITHMS.COMPOSITE:
        algo = new CompositeLimiter(this.client);
        break;
      default:
        throw new Error(`Unknown algorithm: ${algorithmName}`);
    }

    registry.set(algorithmName, algo);
    return algo;
  }

  getAvailableAlgorithms(): string[] {
    return Object.values(ALGORITHMS);
  }
}

export default AlgorithmFactory;
