import { Request, Response, NextFunction } from 'express';
import { geoLimiter } from '../services/geo/geoLimiter';
import { ipExtractor } from '../services/security/ipAddressExtractor';
import { HTTP_STATUS } from '../utils/constants';
import logger from '../utils/logger';

export async function geoLimiterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ip = ipExtractor.extract(req);
  const { blocked, reason, country } = geoLimiter.isBlocked(ip, req);

  if (blocked) {
    logger.warn('Request blocked by geo policy', { ip, country, reason });
    res.status(HTTP_STATUS.FORBIDDEN).json({
      error: 'Forbidden',
      message: 'Access denied from your region',
      country,
      reason,
    });
    return;
  }

  next();
}

export default geoLimiterMiddleware;
