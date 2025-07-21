import express from 'express';
import { AuthRequest } from '../middleware/auth';
import { runBackup } from '../scripts/backup';
import prisma from '../lib/prisma';

const router = express.Router();

// Trigger manual backup
router.post('/run', async (req: AuthRequest, res, next) => {
  try {
    const result = await runBackup();
    
    if (result.success) {
      return res.json({
        success: true,
        message: 'Backup completed successfully',
        backup: {
          filename: result.filename,
          size: result.size,
          timestamp: result.timestamp,
          checksum: result.checksum
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Backup failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Backup error:', error);
    return next(error);
  }
});

// Get backup history
router.get('/history', async (req: AuthRequest, res, next) => {
  try {
    const backups = await prisma.backup.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return res.json({
      backups: backups.map(backup => ({
        id: backup.id,
        filename: backup.filename,
        size: backup.size,
        checksum: backup.checksum,
        createdAt: backup.createdAt,
        verified: backup.verified
      }))
    });
  } catch (error) {
    console.error('Failed to get backup history:', error);
    return next(error);
  }
});

// Get backup status/stats
router.get('/status', async (req: AuthRequest, res, next) => {
  try {
    const totalBackups = await prisma.backup.count();
    const lastBackup = await prisma.backup.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    const verifiedBackups = await prisma.backup.count({
      where: { verified: true }
    });

    return res.json({
      totalBackups,
      verifiedBackups,
      lastBackup: lastBackup ? {
        filename: lastBackup.filename,
        createdAt: lastBackup.createdAt,
        size: lastBackup.size,
        verified: lastBackup.verified
      } : null,
      retentionDays: 30,
      schedule: 'Daily at 5pm'
    });
  } catch (error) {
    console.error('Failed to get backup status:', error);
    return next(error);
  }
});

export default router;