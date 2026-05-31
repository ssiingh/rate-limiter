import Redis from 'ioredis';
import redisConfig from '../config/redisConfig';
import logger from '../utils/logger';

let redisInstance: Redis | null = null;

export function createRedisClient(): Redis {
  const client = new Redis(redisConfig.url, {
    password: redisConfig.password,
    db: redisConfig.db,
    maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
    connectTimeout: redisConfig.connectTimeout,
    commandTimeout: redisConfig.commandTimeout,
    enableReadyCheck: redisConfig.enableReadyCheck,
    lazyConnect: redisConfig.lazyConnect,
    keepAlive: redisConfig.keepAlive,
    tls: redisConfig.tls ? {} : undefined,
    retryStrategy(times) {
      if (times > 10) {
        logger.error('Redis: max reconnection attempts reached');
        return null;
      }
      const delay = Math.min(times * 200, 5000);
      logger.warn(`Redis: reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
  });

  client.on('connect', () => logger.info('Redis: connected'));
  client.on('ready', () => logger.info('Redis: ready'));
  client.on('error', (err) => logger.error('Redis error', { error: err.message }));
  client.on('close', () => logger.warn('Redis: connection closed'));
  client.on('reconnecting', () => logger.warn('Redis: reconnecting...'));
  client.on('end', () => logger.warn('Redis: connection ended'));

  return client;
}

export function getRedisClient(): Redis {
  if (!redisInstance) {
    redisInstance = createRedisClient();
  }
  return redisInstance;
}

export async function pingRedis(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
    logger.info('Redis: connection closed gracefully');
  }
}

export default getRedisClient;
