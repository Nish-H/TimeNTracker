import express from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

// Health check endpoint
router.get('/', async (req, res, next) => {
  try {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'UNKNOWN',
      backupSystem: 'UNKNOWN',
      exportSystem: 'UNKNOWN'
    };

    // Test database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      healthCheck.database = 'CONNECTED';
    } catch (error) {
      console.error('Database health check failed:', error);
      healthCheck.database = 'DISCONNECTED';
      healthCheck.status = 'ERROR';
    }

    // Test backup system
    try {
      const backupCount = await prisma.backup.count();
      healthCheck.backupSystem = `OK (${backupCount} backups)`;
    } catch (error) {
      console.error('Backup system health check failed:', error);
      healthCheck.backupSystem = 'ERROR';
      healthCheck.status = 'DEGRADED';
    }

    // Test basic CRUD operations
    try {
      const [clientCount, categoryCount, taskCount, userCount] = await Promise.all([
        prisma.client.count(),
        prisma.category.count(),
        prisma.task.count(),
        prisma.user.count()
      ]);
      
      healthCheck.exportSystem = `OK (${clientCount} clients, ${categoryCount} categories, ${taskCount} tasks, ${userCount} users)`;
    } catch (error) {
      console.error('Export system health check failed:', error);
      healthCheck.exportSystem = 'ERROR';
      healthCheck.status = 'DEGRADED';
    }

    const statusCode = healthCheck.status === 'OK' ? 200 : 
                      healthCheck.status === 'DEGRADED' ? 200 : 503;

    res.status(statusCode).json(healthCheck);
  } catch (error) {
    console.error('Health check failed:', error);
    return next(error);
  }
});

// Detailed database health check
router.get('/database', async (req, res, next) => {
  try {
    const dbHealth = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      connection: 'UNKNOWN',
      tables: {},
      indices: 'UNKNOWN',
      performance: {}
    };

    const startTime = Date.now();

    // Test connection
    try {
      await prisma.$queryRaw`SELECT version()`;
      dbHealth.connection = 'OK';
    } catch (error) {
      dbHealth.connection = 'FAILED';
      dbHealth.status = 'ERROR';
    }

    // Test table accessibility
    try {
      const [users, clients, categories, tasks, timeLogs, backups] = await Promise.all([
        prisma.user.count(),
        prisma.client.count(),
        prisma.category.count(),
        prisma.task.count(),
        prisma.timeLog.count(),
        prisma.backup.count()
      ]);

      dbHealth.tables = {
        users,
        clients,
        categories,
        tasks,
        timeLogs,
        backups
      };
    } catch (error) {
      console.error('Table health check failed:', error);
      dbHealth.tables = { error: 'Failed to access tables' };
      dbHealth.status = 'DEGRADED';
    }

    const endTime = Date.now();
    dbHealth.performance = {
      queryTime: `${endTime - startTime}ms`,
      responseTime: 'FAST'
    };

    if (endTime - startTime > 1000) {
      (dbHealth.performance as any).responseTime = 'SLOW';
      dbHealth.status = 'DEGRADED';
    }

    const statusCode = dbHealth.status === 'OK' ? 200 : 
                      dbHealth.status === 'DEGRADED' ? 200 : 503;

    res.status(statusCode).json(dbHealth);
  } catch (error) {
    console.error('Database health check failed:', error);
    return next(error);
  }
});

export default router;