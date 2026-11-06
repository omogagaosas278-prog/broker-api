import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  adminListAllUsers,
  adminAdjustBalance,
  adminGetAllTrades,
  adminSuspendUser,
} from '../controllers/broker';

const router = Router();

router.use(authenticate, requireRole(['ADMIN']));

router.get('/users', adminListAllUsers);
router.patch('/wallet/adjust', adminAdjustBalance);
router.get('/trades', adminGetAllTrades);
router.patch('/users/:userId/status', adminSuspendUser);

export default router;
