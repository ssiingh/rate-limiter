import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';
import type { RateLimitAlgorithm } from '../core/rateLimitAlgorithm';
import type { RateLimitResponse, RateLimitConfig } from '../../../models';
import { getWindowTTL } from '../../../utils/timeUtils';
import { ALGORITHMS } from '../../../utils/constants';
import KeyGenerator from '../keys/keyGenerator';

const SCRIPT = fs.readFileSync(
  path.join(__dirname, '../../../redis/luaScripts/fixedWindow.lua'),
  'utf8'
);

export class FixedWindowAlgorithm implements RateLimitAlgorithm {
  readonly name = ALGORITHMS.FIXED_WINDOW;
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
    // Append window bucket to key for epoch alignment
    const windowKey = KeyGenerator.forFixedWindow(key, windowMs);
    const ttlSeconds = getWindowTTL(windowMs);
    const sha = await this.getScriptSha();

    const result = await this.client.evalsha(
      sha,
      1,
      windowKey,
      String(limit),
      String(ttlSeconds),
      String(1) // cost
    ) as [number, number, number, number];

    const [allowed, remaining, ttl, capacity] = result;
    const resetMs = Date.now() + ttl * 1000;

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
    // Delete all window keys matching base key
    const pattern = `${key}:fw:*`;
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async getState(key: string): Promise<Record<string, unknown> | null> {
    const pattern = `${key}:fw:*`;
    const keys = await this.client.keys(pattern);
    if (keys.length === 0) return null;
    const count = await this.client.get(keys[0]);
    const ttl = await this.client.ttl(keys[0]);
    return { count: parseInt(count || '0', 10), ttl };
  }
}

export default FixedWindowAlgorithm;
