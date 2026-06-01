import { REDIS_KEY_PREFIX } from '../../../utils/constants';

/**
 * Generates structured Redis keys for rate limiters
 * Format: rl:{algorithm}:{tenant?}:{userId?}:{endpoint?}
 */
export class KeyGenerator {
  static generate(params: {
    algorithm: string;
    key: string;
    tenantId?: string;
    userId?: string;
    endpoint?: string;
    window?: number;
  }): string {
    const { algorithm, key, tenantId, userId, endpoint } = params;
    const parts: string[] = [REDIS_KEY_PREFIX.RATE_LIMIT, algorithm];

    if (tenantId) parts.push(`t:${this.sanitize(tenantId)}`);
    if (userId) parts.push(`u:${this.sanitize(userId)}`);
    if (endpoint) parts.push(`e:${this.sanitize(endpoint)}`);
    parts.push(this.sanitize(key));

    return parts.join(':');
  }

  static forIP(ip: string, algorithm: string, windowMs: number): string {
    const windowBucket = Math.floor(Date.now() / windowMs);
    return `${REDIS_KEY_PREFIX.RATE_LIMIT}:${algorithm}:ip:${ip}:${windowBucket}`;
  }

  static forTenant(tenantId: string, algorithm: string): string {
    return `${REDIS_KEY_PREFIX.RATE_LIMIT}:${algorithm}:tenant:${tenantId}`;
  }

  static forEndpoint(endpoint: string, algorithm: string, windowMs: number): string {
    const windowBucket = Math.floor(Date.now() / windowMs);
    const cleanEndpoint = endpoint.replace(/\//g, '_');
    return `${REDIS_KEY_PREFIX.RATE_LIMIT}:${algorithm}:ep:${cleanEndpoint}:${windowBucket}`;
  }

  static forFixedWindow(baseKey: string, windowMs: number): string {
    const windowBucket = Math.floor(Date.now() / windowMs);
    return `${baseKey}:fw:${windowBucket}`;
  }

  private static sanitize(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
  }
}

export default KeyGenerator;
