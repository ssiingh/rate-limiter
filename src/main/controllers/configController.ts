import { Request, Response } from 'express';
import { HTTP_STATUS } from '../utils/constants';
import { configurationService } from '../services/configurationService';
import type { RateLimitConfig } from '../models';

export async function getConfig(req: Request, res: Response): Promise<void> {
  const defaults = configurationService.getDefaultConfig();
  
  // Construct a structure matching the API Reference docs
  const config = {
    capacity: defaults.defaultLimit,
    refillRate: Math.max(1, Math.floor(defaults.defaultLimit / (defaults.defaultWindowMs / 1000))),
    cleanupIntervalMs: defaults.defaultWindowMs,
    algorithm: defaults.defaultAlgorithm.toUpperCase(),
    keys: Object.fromEntries(
      configurationService.listOverrides().map(override => [
        override.key,
        {
          capacity: override.config.limit,
          refillRate: override.config.limit ? Math.max(1, Math.floor(override.config.limit / ((override.config.windowMs || 60000) / 1000))) : undefined,
          algorithm: override.config.algorithm?.toUpperCase(),
        }
      ])
    ),
    patterns: Object.fromEntries(
      configurationService.listPatternOverrides().map(override => [
        override.key, // Property tracks wildcard value
        {
          capacity: override.config.limit,
          refillRate: override.config.limit ? Math.max(1, Math.floor(override.config.limit / ((override.config.windowMs || 60000) / 1000))) : undefined,
          algorithm: override.config.algorithm?.toUpperCase(),
        }
      ])
    ),
  };
  
  res.status(HTTP_STATUS.OK).json(config);
}

export async function updateDefaultConfig(req: Request, res: Response): Promise<void> {
  const config = req.body;
  if (config.capacity) configurationService.updateDefaultConfig({ defaultLimit: config.capacity });
  if (config.cleanupIntervalMs) configurationService.updateDefaultConfig({ defaultWindowMs: config.cleanupIntervalMs });
  if (config.algorithm) configurationService.updateDefaultConfig({ defaultAlgorithm: config.algorithm.toLowerCase() });

  res.status(HTTP_STATUS.OK).json(req.body);
}

export async function setKeyConfig(req: Request, res: Response): Promise<void> {
  const { key } = req.params;
  const config = req.body;
  
  configurationService.setOverride(key, {
    limit: config.capacity,
    windowMs: config.cleanupIntervalMs,
    algorithm: config.algorithm?.toLowerCase(),
  } as Partial<RateLimitConfig>);
  
  res.status(HTTP_STATUS.OK).json(config);
}

export async function setPatternConfig(req: Request, res: Response): Promise<void> {
  const { pattern } = req.params;
  const config = req.body;
  
  configurationService.setPatternOverride(pattern, {
    limit: config.capacity,
    windowMs: config.cleanupIntervalMs,
    algorithm: config.algorithm?.toLowerCase(),
  } as Partial<RateLimitConfig>);
  
  res.status(HTTP_STATUS.OK).json(config);
}

export async function removeKeyConfig(req: Request, res: Response): Promise<void> {
  const { key } = req.params;
  configurationService.removeOverride(key);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export async function removePatternConfig(req: Request, res: Response): Promise<void> {
  const { pattern } = req.params;
  configurationService.removePatternOverride(pattern);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export async function reloadConfig(req: Request, res: Response): Promise<void> {
  const defaults = configurationService.reload();
  res.status(HTTP_STATUS.OK).json({ message: 'Configuration reloaded successfully', defaults });
}

export async function getConfigStats(req: Request, res: Response): Promise<void> {
  const keyConfigs = configurationService.listOverrides().length;
  const patternConfigs = configurationService.listPatternOverrides().length;

  res.status(HTTP_STATUS.OK).json({
    cacheSize: keyConfigs + patternConfigs,
    bucketCount: keyConfigs, // Estimate backing capacity strictly
    keyConfigCount: keyConfigs,
    patternConfigCount: patternConfigs,
  });
}
