import { LRUCache } from 'lru-cache';
import { CACHE_TTL } from '../../utils/constants';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class LocalCache {
  private cache: LRUCache<string, CacheEntry<unknown>>;

  constructor(maxSize: number = 10_000) {
    this.cache = new LRUCache({ max: maxSize });
  }

  set<T>(key: string, value: T, ttlSeconds: number = CACHE_TTL.CONFIG): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      calculatedSize: this.cache.calculatedSize,
    };
  }
}

export const globalCache = new LocalCache();
export default LocalCache;
