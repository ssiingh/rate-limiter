import { Request, Response } from 'express';
import { adaptiveRateLimitEngine } from '../services/adaptiveRateLimitEngine';
import { HTTP_STATUS } from '../utils/constants';

/**
 * GET /api/ratelimit/adaptive/config
 * Get configuration settings for the adaptive ML engine
 */
export async function getAdaptiveConfig(req: Request, res: Response): Promise<void> {
  res.status(HTTP_STATUS.OK).json(adaptiveRateLimitEngine.getConfig());
}

/**
 * GET /api/ratelimit/adaptive/:key/status
 * Get the current adaptive status and limits for a specific key
 */
export async function getAdaptiveStatus(req: Request, res: Response): Promise<void> {
  const { key } = req.params;
  
  // NOTE: This currently defaults the multiplier to 1.0. In a complete 
  // implementation, we would fetch the last evaluated multiplier from the ML inference.
  const status = adaptiveRateLimitEngine.getStatus(key, 1.0);
  
  res.status(HTTP_STATUS.OK).json(status);
}

/**
 * POST /api/ratelimit/adaptive/:key/override
 * Manually override the adaptive limit for a specific key
 */
export async function setAdaptiveOverride(req: Request, res: Response): Promise<void> {
  const { key } = req.params;
  const { limit } = req.body;

  if (typeof limit !== 'number' || limit < 1) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Valid limit number is required' });
    return;
  }

  adaptiveRateLimitEngine.setManualOverride(key, limit);
  res.status(HTTP_STATUS.OK).json({ message: `Override set for ${key}`, limit });
}

/**
 * DELETE /api/ratelimit/adaptive/:key/override
 * Clear any manual rate limit override for a specific key
 */
export async function clearAdaptiveOverride(req: Request, res: Response): Promise<void> {
  const { key } = req.params;
  adaptiveRateLimitEngine.clearManualOverride(key);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}
