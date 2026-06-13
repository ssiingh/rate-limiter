import { Router } from 'express';
import {
  getAdminKey,
  setAdminLimit,
  deleteAdminKey,
  listAdminKeys,
} from '../controllers/adminController';
import adminAuthConfig from '../config/adminAuthConfig';
import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../utils/constants';

const router = Router();

// Simple admin key guard
const adminGuard = (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['x-admin-key'] as string;
  if (key !== adminAuthConfig.apiKey) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid admin key' });
    return;
  }
  next();
};

router.use(adminGuard);

// New API Reference mappings
router.get('/keys', listAdminKeys);
router.get('/limits/:key', getAdminKey);
router.put('/limits/:key', setAdminLimit);
router.delete('/limits/:key', deleteAdminKey);

// Backward compatibility alias for the old dashboard endpoints
router.get('/limits', listAdminKeys);
router.post('/limits', setAdminLimit);

export default router;
