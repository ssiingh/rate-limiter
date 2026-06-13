import { Request, Response, NextFunction } from 'express';
import { rateLimiterService } from '../services/rateLimiterService';
import { ipExtractor } from '../services/security/ipAddressExtractor';
import { HEADERS, HTTP_STATUS } from '../utils/constants';
import { nowMs } from '../utils/timeUtils';
import logger from '../utils/logger';

/**
 * Core rate limit middleware — applies rate limiting then sets standard response headers
 */
export function rateLimitMiddleware(
  options: {
    key?: (req: Request) => string;
    limit?: number;
    windowMs?: number;
    algorithm?: string;
  } = {}
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = ipExtractor.extract(req);
    const key = options.key ? options.key(req) : ip;

    try {
      const result = await rateLimiterService.check({
        key,
        algorithm: options.algorithm,
        limit: options.limit,
        windowMs: options.windowMs,
        endpoint: req.path,
        ip,
        tenantId: (req as any).context?.tenantId,
        userId: (req as any).context?.userId,
      });

      // Set rate limit headers
      res.set(HEADERS.RATE_LIMIT_LIMIT, String(result.limit));
      res.set(HEADERS.RATE_LIMIT_REMAINING, String(result.remaining));
      res.set(HEADERS.RATE_LIMIT_RESET, String(Math.ceil(result.resetMs / 1000)));
      res.set(HEADERS.RATE_LIMIT_ALGORITHM, result.algorithm);

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetMs - nowMs()) / 1000);
        res.set(HEADERS.RATE_LIMIT_RETRY_AFTER, String(retryAfter));

        logger.warn('Request rate limited', { key, algorithm: result.algorithm, ip });

        res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
          retryAfter,
          limit: result.limit,
          remaining: 0,
          resetAt: new Date(result.resetMs).toISOString(),
          algorithm: result.algorithm,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limit middleware error', { error: (error as Error).message });
      // Fail-open: allow request on error
      next();
    }
  };
}

export default rateLimitMiddleware;
