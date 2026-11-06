import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getCustomerProfile,
  getCustomerWallets,
  placeCustomerTrade,
} from '../controllers/broker';

const router = Router();

router.use(authenticate);

router.get('/profile', getCustomerProfile);
router.get('/wallets', getCustomerWallets);
router.post('/trades', placeCustomerTrade);

export default router;
