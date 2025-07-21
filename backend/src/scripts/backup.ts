import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import prisma from '../lib/prisma';

const BACKUP_PATH = process.env.BACKUP_PATH || '/mnt/x/ClaudeCode/Nishens-Timetracking-Tasks/task-tracker/backend/backups';
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30');

interface BackupResult {
  success: boolean;
  filename: string;
  filepath: string;
  size: number;
  checksum: string;
  timestamp: Date;
  error?: string;
}

export async function runBackup(): Promise<BackupResult> {
  try {
    // Ensure backup directory exists
    await fs.mkdir(BACKUP_PATH, { recursive: true });

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('-')[0].replace(/[.]/g, '');
    const sqlFilename = `timentracker-backup-${timestamp}.sql`;
    const filename = `timentracker-backup-${timestamp}.tar.gz`;
    const sqlPath = path.join(BACKUP_PATH, sqlFilename);
    const filepath = path.join(BACKUP_PATH, filename);

    console.log(`Starting backup: ${filename}`);

    // Check if pg_dump is available
    let dumpOutput: string;
    try {
      // Test if pg_dump is available
      execSync('which pg_dump', { encoding: 'utf8' });
      
      // Database connection details
      const dbUrl = process.env.DATABASE_URL!;
      const url = new URL(dbUrl);
      
      const pgDumpCommand = `pg_dump -h ${url.hostname} -p ${url.port || 5432} -U ${url.username} -d ${url.pathname.slice(1)} --no-password --clean --if-exists --verbose`;

      // Set PGPASSWORD environment variable for authentication
      const env = { ...process.env, PGPASSWORD: url.password };
      
      // Execute pg_dump
      dumpOutput = execSync(pgDumpCommand, { 
        env,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
    } catch (pgDumpError) {
      console.log('pg_dump not available, using Prisma-based backup...');
      
      // Fallback: Use Prisma to export data as SQL
      const users = await prisma.user.findMany();
      const clients = await prisma.client.findMany();
      const categories = await prisma.category.findMany();
      const tasks = await prisma.task.findMany();
      const timeLogs = await prisma.timeLog.findMany();
      const backups = await prisma.backup.findMany();

      // Generate SQL dump manually
      dumpOutput = `--
-- TimeNTracker Database Backup  
-- Generated: ${new Date().toISOString()}
-- 

BEGIN;

-- Clear existing data
DELETE FROM time_logs;
DELETE FROM tasks;
DELETE FROM clients;
DELETE FROM categories;
DELETE FROM backups;
DELETE FROM users;

-- Insert users
${users.map(user => `INSERT INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at) VALUES (${user.id}, '${user.email}', '${user.passwordHash}', '${user.name}', '${user.role}', ${user.isActive}, '${user.createdAt.toISOString()}', '${user.updatedAt.toISOString()}');`).join('\n')}

-- Insert clients
${clients.map(client => `INSERT INTO clients (id, name, description, created_at, updated_at) VALUES (${client.id}, '${client.name}', '${client.description || ''}', '${client.createdAt.toISOString()}', '${client.updatedAt.toISOString()}');`).join('\n')}

-- Insert categories
${categories.map(category => `INSERT INTO categories (id, name, color) VALUES (${category.id}, '${category.name}', '${category.color}');`).join('\n')}

-- Insert tasks
${tasks.map(task => `INSERT INTO tasks (id, title, description, halo_ticket_id, due_date, priority, status, user_id, client_id, category_id, created_at, updated_at) VALUES (${task.id}, '${task.title?.replace(/'/g, "''")}', '${task.description?.replace(/'/g, "''") || ''}', ${task.haloTicketId ? `'${task.haloTicketId}'` : 'NULL'}, ${task.dueDate ? `'${task.dueDate.toISOString()}'` : 'NULL'}, '${task.priority}', '${task.status}', ${task.userId}, ${task.clientId || 'NULL'}, ${task.categoryId || 'NULL'}, '${task.createdAt.toISOString()}', '${task.updatedAt.toISOString()}');`).join('\n')}

-- Insert time logs
${timeLogs.map(log => `INSERT INTO time_logs (id, task_id, user_id, start_time, end_time, description, created_at, updated_at) VALUES (${log.id}, ${log.taskId}, ${log.userId}, '${log.startTime.toISOString()}', ${log.endTime ? `'${log.endTime.toISOString()}'` : 'NULL'}, '${log.description?.replace(/'/g, "''") || ''}', '${log.createdAt.toISOString()}', '${log.updatedAt.toISOString()}');`).join('\n')}

COMMIT;

-- Backup completed successfully
`;
    }

    // Write SQL dump to file
    await fs.writeFile(sqlPath, dumpOutput);

    // Create compressed archive
    execSync(`tar -czf "${filepath}" -C "${BACKUP_PATH}" "${sqlFilename}"`, { encoding: 'utf8' });
    
    // Remove the uncompressed SQL file
    await fs.unlink(sqlPath);

    // Calculate file size and checksum
    const stats = await fs.stat(filepath);
    const fileBuffer = await fs.readFile(filepath);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    console.log(`Backup completed: ${filename} (${stats.size} bytes)`);

    // Record backup in database
    await prisma.backup.create({
      data: {
        filename,
        filepath,
        size: stats.size,
        checksum,
        verified: false,
      },
    });

    // Verify backup integrity
    const verified = await verifyBackup(filepath);
    if (verified) {
      await prisma.backup.update({
        where: { id: (await prisma.backup.findFirst({ where: { filename } }))?.id! },
        data: { verified: true },
      });
      console.log(`Backup verified successfully: ${filename}`);
    }

    // Clean up old backups
    await cleanupOldBackups();

    return {
      success: true,
      filename,
      filepath,
      size: stats.size,
      checksum,
      timestamp: new Date(),
    };

  } catch (error) {
    console.error('Backup failed:', error);
    return {
      success: false,
      filename: '',
      filepath: '',
      size: 0,
      checksum: '',
      timestamp: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function verifyBackup(backupPath: string): Promise<boolean> {
  try {
    // For .tar.gz files, extract and verify the SQL content
    if (backupPath.endsWith('.tar.gz')) {
      const tempDir = path.join(BACKUP_PATH, 'temp_verify');
      await fs.mkdir(tempDir, { recursive: true });
      
      try {
        // Extract the archive
        execSync(`tar -xzf "${backupPath}" -C "${tempDir}"`, { encoding: 'utf8' });
        
        // Find the SQL file
        const files = await fs.readdir(tempDir);
        const sqlFile = files.find(f => f.endsWith('.sql'));
        
        if (!sqlFile) {
          return false;
        }
        
        const sqlPath = path.join(tempDir, sqlFile);
        const data = await fs.readFile(sqlPath, 'utf8');
        
        // Check for PostgreSQL dump header
        const hasValidHeader = data.includes('PostgreSQL database dump') || data.includes('pg_dump');
        
        // Check for basic SQL structure
        const hasCreateStatements = data.includes('CREATE TABLE') || data.includes('CREATE SEQUENCE');
        const hasInsertStatements = data.includes('INSERT INTO') || data.includes('COPY');
        
        return hasValidHeader && (hasCreateStatements || hasInsertStatements);
      } finally {
        // Clean up temp directory
        execSync(`rm -rf "${tempDir}"`, { encoding: 'utf8' });
      }
    } else {
      // Handle legacy .sql files
      const data = await fs.readFile(backupPath, 'utf8');
      const hasValidHeader = data.includes('PostgreSQL database dump') || data.includes('pg_dump');
      const hasCreateStatements = data.includes('CREATE TABLE') || data.includes('CREATE SEQUENCE');
      const hasInsertStatements = data.includes('INSERT INTO') || data.includes('COPY');
      return hasValidHeader && (hasCreateStatements || hasInsertStatements);
    }
  } catch (error) {
    console.error('Backup verification failed:', error);
    return false;
  }
}

async function cleanupOldBackups(): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    // Get old backups from database
    const oldBackups = await prisma.backup.findMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    // Delete old backup files and database records
    for (const backup of oldBackups) {
      try {
        await fs.unlink(backup.filepath);
        await prisma.backup.delete({ where: { id: backup.id } });
        console.log(`Cleaned up old backup: ${backup.filename}`);
      } catch (error) {
        console.error(`Failed to cleanup backup ${backup.filename}:`, error);
      }
    }

    console.log(`Cleaned up ${oldBackups.length} old backups`);
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

export async function listBackups() {
  return await prisma.backup.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function restoreBackup(backupId: number): Promise<boolean> {
  try {
    const backup = await prisma.backup.findUnique({
      where: { id: backupId },
    });

    if (!backup) {
      throw new Error('Backup not found');
    }

    if (!backup.verified) {
      throw new Error('Backup not verified - restoration aborted');
    }

    // Database connection details
    const dbUrl = process.env.DATABASE_URL!;
    const url = new URL(dbUrl);
    
    let sqlPath = backup.filepath;
    let tempDir: string | null = null;
    
    // Handle compressed backups
    if (backup.filepath.endsWith('.tar.gz')) {
      tempDir = path.join(BACKUP_PATH, 'temp_restore');
      await fs.mkdir(tempDir, { recursive: true });
      
      // Extract the archive
      execSync(`tar -xzf "${backup.filepath}" -C "${tempDir}"`, { encoding: 'utf8' });
      
      // Find the SQL file
      const files = await fs.readdir(tempDir);
      const sqlFile = files.find(f => f.endsWith('.sql'));
      
      if (!sqlFile) {
        throw new Error('No SQL file found in backup archive');
      }
      
      sqlPath = path.join(tempDir, sqlFile);
    }

    const psqlCommand = `psql -h ${url.hostname} -p ${url.port || 5432} -U ${url.username} -d ${url.pathname.slice(1)} -f "${sqlPath}"`;

    // Set PGPASSWORD environment variable for authentication
    const env = { ...process.env, PGPASSWORD: url.password };

    console.log(`Restoring backup: ${backup.filename}`);
    
    try {
      // Execute psql
      execSync(psqlCommand, { 
        env,
        encoding: 'utf8',
        stdio: 'inherit'
      });

      console.log(`Backup restored successfully: ${backup.filename}`);
      return true;
    } finally {
      // Clean up temp directory if created
      if (tempDir) {
        execSync(`rm -rf "${tempDir}"`, { encoding: 'utf8' });
      }
    }

  } catch (error) {
    console.error('Restore failed:', error);
    return false;
  }
}

// CLI interface for manual backup operations
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'backup':
      runBackup().then(result => {
        console.log('Backup result:', result);
        process.exit(result.success ? 0 : 1);
      });
      break;

    case 'list':
      listBackups().then(backups => {
        console.log('Available backups:');
        backups.forEach(backup => {
          console.log(`${backup.id}: ${backup.filename} (${backup.size} bytes) - ${backup.verified ? 'Verified' : 'Unverified'}`);
        });
        process.exit(0);
      });
      break;

    case 'restore':
      const backupId = parseInt(process.argv[3]);
      if (!backupId) {
        console.error('Usage: npm run backup restore <backup_id>');
        process.exit(1);
      }
      restoreBackup(backupId).then(success => {
        process.exit(success ? 0 : 1);
      });
      break;

    default:
      console.log('Usage: npm run backup [backup|list|restore <id>]');
      process.exit(1);
  }
}