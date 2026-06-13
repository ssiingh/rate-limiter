import { Request, Response } from 'express';
import { getRedisClient } from '../redis/redisClient';
import { HTTP_STATUS, REDIS_KEY_PREFIX } from '../utils/constants';
import { validate, AdminLimitSchema } from '../utils/validation';
import logger from '../utils/logger';

const redis = getRedisClient();

export async function getAdminKey(req: Request, res: Response): Promise<void> {
  const { key } = req.params;
  const data = await redis.hgetall(`${REDIS_KEY_PREFIX.CONFIG}:limit:${key}`);
  if (!data || Object.keys(data).length === 0) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Key not found' });
    return;
  }
  res.json(data);
}

export async function setAdminLimit(req: Request, res: Response): Promise<void> {
  // If key is provided in path (PUT /limits/:key), override body key
  if (req.params.key) {
    req.body.key = req.params.key;
  }
  
  const input = validate(AdminLimitSchema, req.body);
  const redisKey = `${REDIS_KEY_PREFIX.CONFIG}:limit:${input.key}`;
  
  const data = {
    key: input.key,
    limit: String(input.limit),
    windowMs: String(input.windowMs),
    algorithm: input.algorithm || 'token_bucket',
    updatedAt: new Date().toISOString(),
  };

  await redis.hset(redisKey, data);
  if (input.expiresAt) {
    const ttl = Math.ceil((input.expiresAt - Date.now()) / 1000);
    if (ttl > 0) await redis.expire(redisKey, ttl);
  }

  logger.info('Admin limit set', { key: input.key });
  res.status(HTTP_STATUS.OK).json({ ...data, expiresAt: input.expiresAt });
}

export async function deleteAdminKey(req: Request, res: Response): Promise<void> {
  const { key } = req.params;
  await redis.del(`${REDIS_KEY_PREFIX.CONFIG}:limit:${key}`);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export async function listAdminKeys(req: Request, res: Response): Promise<void> {
  const pattern = `${REDIS_KEY_PREFIX.CONFIG}:limit:*`;
  const keys = await redis.keys(pattern);
  const items = await Promise.all(
    keys.map(async (k) => redis.hgetall(k))
  );
  res.json({ keys: items.filter(Boolean), total: items.length });
}
