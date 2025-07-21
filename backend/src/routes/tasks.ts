import express from 'express';
import { z } from 'zod';
import { TaskStatus, TaskPriority } from '@prisma/client';
import prisma from '../lib/prisma';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = express.Router();

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  haloTicketId: z.string().optional(),
  clientId: z.number().optional(),
  categoryId: z.number().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  haloTicketId: z.string().optional(),
  clientId: z.number().optional(),
  categoryId: z.number().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().optional(),
});

// Get all tasks
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { status, priority, clientId, categoryId, haloTicketId } = req.query;

    const where: any = {};
    if (status) {
      // Handle comma-separated status values
      const statusArray = (status as string).split(',').map(s => s.trim());
      where.status = { in: statusArray };
    }
    if (priority) where.priority = priority;
    if (clientId) where.clientId = parseInt(clientId as string);
    if (categoryId) where.categoryId = parseInt(categoryId as string);
    if (haloTicketId) where.haloTicketId = { contains: haloTicketId as string };

    const tasks = await prisma.task.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        timeLogs: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            durationMinutes: true,
            description: true,
          },
        },
        _count: { select: { timeLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ tasks });
  } catch (error) {
    return next(error);
  }
});

// Get task by ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const taskId = parseInt(req.params.id);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        client: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        timeLogs: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            durationMinutes: true,
            description: true,
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.json({ task });
  } catch (error) {
    return next(error);
  }
});

// Create task
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const data = createTaskSchema.parse(req.body);

    const taskData: any = {
      title: data.title,
      description: data.description,
      haloTicketId: data.haloTicketId,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority as TaskPriority,
      userId: req.user!.id,
    };
    
    if (data.clientId) {
      taskData.clientId = data.clientId;
    }
    
    if (data.categoryId) {
      taskData.categoryId = data.categoryId;
    }
    
    const task = await prisma.task.create({
      data: taskData,
      include: {
        client: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });

    res.status(201).json({ task });
  } catch (error) {
    return next(error);
  }
});

// Update task
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const taskId = parseInt(req.params.id);
    const data = updateTaskSchema.parse(req.body);

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        status: data.status as TaskStatus | undefined,
        priority: data.priority as TaskPriority | undefined,
      },
      include: {
        client: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });

    res.json({ task });
  } catch (error) {
    return next(error);
  }
});

// Delete task
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const taskId = parseInt(req.params.id);

    await prisma.task.delete({
      where: { id: taskId },
    });

    res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

// Get tasks by Halo ticket ID
router.get('/halo/:ticketId', async (req: AuthRequest, res, next) => {
  try {
    const { ticketId } = req.params;

    const tasks = await prisma.task.findMany({
      where: { haloTicketId: ticketId },
      include: {
        client: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        timeLogs: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            durationMinutes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ tasks });
  } catch (error) {
    return next(error);
  }
});

export default router;