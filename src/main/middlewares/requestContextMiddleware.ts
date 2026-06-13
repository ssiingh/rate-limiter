import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { tenantResolver } from '../services/security/tenantResolver';
import { ipExtractor } from '../services/security/ipAddressExtractor';
import { HEADERS } from '../utils/constants';

declare global {
  namespace Express {
    interface Request {
      context: {
        correlationId: string;
        tenantId: string;
        userId?: string;
        ip: string;
        startTime: number;
      };
    }
  }
}

export async function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const correlationId =
    (req.headers[HEADERS.CORRELATION_ID.toLowerCase()] as string) || uuidv4();
  const ip = ipExtractor.extract(req);
  const { tenantId } = await tenantResolver.resolve(req);

  req.context = {
    correlationId,
    tenantId,
    ip,
    startTime: Date.now(),
  };

  res.set(HEADERS.CORRELATION_ID, correlationId);
  next();
}

export default requestContextMiddleware;
