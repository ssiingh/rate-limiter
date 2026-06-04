import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';
import type { RateLimitAlgorithm } from '../core/rateLimitAlgorithm';
import type { RateLimitResponse, RateLimitConfig } from '../../../models';
import { nowMs } from '../../../utils/timeUtils';
import { ALGORITHMS } from '../../../utils/constants';

const SCRIPT = fs.readFileSync(
  path.join(__dirname, '../../../redis/luaScripts/tokenBucket.lua'),
  'utf8'
);

export class TokenBucketAlgorithm implements RateLimitAlgorithm {
  readonly name = ALGORITHMS.TOKEN_BUCKET;
  private scriptSha: string | null = null;

  constructor(private readonly client: Redis) {}

  private async getScriptSha(): Promise<string> {
    if (!this.scriptSha) {
      this.scriptSha = await this.client.call('SCRIPT', 'LOAD', SCRIPT) as string;
    }
    return this.scriptSha;
  }

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResponse> {
    const {
      limit,
      windowMs,
      burstSize = limit,
      refillRate = limit / (windowMs / 1000),
    } = config;

    const now = nowMs();
    const sha = await this.getScriptSha();

    const result = await this.client.evalsha(
      sha,
      1,
      key,
      String(1), // cost or tokensToConsume
      String(burstSize), // capacity
      String(refillRate),
      String(now)
    ) as [number, number, number, number];

    const [allowed, remaining, resetMs, capacity] = result;

    return {
      allowed: allowed === 1,
      remaining,
      limit: capacity,
      resetMs,
      algorithm: this.name,
      key,
    };
  }

  async reset(key: string): Promise<void> {
    await this.client.del(key);
  }

  async getState(key: string): Promise<Record<string, unknown> | null> {
    const data = await this.client.hgetall(key);
    if (!data || Object.keys(data).length === 0) return null;
    return {
      tokens: parseFloat(data.tokens || '0'),
      lastRefill: parseInt(data.lastRefillTime || '0', 10),
      capacity: parseInt(data.capacity || '0', 10),
      refillRate: parseFloat(data.refillRate || '0'),
    };
  }
}

export default TokenBucketAlgorithm;
