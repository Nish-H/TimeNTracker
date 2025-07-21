import express from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = express.Router();

const clientSchema = z.object({
  name: z.string()
    .min(1, 'Client name is required')
    .max(100, 'Client name must be less than 100 characters')
    .trim()
    .refine(val => val.length > 0, 'Client name cannot be empty'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),
});

// Get all clients
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ clients });
  } catch (error) {
    return next(error);
  }
});

// Get client by ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const clientId = parseInt(req.params.id);

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        tasks: {
          include: {
            category: { select: { id: true, name: true, color: true } },
            _count: { select: { timeLogs: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    return res.json({ client });
  } catch (error) {
    return next(error);
  }
});

// Create client
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = clientSchema.parse(req.body);

    // Check for duplicate client name
    const existingClient = await prisma.client.findFirst({
      where: { name: data.name.trim() }
    });

    if (existingClient) {
      return res.status(409).json({ 
        error: 'A client with this name already exists' 
      });
    }

    const client = await prisma.client.create({
      data: {
        ...data,
        name: data.name.trim()
      },
    });

    res.status(201).json({ client });
  } catch (error) {
    return next(error);
  }
});

// Update client
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const clientId = parseInt(req.params.id);
    const data = clientSchema.parse(req.body);

    // Check for duplicate client name (excluding current client)
    const existingClient = await prisma.client.findFirst({
      where: { 
        name: data.name.trim(),
        id: { not: clientId }
      }
    });

    if (existingClient) {
      return res.status(409).json({ 
        error: 'A client with this name already exists' 
      });
    }

    const client = await prisma.client.update({
      where: { id: clientId },
      data: {
        ...data,
        name: data.name.trim()
      },
    });

    res.json({ client });
  } catch (error) {
    return next(error);
  }
});

// Delete client
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const clientId = parseInt(req.params.id);

    // Check if client has tasks
    const tasksCount = await prisma.task.count({
      where: { clientId },
    });

    if (tasksCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete client with existing tasks' 
      });
    }

    await prisma.client.delete({
      where: { id: clientId },
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;