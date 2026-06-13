import 'dotenv/config';
import app from './app';
import { getRedisClient, closeRedis } from './redis/redisClient';
import logger from './utils/logger';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  // Initialize Redis connection
  const redis = getRedisClient();
  try {
    await redis.ping();
    logger.info('Redis connection established');
  } catch (err) {
    logger.warn('Could not connect to Redis at startup — will retry automatically', { error: (err as Error).message });
  }

  const server = app.listen(PORT, HOST, () => {
    logger.info(`🚀 Distributed Rate Limiter running`, {
      url: `http://${HOST}:${PORT}`,
      env: process.env.NODE_ENV || 'development',
      pid: process.pid,
    });
    logger.info('📊 Endpoints:', {
      health: `http://localhost:${PORT}/health`,
      metrics: `http://localhost:${PORT}/metrics`,
      rateLimit: `http://localhost:${PORT}/rate-limit/check`,
      docs: `http://localhost:${PORT}/api-docs`,
    });
  });

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await closeRedis();
      logger.info('Server shut down cleanly');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason });
    process.exit(1);
  });
}

start().catch((err) => {
  logger.error('Failed to start server', { error: err.message });
  process.exit(1);
});
