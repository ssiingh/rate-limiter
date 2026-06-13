import { Router } from 'express';
import { getPrometheusMetrics, getMetricsJson } from '../controllers/metricsController';

const router = Router();

router.get('/', getPrometheusMetrics);
router.get('/json', getMetricsJson);

export default router;
