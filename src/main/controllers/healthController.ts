import { Request, Response } from 'express';
import { getHealthStatus } from '../utils/observability/healthCheck';
import { HTTP_STATUS } from '../utils/constants';

export async function healthFull(req: Request, res: Response): Promise<void> {
  const status = await getHealthStatus();
  const httpStatus =
    status.status === 'healthy'
      ? HTTP_STATUS.OK
      : status.status === 'degraded'
      ? 200
      : HTTP_STATUS.SERVICE_UNAVAILABLE;
  res.status(httpStatus).json(status);
}

export async function healthLive(req: Request, res: Response): Promise<void> {
  res.status(HTTP_STATUS.OK).json({ status: 'alive', timestamp: new Date().toISOString() });
}

export async function healthReady(req: Request, res: Response): Promise<void> {
  const status = await getHealthStatus();
  const isReady = status.checks.redis.status === 'ok';
  res.status(isReady ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE).json({
    status: isReady ? 'ready' : 'not_ready',
    redis: status.checks.redis,
  });
}
