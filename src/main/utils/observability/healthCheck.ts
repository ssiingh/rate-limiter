import { pingRedis } from '../../redis/redisClient';
import { formatDuration } from '../timeUtils';

const startTime = Date.now();

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: string;
  uptimeMs: number;
  timestamp: string;
  checks: {
    redis: { status: 'ok' | 'error'; latencyMs?: number };
    memory: { status: 'ok' | 'warning'; heapUsedMB: number; heapTotalMB: number };
    process: { status: 'ok'; pid: number; nodeVersion: string };
  };
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const uptimeMs = Date.now() - startTime;

  // Redis check
  let redisStatus: HealthStatus['checks']['redis'];
  const redisStart = Date.now();
  try {
    const ok = await pingRedis();
    redisStatus = ok
      ? { status: 'ok', latencyMs: Date.now() - redisStart }
      : { status: 'error' };
  } catch {
    redisStatus = { status: 'error' };
  }

  // Memory check
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const memStatus: HealthStatus['checks']['memory'] = {
    status: heapUsedMB / heapTotalMB > 0.9 ? 'warning' : 'ok',
    heapUsedMB,
    heapTotalMB,
  };

  const allOk = redisStatus.status === 'ok' && memStatus.status === 'ok';
  const partialOk = redisStatus.status === 'ok' || memStatus.status === 'ok';

  return {
    status: allOk ? 'healthy' : partialOk ? 'degraded' : 'unhealthy',
    uptime: formatDuration(uptimeMs),
    uptimeMs,
    timestamp: new Date().toISOString(),
    checks: {
      redis: redisStatus,
      memory: memStatus,
      process: { status: 'ok', pid: process.pid, nodeVersion: process.version },
    },
  };
}
