import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from '../../redis/redisClient';
import { globalCache } from '../cache/localCache';
import { REDIS_KEY_PREFIX, CACHE_TTL } from '../../utils/constants';
import logger from '../../utils/logger';

export interface ApiKey {
  id: string;
  keyHash: string;
  tenantId: string;
  name: string;
  scopes: string[];
  createdAt: number;
  expiresAt?: number;
  rateLimit?: { limit: number; windowMs: number };
}

export class ApiKeyService {
  private readonly redis = getRedisClient();

  /** Generate a new API key, store hash in Redis */
  async generate(params: {
    tenantId: string;
    name: string;
    scopes?: string[];
    expiresAt?: number;
    rateLimit?: { limit: number; windowMs: number };
  }): Promise<{ key: string; metadata: ApiKey }> {
    const rawKey = `rl_${uuidv4().replace(/-/g, '')}`;
    const keyHash = this.hash(rawKey);
    const id = uuidv4();

    const metadata: ApiKey = {
      id,
      keyHash,
      tenantId: params.tenantId,
      name: params.name,
      scopes: params.scopes || ['rate_limit'],
      createdAt: Date.now(),
      expiresAt: params.expiresAt,
      rateLimit: params.rateLimit,
    };

    const redisKey = `${REDIS_KEY_PREFIX.API_KEY}:${keyHash}`;
    await this.redis.set(redisKey, JSON.stringify(metadata));
    if (params.expiresAt) {
      const ttl = Math.ceil((params.expiresAt - Date.now()) / 1000);
      if (ttl > 0) await this.redis.expire(redisKey, ttl);
    }

    logger.info('API key generated', { id, tenantId: params.tenantId, name: params.name });
    return { key: rawKey, metadata };
  }

  /** Validate API key, returns metadata or null */
  async validate(rawKey: string): Promise<ApiKey | null> {
    const keyHash = this.hash(rawKey);
    
    // Check cache first
    const cached = globalCache.get<ApiKey>(`ak:${keyHash}`);
    if (cached) return cached;

    const redisKey = `${REDIS_KEY_PREFIX.API_KEY}:${keyHash}`;
    const data = await this.redis.get(redisKey);
    if (!data) return null;

    const metadata: ApiKey = JSON.parse(data);
    
    // Check expiry
    if (metadata.expiresAt && metadata.expiresAt < Date.now()) {
      await this.redis.del(redisKey);
      return null;
    }

    globalCache.set(`ak:${keyHash}`, metadata, CACHE_TTL.API_KEY);
    return metadata;
  }

  /** Revoke an API key by hash */
  async revoke(rawKey: string): Promise<void> {
    const keyHash = this.hash(rawKey);
    await this.redis.del(`${REDIS_KEY_PREFIX.API_KEY}:${keyHash}`);
    globalCache.delete(`ak:${keyHash}`);
    logger.info('API key revoked', { keyHash });
  }

  /** List all API keys for a tenant */
  async listForTenant(tenantId: string): Promise<ApiKey[]> {
    const pattern = `${REDIS_KEY_PREFIX.API_KEY}:*`;
    const keys = await this.redis.keys(pattern);
    const results: ApiKey[] = [];
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const meta: ApiKey = JSON.parse(data);
        if (meta.tenantId === tenantId) results.push(meta);
      }
    }
    return results;
  }

  private hash(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}

export const apiKeyService = new ApiKeyService();
export default ApiKeyService;
