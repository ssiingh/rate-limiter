/*
  Cache key generation and namespace management for the local LRU cache.
  Ensures cache keys don't collide across different concern areas.
 */
export class CacheKeyManager {
  private readonly namespace: string;
  private static readonly SEPARATOR = ':';

  constructor(namespace: string = 'rl') {
    this.namespace = namespace;
  }

  /*
   Generate a cache key for a rate limit result.
   */
  rateLimitKey(algorithm: string, identifier: string): string {
    return `${this.namespace}${CacheKeyManager.SEPARATOR}result${CacheKeyManager.SEPARATOR}${algorithm}${CacheKeyManager.SEPARATOR}${identifier}`;
  }

  /*
    Generate a cache key for a configuration override.
   */
  configKey(identifier: string): string {
    return `${this.namespace}${CacheKeyManager.SEPARATOR}config${CacheKeyManager.SEPARATOR}${identifier}`;
  }

  /*
    Generate a cache key for geo-resolution results.
   */
  geoKey(ip: string): string {
    return `${this.namespace}${CacheKeyManager.SEPARATOR}geo${CacheKeyManager.SEPARATOR}${ip}`;
  }

  /*
    Generate a cache key for API key validation results.
   */
  apiKeyKey(apiKey: string): string {
    return `${this.namespace}${CacheKeyManager.SEPARATOR}apikey${CacheKeyManager.SEPARATOR}${apiKey}`;
  }

  /*
    Generate a cache key for anomaly analysis results.
   */
  anomalyKey(identifier: string): string {
    return `${this.namespace}${CacheKeyManager.SEPARATOR}anomaly${CacheKeyManager.SEPARATOR}${identifier}`;
  }

  /*
    Parse a cache key to extract its components.
   */
  parse(
    key: string
  ): { namespace: string; type: string; identifier: string } | null {
    const parts = key.split(CacheKeyManager.SEPARATOR);

    if (parts.length < 3 || parts[0] !== this.namespace) return null;

    return {
      namespace: parts[0],
      type: parts[1],
      identifier: parts.slice(2).join(CacheKeyManager.SEPARATOR),
    };
  }
}

export default CacheKeyManager;

