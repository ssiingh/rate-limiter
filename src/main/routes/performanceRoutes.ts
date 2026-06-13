import { Router } from 'express';
import {
  storeBaseline,
  analyzeRegression,
  storeAndAnalyze,
  getBaselines,
  getTrend,
  getHealth,
} from '../controllers/performanceController';

const router = Router();

router.post('/baseline', storeBaseline);
router.post('/regression/analyze', analyzeRegression);
router.post('/baseline/store-and-analyze', storeAndAnalyze);
router.get('/baseline/:testName', getBaselines);
router.get('/trend/:testName', getTrend);
router.get('/health', getHealth);

export default router;
