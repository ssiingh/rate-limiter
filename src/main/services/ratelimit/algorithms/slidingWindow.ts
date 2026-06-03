import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import type { RateLimitAlgorithm } from '../core/rateLimitAlgorithm';
import type { RateLimitResponse, RateLimitConfig } from '../../../models';
import { nowMs } from '../../../utils/timeUtils';
import { ALGORITHMS } from '../../../utils/constants';

const SCRIPT = fs.readFileSync(
  path.join(__dirname, '../../../redis/luaScripts/slidingWindow.lua'),
  'utf8'
);

export class SlidingWindowAlgorithm implements RateLimitAlgorithm {
  readonly name = ALGORITHMS.SLIDING_WINDOW;
  private scriptSha: string | null = null;

  constructor(private readonly client: Redis) {}

  private async getScriptSha(): Promise<string> {
    if (!this.scriptSha) {
      this.scriptSha = await this.client.call('SCRIPT', 'LOAD', SCRIPT) as string;
    }
    return this.scriptSha;
  }

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResponse> {
    const { limit, windowMs } = config;
    const now = nowMs();
    const sha = await this.getScriptSha();

    const result = await this.client.evalsha(
      sha,
      1,
      key,
      String(windowMs),
      String(limit),
      String(now),
      uuidv4()
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
    const count = await this.client.zcard(key);
    const ttl = await this.client.ttl(key);
    return { count, ttl };
  }
}

export default SlidingWindowAlgorithm;
