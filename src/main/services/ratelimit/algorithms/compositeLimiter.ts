import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';
import type { RateLimitAlgorithm } from '../core/rateLimitAlgorithm';
import type { RateLimitResponse, RateLimitConfig } from '../../../models';
import { nowMs } from '../../../utils/timeUtils';
import { ALGORITHMS } from '../../../utils/constants';

const SCRIPT = fs.readFileSync(
  path.join(__dirname, '../../../redis/luaScripts/compositeLimiter.lua'),
  'utf8'
);

export class CompositeLimiterAlgorithm implements RateLimitAlgorithm {
  readonly name = ALGORITHMS.COMPOSITE;
  private scriptSha: string | null = null;

  constructor(private readonly client: Redis) {}

  private async getScriptSha(): Promise<string> {
    if (!this.scriptSha) {
      this.scriptSha = await this.client.call('SCRIPT', 'LOAD', SCRIPT) as string;
    }
    return this.scriptSha;
  }

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResponse> {
    const { components = [], combinationMode = 'AND' } = config;

    if (components.length === 0) {
      // Fallback: no sub-components, allow
      return {
        allowed: true, 
        remaining: config.limit,
        limit: config.limit,
        resetMs: Date.now() + config.windowMs,
        algorithm: this.name,
        key,
      };
    }

    const now = nowMs();
    const sha = await this.getScriptSha();
    const keys = components.map((c) => c.key || `${key}:c:${c.algorithm}`);

    // Build ARGV: mode, count, then per-component: limit, windowMs, cost, now
    const argv: string[] = [combinationMode, String(components.length)];
    for (const comp of components) {
      argv.push(String(comp.limit), String(comp.windowMs), String(1), String(now));
    }

    const result = await this.client.evalsha(
      sha,
      keys.length,
      ...keys,
      ...argv
    ) as [number, number, number, number];

    const [allowed, remaining, resetMs, numComponents] = result;

    return {
      allowed: allowed === 1,
      remaining,
      limit: components[0]?.limit || 0,
      resetMs,
      algorithm: this.name,
      key,
      metadata: { components: numComponents, mode: combinationMode },
    };
  }

  async reset(key: string): Promise<void> {
    const pattern = `${key}:c:*`;
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) await this.client.del(...keys);
  }

  async getState(key: string): Promise<Record<string, unknown> | null> {
    const pattern = `${key}:c:*`;
    const keys = await this.client.keys(pattern);
    return { subKeys: keys.length };
  }
}

export default CompositeLimiterAlgorithm;
