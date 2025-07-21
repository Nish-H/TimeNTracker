import express from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = express.Router();

// Export all data
router.get('/data', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;

    // Get all data
    const [users, clients, categories, tasks, timeLogs] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.client.findMany(),
      prisma.category.findMany(),
      prisma.task.findMany({
        include: {
          client: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, color: true } },
          _count: { select: { timeLogs: true } }
        }
      }),
      prisma.timeLog.findMany({
        include: {
          task: { select: { id: true, title: true } },
          user: { select: { id: true, name: true } }
        }
      })
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: req.user?.name || 'Unknown',
      version: '1.0.0',
      data: {
        users,
        clients,
        categories,
        tasks,
        timeLogs
      },
      counts: {
        users: users.length,
        clients: clients.length,
        categories: categories.length,
        tasks: tasks.length,
        timeLogs: timeLogs.length
      }
    };

    return res.json(exportData);
  } catch (error) {
    console.error('Data export error:', error);
    return next(error);
  }
});

// Export specific data types
router.get('/clients', async (req: AuthRequest, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      include: {
        _count: { select: { tasks: true } }
      }
    });

    return res.json({
      exportedAt: new Date().toISOString(),
      type: 'clients',
      data: clients,
      count: clients.length
    });
  } catch (error) {
    console.error('Client export error:', error);
    return next(error);
  }
});

router.get('/categories', async (req: AuthRequest, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { tasks: true } }
      }
    });

    return res.json({
      exportedAt: new Date().toISOString(),
      type: 'categories',
      data: categories,
      count: categories.length
    });
  } catch (error) {
    console.error('Category export error:', error);
    return next(error);
  }
});

// Import data
router.post('/import', async (req: AuthRequest, res, next) => {
  try {
    const { data, options = {} } = req.body;
    const { overwrite = false, skipDuplicates = true } = options;

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'No data provided for import'
      });
    }

    // Validate data structure
    if (typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format - must be an object'
      });
    }

    const results = {
      clients: { created: 0, updated: 0, skipped: 0, errors: 0 },
      categories: { created: 0, updated: 0, skipped: 0, errors: 0 },
      tasks: { created: 0, updated: 0, skipped: 0, errors: 0 },
      timeLogs: { created: 0, updated: 0, skipped: 0, errors: 0 }
    };

    // Validate and sanitize client data
    if (data.clients && Array.isArray(data.clients)) {
      for (const client of data.clients) {
        try {
          // Validate required fields
          if (!client.name || typeof client.name !== 'string') {
            console.error('Invalid client data - missing or invalid name:', client);
            results.clients.errors++;
            continue;
          }

          const sanitizedName = client.name.trim();
          if (sanitizedName.length === 0) {
            console.error('Invalid client data - empty name after trimming:', client);
            results.clients.errors++;
            continue;
          }

          const existing = await prisma.client.findFirst({
            where: { name: sanitizedName }
          });

          if (existing) {
            if (overwrite) {
              await prisma.client.update({
                where: { id: existing.id },
                data: {
                  name: sanitizedName,
                  description: client.description?.trim() || null
                }
              });
              results.clients.updated++;
            } else {
              results.clients.skipped++;
            }
          } else {
            await prisma.client.create({
              data: {
                name: sanitizedName,
                description: client.description?.trim() || null
              }
            });
            results.clients.created++;
          }
        } catch (error) {
          console.error('Error importing client:', client.name, error);
          results.clients.errors++;
        }
      }
    }

    // Validate and sanitize category data
    if (data.categories && Array.isArray(data.categories)) {
      for (const category of data.categories) {
        try {
          // Validate required fields
          if (!category.name || typeof category.name !== 'string') {
            console.error('Invalid category data - missing or invalid name:', category);
            results.categories.errors++;
            continue;
          }

          const sanitizedName = category.name.trim();
          if (sanitizedName.length === 0) {
            console.error('Invalid category data - empty name after trimming:', category);
            results.categories.errors++;
            continue;
          }

          // Validate color format
          let sanitizedColor = '#6B7280'; // default
          if (category.color && typeof category.color === 'string') {
            const colorPattern = /^#[0-9A-F]{6}$/i;
            if (colorPattern.test(category.color.trim())) {
              sanitizedColor = category.color.trim();
            }
          }

          const existing = await prisma.category.findFirst({
            where: { name: sanitizedName }
          });

          if (existing) {
            if (overwrite) {
              await prisma.category.update({
                where: { id: existing.id },
                data: {
                  name: sanitizedName,
                  color: sanitizedColor
                }
              });
              results.categories.updated++;
            } else {
              results.categories.skipped++;
            }
          } else {
            await prisma.category.create({
              data: {
                name: sanitizedName,
                color: sanitizedColor
              }
            });
            results.categories.created++;
          }
        } catch (error) {
          console.error('Error importing category:', category.name, error);
          results.categories.errors++;
        }
      }
    }

    return res.json({
      success: true,
      message: 'Data imported successfully',
      results
    });
  } catch (error) {
    console.error('Data import error:', error);
    return next(error);
  }
});

export default router;