import { Request, Response } from 'express';
import { getMetricsString } from '../utils/observability/prometheusMetrics';
import { HTTP_STATUS } from '../utils/constants';

export async function getPrometheusMetrics(req: Request, res: Response): Promise<void> {
  const metrics = await getMetricsString();
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.status(HTTP_STATUS.OK).send(metrics);
}

export async function getMetricsJson(req: Request, res: Response): Promise<void> {
  const mem = process.memoryUsage();
  res.json({
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      rss: Math.round(mem.rss / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  });
}
