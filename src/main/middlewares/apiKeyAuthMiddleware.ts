import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/security/apiKeyService';
import { HEADERS, HTTP_STATUS } from '../utils/constants';

export function apiKeyAuthMiddleware(required: boolean = true) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const apiKey = req.headers[HEADERS.API_KEY.toLowerCase()] as string;

    if (!apiKey) {
      if (!required) { next(); return; }
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'Unauthorized',
        message: 'X-API-Key header is required',
      });
      return;
    }

    const meta = await apiKeyService.validate(apiKey);
    if (!meta) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        error: 'Forbidden',
        message: 'Invalid or expired API key',
      });
      return;
    }

    (req as any).apiKeyMeta = meta;
    next();
  };
}

export default apiKeyAuthMiddleware;
