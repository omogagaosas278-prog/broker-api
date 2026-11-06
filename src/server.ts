import express from 'express';
import { authenticate, requireRole } from './middleware/auth';
import {
  getCustomerProfile,
  getCustomerWallets,
  placeCustomerTrade,
  adminListAllUsers,
  adminAdjustBalance,
  adminGetAllTrades,
} from './controllers/broker';

const app = express();
app.use(express.json());

// ------------------------------------------
// 1. STRICT CUSTOMER ROUTE GROUP
// Available to: Authenticated Customers (and Admins if explicitly permitted)
// ------------------------------------------
const customerRouter = express.Router();
customerRouter.use(authenticate); // Must be logged in

customerRouter.get('/profile', getCustomerProfile);
customerRouter.get('/wallets', getCustomerWallets);
customerRouter.post('/trades', placeCustomerTrade);

app.use('/api/customer', customerRouter);

// ------------------------------------------
// 2. UNLIMITED ADMIN ROUTE GROUP
// Available to: ADMIN role ONLY
// ------------------------------------------
const adminRouter = express.Router();
adminRouter.use(authenticate, requireRole(['ADMIN'])); // Strictly Admin

adminRouter.get('/users', adminListAllUsers);
adminRouter.patch('/wallet/adjust', adminAdjustBalance);
adminRouter.get('/trades', adminGetAllTrades);

app.use('/api/admin', adminRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Broker API running on port ${PORT}`);
});

export default app;
