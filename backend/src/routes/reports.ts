import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';

const router = express.Router();

const reportQuerySchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  userId: z.string().optional(),
  clientId: z.string().optional(),
  categoryId: z.string().optional(),
});

// Get daily activity report
router.get('/daily', async (req: AuthRequest, res, next) => {
  try {
    const { date, userId: queryUserId } = req.query;
    const currentUser = req.user!;
    // Allow admins to view other users' reports, otherwise use current user
    const userId = (currentUser.role === 'admin' && queryUserId) ? parseInt(queryUserId as string) : currentUser.id;
    const reportDate = date ? new Date(date as string) : new Date();

    const startDate = startOfDay(reportDate);
    const endDate = endOfDay(reportDate);

    const timeLogs = await prisma.timeLog.findMany({
      where: {
        userId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        task: {
          include: {
            client: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const summary = {
      date: format(reportDate, 'yyyy-MM-dd'),
      totalHours: 0,
      totalMinutes: 0,
      entriesCount: timeLogs.length,
      byCategory: {} as Record<string, { minutes: number; hours: number; count: number }>,
      byClient: {} as Record<string, { minutes: number; hours: number; count: number }>,
      byTask: {} as Record<string, { minutes: number; hours: number; count: number; haloTicketId?: string }>,
    };

    timeLogs.forEach(log => {
      const minutes = log.durationMinutes || 0;
      summary.totalMinutes += minutes;

      // By category
      const categoryName = log.task.category?.name || 'Uncategorized';
      if (!summary.byCategory[categoryName]) {
        summary.byCategory[categoryName] = { minutes: 0, hours: 0, count: 0 };
      }
      summary.byCategory[categoryName].minutes += minutes;
      summary.byCategory[categoryName].count += 1;

      // By client
      const clientName = log.task.client?.name || 'No Client';
      if (!summary.byClient[clientName]) {
        summary.byClient[clientName] = { minutes: 0, hours: 0, count: 0 };
      }
      summary.byClient[clientName].minutes += minutes;
      summary.byClient[clientName].count += 1;

      // By task
      const taskTitle = log.task.title;
      if (!summary.byTask[taskTitle]) {
        summary.byTask[taskTitle] = { 
          minutes: 0, 
          hours: 0, 
          count: 0,
          haloTicketId: log.task.haloTicketId || undefined
        };
      }
      summary.byTask[taskTitle].minutes += minutes;
      summary.byTask[taskTitle].count += 1;
    });

    // Convert minutes to hours for all categories
    summary.totalHours = parseFloat((summary.totalMinutes / 60).toFixed(2));

    Object.values(summary.byCategory).forEach(cat => {
      cat.hours = parseFloat((cat.minutes / 60).toFixed(2));
    });

    Object.values(summary.byClient).forEach(client => {
      client.hours = parseFloat((client.minutes / 60).toFixed(2));
    });

    Object.values(summary.byTask).forEach(task => {
      task.hours = parseFloat((task.minutes / 60).toFixed(2));
    });

    res.json({
      summary,
      timeLogs,
    });
  } catch (error) {
    return next(error);
  }
});

// Get weekly report
router.get('/weekly', async (req: AuthRequest, res, next) => {
  try {
    const { startDate } = req.query;
    const userId = req.user!.id;
    const weekStart = startDate ? new Date(startDate as string) : startOfDay(subDays(new Date(), 6));
    const weekEnd = endOfDay(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000));

    const timeLogs = await prisma.timeLog.findMany({
      where: {
        userId,
        startTime: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        task: {
          include: {
            client: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const dailyBreakdown = {} as Record<string, { 
      totalMinutes: number; 
      totalHours: number; 
      entries: number 
    }>;

    timeLogs.forEach(log => {
      const day = format(log.startTime, 'yyyy-MM-dd');
      if (!dailyBreakdown[day]) {
        dailyBreakdown[day] = { totalMinutes: 0, totalHours: 0, entries: 0 };
      }
      dailyBreakdown[day].totalMinutes += log.durationMinutes || 0;
      dailyBreakdown[day].entries += 1;
    });

    Object.values(dailyBreakdown).forEach(day => {
      day.totalHours = parseFloat((day.totalMinutes / 60).toFixed(2));
    });

    res.json({
      period: {
        start: format(weekStart, 'yyyy-MM-dd'),
        end: format(weekEnd, 'yyyy-MM-dd'),
      },
      dailyBreakdown,
      timeLogs,
    });
  } catch (error) {
    return next(error);
  }
});

// Get custom range report
router.get('/range', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, clientId, categoryId, userId: queryUserId } = reportQuerySchema.parse(req.query);
    const currentUser = req.user!;
    // Allow admins to view other users' reports, otherwise use current user
    const userId = (currentUser.role === 'admin' && queryUserId) ? parseInt(queryUserId) : currentUser.id;

    const where: any = {
      userId,
      startTime: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (clientId) {
      where.task = { clientId: parseInt(clientId) };
    }

    if (categoryId) {
      where.task = { ...where.task, categoryId: parseInt(categoryId) };
    }

    const timeLogs = await prisma.timeLog.findMany({
      where,
      include: {
        task: {
          include: {
            client: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const totalMinutes = timeLogs.reduce((sum, log) => sum + (log.durationMinutes || 0), 0);

    // Generate detailed breakdown
    const dailyBreakdown = {} as Record<string, { 
      hours: number; 
      entries: number; 
      tasks: number;
    }>;
    const byCategory = {} as Record<string, { 
      hours: number; 
      entries: number; 
    }>;
    const byClient = {} as Record<string, { 
      hours: number; 
      entries: number; 
    }>;
    const byTask = {} as Record<string, { 
      hours: number; 
      entries: number; 
      haloTicketId?: string 
    }>;

    const uniqueDates = new Set<string>();
    const uniqueTasks = new Set<string>();

    timeLogs.forEach(log => {
      const minutes = log.durationMinutes || 0;
      const hours = parseFloat((minutes / 60).toFixed(2));
      
      // Daily breakdown
      const day = format(log.startTime, 'yyyy-MM-dd');
      uniqueDates.add(day);
      if (!dailyBreakdown[day]) {
        dailyBreakdown[day] = { hours: 0, entries: 0, tasks: 0 };
      }
      dailyBreakdown[day].hours += hours;
      dailyBreakdown[day].entries += 1;

      // Category breakdown
      const categoryName = log.task.category?.name || 'Uncategorized';
      if (!byCategory[categoryName]) {
        byCategory[categoryName] = { hours: 0, entries: 0 };
      }
      byCategory[categoryName].hours += hours;
      byCategory[categoryName].entries += 1;

      // Client breakdown
      const clientName = log.task.client?.name || 'No Client';
      if (!byClient[clientName]) {
        byClient[clientName] = { hours: 0, entries: 0 };
      }
      byClient[clientName].hours += hours;
      byClient[clientName].entries += 1;

      // Task breakdown
      const taskTitle = log.task.title;
      uniqueTasks.add(taskTitle);
      if (!byTask[taskTitle]) {
        byTask[taskTitle] = { 
          hours: 0, 
          entries: 0,
          haloTicketId: log.task.haloTicketId || undefined
        };
      }
      byTask[taskTitle].hours += hours;
      byTask[taskTitle].entries += 1;
    });

    // Calculate unique tasks per day
    Object.keys(dailyBreakdown).forEach(day => {
      const dayTasks = new Set(
        timeLogs
          .filter(log => format(log.startTime, 'yyyy-MM-dd') === day)
          .map(log => log.task.title)
      );
      dailyBreakdown[day].tasks = dayTasks.size;
    });

    // Round all hours to 2 decimal places
    Object.values(dailyBreakdown).forEach(day => {
      day.hours = parseFloat(day.hours.toFixed(2));
    });
    Object.values(byCategory).forEach(cat => {
      cat.hours = parseFloat(cat.hours.toFixed(2));
    });
    Object.values(byClient).forEach(client => {
      client.hours = parseFloat(client.hours.toFixed(2));
    });
    Object.values(byTask).forEach(task => {
      task.hours = parseFloat(task.hours.toFixed(2));
    });

    res.json({
      period: { startDate, endDate },
      summary: {
        totalMinutes,
        totalHours: parseFloat((totalMinutes / 60).toFixed(2)),
        entriesCount: timeLogs.length,
        tasksCount: uniqueTasks.size,
        daysWorked: uniqueDates.size,
      },
      dailyBreakdown,
      byCategory,
      byClient,
      byTask,
      timeLogs,
    });
  } catch (error) {
    return next(error);
  }
});

// Generate Halo-compatible export
router.get('/halo-export', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, userId: queryUserId } = req.query;
    const currentUser = req.user!;
    // Allow admins to view other users' reports, otherwise use current user
    const userId = (currentUser.role === 'admin' && queryUserId) ? parseInt(queryUserId as string) : currentUser.id;

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
        endTime: { not: null }, // Only completed time logs
      },
      include: {
        task: {
          include: {
            client: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const haloExport = timeLogs.map(log => ({
      ticket_id: log.task.haloTicketId || '',
      task_title: log.task.title,
      client: log.task.client?.name || 'No Client',
      category: log.task.category?.name || 'Uncategorized',
      date: format(log.startTime, 'yyyy-MM-dd'),
      start_time: format(log.startTime, 'HH:mm'),
      end_time: log.endTime ? format(log.endTime, 'HH:mm') : '',
      duration_minutes: log.durationMinutes || 0,
      duration_hours: parseFloat(((log.durationMinutes || 0) / 60).toFixed(2)),
      description: log.description || '',
    }));

    return res.json({
      period: { startDate, endDate },
      export: haloExport,
      summary: {
        totalEntries: haloExport.length,
        totalMinutes: haloExport.reduce((sum, entry) => sum + entry.duration_minutes, 0),
        totalHours: parseFloat((haloExport.reduce((sum, entry) => sum + entry.duration_minutes, 0) / 60).toFixed(2)),
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;