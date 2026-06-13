import { Router } from 'express';
import {
  getConfig,
  updateDefaultConfig,
  setKeyConfig,
  setPatternConfig,
  removeKeyConfig,
  removePatternConfig,
  reloadConfig,
  getConfigStats,
} from '../controllers/configController';

const router = Router();

router.get('/', getConfig);
router.post('/default', updateDefaultConfig);
router.post('/keys/:key', setKeyConfig);
router.delete('/keys/:key', removeKeyConfig);
router.post('/patterns/:pattern', setPatternConfig);
router.delete('/patterns/:pattern', removePatternConfig);
router.post('/reload', reloadConfig);
router.get('/stats', getConfigStats);

export default router;
