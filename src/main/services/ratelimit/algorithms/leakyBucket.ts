import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';
import type { RateLimitAlgorithm } from '../core/rateLimitAlgorithm';
import type { RateLimitResponse, RateLimitConfig } from '../../../models';
import { nowMs } from '../../../utils/timeUtils';
import { ALGORITHMS, DEFAULT_LIMITS } from '../../../utils/constants';

const SCRIPT = fs.readFileSync(
  path.join(__dirname, '../../../redis/luaScripts/leakyBucket.lua'),
  'utf8'
);

export class LeakyBucketAlgorithm implements RateLimitAlgorithm {
  readonly name = ALGORITHMS.LEAKY_BUCKET;
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
      capacity = DEFAULT_LIMITS.LEAKY_BUCKET_CAPACITY,
      drainRate = DEFAULT_LIMITS.LEAKY_BUCKET_DRAIN_RATE,
    } = config;

    const now = nowMs();
    const sha = await this.getScriptSha();

    const result = await this.client.evalsha(
      sha,
      1,
      key,
      String(capacity),
      String(drainRate),
      String(now),
      String(1) // cost
    ) as [number, number, number, number];

    const [allowed, remaining, resetMs, cap] = result;

    return {
      allowed: allowed === 1,
      remaining,
      limit: cap,
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
      queue: parseFloat(data.queue || '0'),
      lastDrain: parseInt(data.last_drain || '0', 10),
    };
  }
}

export default LeakyBucketAlgorithm;
