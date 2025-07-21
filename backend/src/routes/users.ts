import express from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';
import { auth, requireAdmin, requirePowerUser, AuthRequest } from '../middleware/auth';

const router = express.Router();

// All middleware now imported from auth.ts

// Get all users (admin only)
router.get('/', auth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        passwordChangedAt: true,
        loginAttempts: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tasks: true,
            timeLogs: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', auth, async (req: AuthRequest, res): Promise<any> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update current user profile
router.put('/profile', auth, async (req: AuthRequest, res): Promise<any> => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    
    // Validate current password if changing password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password required to change password' });
      }
      
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id }
      });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (newPassword) {
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    res.json(updatedUser);
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user (admin only)
router.post('/', auth, requireAdmin, async (req: AuthRequest, res): Promise<any> => {
  try {
    const { email, name, password, role = 'STANDARD' } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }

    // Validate role
    if (!['STANDARD', 'POWER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    res.status(201).json(user);
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin only)
router.put('/:id', auth, requireAdmin, async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive, password } = req.body;

    // Validate role if provided
    if (role && !['STANDARD', 'POWER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prepare update data
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
      updateData.passwordChangedAt = new Date();
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    res.json(updatedUser);
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', auth, requireAdmin, async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // Prevent deleting yourself
    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user has tasks or time logs
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            tasks: true,
            timeLogs: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Instead of deleting, deactivate user if they have data
    if (user._count.tasks > 0 || user._count.timeLogs > 0) {
      const deactivatedUser = await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true
        }
      });
      
      return res.json({ message: 'User deactivated', user: deactivatedUser });
    }

    // Delete user if no associated data
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Unlock user account (admin only)
router.post('/:id/unlock', auth, requireAdmin, async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params;

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        loginAttempts: true,
        lockedUntil: true,
      }
    });

    res.json({ message: 'User account unlocked successfully', user: updatedUser });
  } catch (error: any) {
    console.error('Error unlocking user:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset user password (admin only)
router.post('/:id/reset-password', auth, requireAdmin, async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        loginAttempts: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        passwordChangedAt: true,
      }
    });

    res.json({ message: 'Password reset successfully', user: updatedUser });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle user active status (admin only)
router.post('/:id/toggle-status', auth, requireAdmin, async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // Prevent changing own status
    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot change your own account status' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        updatedAt: true,
      }
    });

    const action = updatedUser.isActive ? 'activated' : 'deactivated';
    res.json({ message: `User ${action} successfully`, user: updatedUser });
  } catch (error: any) {
    console.error('Error toggling user status:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;