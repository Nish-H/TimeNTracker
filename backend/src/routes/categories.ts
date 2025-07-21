import express from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = express.Router();

const categorySchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(50, 'Category name must be less than 50 characters')
    .trim()
    .refine(val => val.length > 0, 'Category name cannot be empty'),
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color code')
    .default('#6B7280'),
});

// Get all categories
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ categories });
  } catch (error) {
    return next(error);
  }
});

// Get category by ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const categoryId = parseInt(req.params.id);

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        tasks: {
          include: {
            client: { select: { id: true, name: true } },
            _count: { select: { timeLogs: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    return res.json({ category });
  } catch (error) {
    return next(error);
  }
});

// Create category
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = categorySchema.parse(req.body);

    // Check for duplicate category name
    const existingCategory = await prisma.category.findFirst({
      where: { name: data.name.trim() }
    });

    if (existingCategory) {
      return res.status(409).json({ 
        error: 'A category with this name already exists' 
      });
    }

    const category = await prisma.category.create({
      data: {
        ...data,
        name: data.name.trim()
      },
    });

    res.status(201).json({ category });
  } catch (error) {
    return next(error);
  }
});

// Update category
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const categoryId = parseInt(req.params.id);
    const data = categorySchema.parse(req.body);

    // Check for duplicate category name (excluding current category)
    const existingCategory = await prisma.category.findFirst({
      where: { 
        name: data.name.trim(),
        id: { not: categoryId }
      }
    });

    if (existingCategory) {
      return res.status(409).json({ 
        error: 'A category with this name already exists' 
      });
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...data,
        name: data.name.trim()
      },
    });

    res.json({ category });
  } catch (error) {
    return next(error);
  }
});

// Delete category
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const categoryId = parseInt(req.params.id);

    // Check if category has tasks
    const tasksCount = await prisma.task.count({
      where: { categoryId },
    });

    if (tasksCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing tasks' 
      });
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;