import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

const startTimeLogSchema = z.object({
  taskId: z.number(),
  description: z.string().optional(),
});

const stopTimeLogSchema = z.object({
  id: z.number(),
  endTime: z.string(),
  description: z.string().optional(),
});

const updateTimeLogSchema = z.object({
  taskId: z.number().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  description: z.string().optional(),
});

const createTimeLogSchema = z.object({
  taskId: z.number(),
  startTime: z.string(),
  endTime: z.string(),
  description: z.string().optional(),
});

// Get all time logs
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { taskId, date, active, userId: queryUserId } = req.query;
    const currentUser = req.user!;
    // Allow admins to view other users' time logs, otherwise use current user
    const userId = (currentUser.role === 'admin' && queryUserId) ? parseInt(queryUserId as string) : currentUser.id;

    const where: any = { userId };
    
    if (taskId) where.taskId = parseInt(taskId as string);
    if (active === 'true') where.endTime = null;
    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      where.startTime = {
        gte: startDate,
        lt: endDate,
      };
    }

    const timeLogs = await prisma.timeLog.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            haloTicketId: true,
            client: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true } },
          },
        },
        user: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'desc' },
    });

    res.json({ timeLogs });
  } catch (error) {
    return next(error);
  }
});

// Get active time log
router.get('/active', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const activeTimeLog = await prisma.timeLog.findFirst({
      where: {
        userId,
        endTime: null,
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            haloTicketId: true,
            client: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    res.json({ activeTimeLog });
  } catch (error) {
    return next(error);
  }
});

// Start time tracking
router.post('/start', async (req: AuthRequest, res, next) => {
  try {
    const { taskId, description } = startTimeLogSchema.parse(req.body);
    const userId = req.user!.id;

    // Check if there's already an active time log
    const activeTimeLog = await prisma.timeLog.findFirst({
      where: {
        userId,
        endTime: null,
      },
    });

    if (activeTimeLog) {
      return res.status(400).json({ 
        error: 'You already have an active time log. Please stop it first.' 
      });
    }

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const timeLog = await prisma.timeLog.create({
      data: {
        taskId,
        userId,
        startTime: new Date(),
        description,
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            haloTicketId: true,
            client: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    // Update task status to IN_PROGRESS if it's PENDING
    if (task.status === 'PENDING') {
      await prisma.task.update({
        where: { id: taskId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    res.status(201).json({ timeLog });
  } catch (error) {
    return next(error);
  }
});

// Stop time tracking
router.post('/stop', async (req: AuthRequest, res, next) => {
  try {
    const { id, endTime, description } = stopTimeLogSchema.parse(req.body);
    const userId = req.user!.id;

    const timeLog = await prisma.timeLog.findFirst({
      where: {
        id,
        userId,
        endTime: null,
      },
    });

    if (!timeLog) {
      return res.status(404).json({ error: 'Active time log not found' });
    }

    const endDateTime = new Date(endTime);
    const durationMinutes = Math.ceil(
      (endDateTime.getTime() - timeLog.startTime.getTime()) / (1000 * 60)
    );

    const updatedTimeLog = await prisma.timeLog.update({
      where: { id },
      data: {
        endTime: endDateTime,
        durationMinutes,
        description: description || timeLog.description,
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            haloTicketId: true,
            client: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    return res.json({ timeLog: updatedTimeLog });
  } catch (error) {
    return next(error);
  }
});

// Create manual time entry (supports past dates)
router.post('/manual', async (req: AuthRequest, res, next) => {
  try {
    const { taskId, startTime, endTime, description } = createTimeLogSchema.parse(req.body);
    const userId = req.user!.id;

    // Verify task exists and user has access
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Validate times
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);

    if (startDateTime >= endDateTime) {
      return res.status(400).json({ error: 'Start time must be before end time' });
    }

    // Check for overlapping time entries
    const overlappingEntries = await prisma.timeLog.findMany({
      where: {
        userId,
        OR: [
          {
            startTime: {
              lt: endDateTime,
            },
            endTime: {
              gt: startDateTime,
            },
          },
          {
            startTime: {
              gte: startDateTime,
              lt: endDateTime,
            },
          },
          {
            endTime: {
              gt: startDateTime,
              lte: endDateTime,
            },
          },
        ],
      },
    });

    if (overlappingEntries.length > 0) {
      return res.status(400).json({ 
        error: 'Time entry overlaps with existing entries',
        overlappingEntries: overlappingEntries.map(entry => ({
          id: entry.id,
          startTime: entry.startTime,
          endTime: entry.endTime,
          taskId: entry.taskId,
        }))
      });
    }

    // Calculate duration
    const durationMinutes = Math.ceil(
      (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60)
    );

    // Use transaction with proper error handling for database-level constraint violations
    const timeLog = await prisma.$transaction(async (tx) => {
      // Double-check for overlaps within the transaction
      const recentOverlappingEntries = await tx.timeLog.findMany({
        where: {
          userId,
          OR: [
            {
              startTime: {
                lt: endDateTime,
              },
              endTime: {
                gt: startDateTime,
              },
            },
            {
              startTime: {
                gte: startDateTime,
                lt: endDateTime,
              },
            },
            {
              endTime: {
                gt: startDateTime,
                lte: endDateTime,
              },
            },
          ],
        },
      });

      if (recentOverlappingEntries.length > 0) {
        throw new Error('Time entry overlaps with existing entries (detected in transaction)');
      }

      return await tx.timeLog.create({
        data: {
          taskId,
          userId,
          startTime: startDateTime,
          endTime: endDateTime,
          durationMinutes,
          description,
        },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              haloTicketId: true,
              client: { select: { id: true, name: true } },
              category: { select: { id: true, name: true, color: true } },
            },
          },
        },
      });
    });

    res.status(201).json({ timeLog });
  } catch (error) {
    return next(error);
  }
});

// Update time log
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const timeLogId = parseInt(req.params.id);
    const data = updateTimeLogSchema.parse(req.body);
    const userId = req.user!.id;

    const timeLog = await prisma.timeLog.findFirst({
      where: {
        id: timeLogId,
        userId,
      },
    });

    if (!timeLog) {
      return res.status(404).json({ error: 'Time log not found' });
    }

    const updateData: any = {};
    if (data.taskId) updateData.taskId = data.taskId;
    if (data.startTime) updateData.startTime = new Date(data.startTime);
    if (data.endTime) updateData.endTime = new Date(data.endTime);
    if (data.description !== undefined) updateData.description = data.description;

    // Recalculate duration if start or end time changed
    if (data.startTime || data.endTime) {
      const startTime = data.startTime ? new Date(data.startTime) : timeLog.startTime;
      const endTime = data.endTime ? new Date(data.endTime) : timeLog.endTime;
      
      if (endTime) {
        // Validate that start time is before end time
        if (startTime >= endTime) {
          return res.status(400).json({ error: 'Start time must be before end time' });
        }

        // Check for overlapping time entries (excluding current entry)
        const overlappingEntries = await prisma.timeLog.findMany({
          where: {
            userId,
            id: { not: timeLogId }, // Exclude current entry
            OR: [
              {
                startTime: {
                  lt: endTime,
                },
                endTime: {
                  gt: startTime,
                },
              },
              {
                startTime: {
                  gte: startTime,
                  lt: endTime,
                },
              },
              {
                endTime: {
                  gt: startTime,
                  lte: endTime,
                },
              },
            ],
          },
        });

        if (overlappingEntries.length > 0) {
          return res.status(400).json({ 
            error: 'Time entry overlaps with existing entries',
            overlappingEntries: overlappingEntries.map(entry => ({
              id: entry.id,
              startTime: entry.startTime,
              endTime: entry.endTime,
              taskId: entry.taskId,
            }))
          });
        }

        updateData.durationMinutes = Math.ceil(
          (endTime.getTime() - startTime.getTime()) / (1000 * 60)
        );
      }
    }

    const updatedTimeLog = await prisma.timeLog.update({
      where: { id: timeLogId },
      data: updateData,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            haloTicketId: true,
            client: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    return res.json({ timeLog: updatedTimeLog });
  } catch (error) {
    return next(error);
  }
});

// Delete time log
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const timeLogId = parseInt(req.params.id);
    const userId = req.user!.id;

    const timeLog = await prisma.timeLog.findFirst({
      where: {
        id: timeLogId,
        userId,
      },
    });

    if (!timeLog) {
      return res.status(404).json({ error: 'Time log not found' });
    }

    await prisma.timeLog.delete({
      where: { id: timeLogId },
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

// Get time logs by date range
router.get('/range', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user!.id;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const timeLogs = await prisma.timeLog.findMany({
      where: {
        userId,
        startTime: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            haloTicketId: true,
            client: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    return res.json({ timeLogs });
  } catch (error) {
    return next(error);
  }
});

export default router;