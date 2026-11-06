import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import customerRoutes from './routes/customer';
import adminRoutes from './routes/admin';

const app = express();

app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use('/api/customer', customerRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/', (_req, res) => res.json({ 
  name: 'Broker API', 
  version: '1.0.0',
  endpoints: {
    customer: ['/api/customer/profile', '/api/customer/wallets', '/api/customer/trades'],
    admin: ['/api/admin/users', '/api/admin/wallet/adjust', '/api/admin/trades']
  }
}));

export default app;

// For local
if (typeof require !== 'undefined' && require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Broker API running on port ${PORT}`);
  });
}
