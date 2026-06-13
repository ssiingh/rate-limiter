import { Router } from 'express';
import { healthFull, healthLive, healthReady } from '../controllers/healthController';

const router = Router();

router.get('/', healthFull);
router.get('/live', healthLive);
router.get('/ready', healthReady);

export default router;
