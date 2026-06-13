import { Request, Response } from 'express';
import { rateLimiterService } from '../services/rateLimiterService';
import { validate, RateLimitRequestSchema } from '../utils/validation';
import { HTTP_STATUS } from '../utils/constants';

/**
 * POST /rate-limit/check
 * Check if a request should be allowed based on the configured rate limit
 */
export async function checkRateLimit(req: Request, res: Response): Promise<void> {
  const input = validate(RateLimitRequestSchema, req.body);
  const result = await rateLimiterService.check(input);

  res.status(result.allowed ? HTTP_STATUS.OK : HTTP_STATUS.TOO_MANY_REQUESTS).json(result);
}

/**
 * DELETE /rate-limit/reset/:key
 */
export async function resetRateLimit(req: Request, res: Response): Promise<void> {
  const { key } = req.params;
  const algorithm = req.query.algorithm as string | undefined;
  await rateLimiterService.reset(key, algorithm);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}
