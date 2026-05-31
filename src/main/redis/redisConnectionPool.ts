import Redis from 'ioredis';
import redisConfig from '../config/redisConfig';
import logger from '../utils/logger';
import { createRedisClient } from './redisClient';

export class RedisConnectionPool {
  private pool: Redis[] = [];
  private idle: boolean[] = [];
  private readonly size: number;

  constructor(size: number = redisConfig.poolSize) {
    this.size = size;
  }

  async initialize(): Promise<void> {
    logger.info(`Redis pool: initializing ${this.size} connections`);
    for (let i = 0; i < this.size; i++) {
      const client = createRedisClient();
      this.pool.push(client);
      this.idle.push(true);
    }
    logger.info('Redis pool: initialized');
  }

  async acquire(): Promise<{ client: Redis; index: number }> {
    // Find idle connection
    for (let i = 0; i < this.pool.length; i++) {
      if (this.idle[i]) {
        this.idle[i] = false;
        return { client: this.pool[i], index: i };
      }
    }
    // All busy — return a round-robin one anyway
    const index = Math.floor(Math.random() * this.size);
    return { client: this.pool[index], index };
  }

  release(index: number): void {
    if (index >= 0 && index < this.pool.length) {
      this.idle[index] = true;
    }
  }

  async executeWithClient<T>(fn: (client: Redis) => Promise<T>): Promise<T> {
    const { client, index } = await this.acquire();
    try {
      return await fn(client);
    } finally {
      this.release(index);
    }
  }

  getStats(): { total: number; idle: number; busy: number } {
    const idleCount = this.idle.filter(Boolean).length;
    return { total: this.size, idle: idleCount, busy: this.size - idleCount };
  }

  async close(): Promise<void> {
    await Promise.all(this.pool.map((c) => c.quit()));
    this.pool = [];
    this.idle = [];
    logger.info('Redis pool: all connections closed');
  }
}

let poolInstance: RedisConnectionPool | null = null;

export async function getConnectionPool(): Promise<RedisConnectionPool> {
  if (!poolInstance) {
    poolInstance = new RedisConnectionPool();
    await poolInstance.initialize();
  }
  return poolInstance;
}

export default RedisConnectionPool;
