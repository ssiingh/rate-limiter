import { Router } from 'express';
import { checkRateLimit, resetRateLimit } from '../controllers/rateLimitController';
import { rateLimitMiddleware } from '../middlewares/rateLimitMiddleware';

const router = Router();

router.post('/check', rateLimitMiddleware({ limit: 10000, windowMs: 60000 }), checkRateLimit);
router.delete('/reset/:key', resetRateLimit);

export default router;
