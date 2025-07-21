import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    role: 'STANDARD' | 'POWER' | 'ADMIN';
    isActive: boolean;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, isActive: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Role-based access control middleware
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  if (req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  next();
};

export const requirePowerUser = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  if (req.user.role !== 'POWER' && req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Power user or admin access required' });
    return;
  }
  
  next();
};

export const requireStandardUser = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  if (!['STANDARD', 'POWER', 'ADMIN'].includes(req.user.role)) {
    res.status(403).json({ error: 'User access required' });
    return;
  }
  
  next();
};

// Helper function to check if user can access resource
export const canAccessResource = (userRole: string, requiredRole: string): boolean => {
  const roleHierarchy: Record<string, number> = {
    'STANDARD': 1,
    'POWER': 2,
    'ADMIN': 3
  };
  
  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
};

// Legacy export for backward compatibility
export const auth = authenticateToken;

export type { AuthRequest };