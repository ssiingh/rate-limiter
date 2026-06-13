import { Router } from 'express';
import { runBenchmark } from '../controllers/benchmarkController';

import { HTTP_STATUS } from '../utils/constants';

const router = Router();

router.post('/run', runBenchmark);
router.get('/health', (req, res) => {
  res.status(HTTP_STATUS.OK).json({ status: 'UP', service: 'Benchmark Engine' });
});

export default router;
