import { Router } from 'express';
import {
  getAdaptiveConfig,
  getAdaptiveStatus,
  setAdaptiveOverride,
  clearAdaptiveOverride,
} from '../controllers/adaptiveController';

const router = Router();

router.get('/config', getAdaptiveConfig);
router.get('/:key/status', getAdaptiveStatus);
router.post('/:key/override', setAdaptiveOverride);
router.delete('/:key/override', clearAdaptiveOverride);

export default router;
