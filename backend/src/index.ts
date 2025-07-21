import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cron from 'node-cron';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import taskRoutes from './routes/tasks';
import timeLogRoutes from './routes/timeLogs';
import clientRoutes from './routes/clients';
import categoryRoutes from './routes/categories';
import reportRoutes from './routes/reports';
import backupRoutes from './routes/backup';
import exportRoutes from './routes/export';
import healthRoutes from './routes/health';

import { authenticateToken } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { runBackup } from './scripts/backup';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:4000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', authenticateToken, taskRoutes);
app.use('/api/time-logs', authenticateToken, timeLogRoutes);
app.use('/api/clients', authenticateToken, clientRoutes);
app.use('/api/categories', authenticateToken, categoryRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/backup', authenticateToken, backupRoutes);
app.use('/api/export', authenticateToken, exportRoutes);

// Error handling middleware
app.use(errorHandler);

// Schedule daily backup at 5pm
cron.schedule(process.env.BACKUP_SCHEDULE || '0 17 * * *', async () => {
  console.log('Running scheduled backup at 5pm...');
  try {
    await runBackup();
    console.log('Backup completed successfully');
  } catch (error) {
    console.error('Backup failed:', error);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 TimeNTracker API running on port ${PORT}`);
  console.log(`📅 Daily backup scheduled for 5pm`);
  console.log(`🔒 Security middleware enabled`);
});