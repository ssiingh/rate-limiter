import dotenv from 'dotenv';
dotenv.config();

export interface RedisConfig {
  url: string;
  password?: string;
  db: number;
  maxRetriesPerRequest: number;
  connectTimeout: number;
  commandTimeout: number;
  poolSize: number;
  enableReadyCheck: boolean;
  lazyConnect: boolean;
  keepAlive: number;
  keyPrefix: string;
  tls?: boolean;
}

const redisConfig: RedisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '5000', 10),
  commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '2000', 10),
  poolSize: parseInt(process.env.REDIS_POOL_SIZE || '10', 10),
  enableReadyCheck: true,
  lazyConnect: false,
  keepAlive: 30000,
  keyPrefix: 'rl:',
  tls: process.env.REDIS_TLS === 'true',
};

export default redisConfig;
