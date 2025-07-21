import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@tasktracker.com' },
    update: {},
    create: {
      email: 'admin@tasktracker.com',
      passwordHash: hashedPassword,
      name: 'Nishen',
      role: 'ADMIN',
    },
  });

  // Create default categories
  const categories = [
    { name: 'Admin', color: '#EF4444' },
    { name: 'Automation', color: '#10B981' },
    { name: 'L4 Escalations', color: '#F59E0B' },
    { name: 'Project Work', color: '#3B82F6' },
    { name: 'Client Support', color: '#8B5CF6' },
    { name: 'Maintenance', color: '#6B7280' },
  ];

  for (const category of categories) {
    const existing = await prisma.category.findFirst({
      where: { name: category.name }
    });
    
    if (!existing) {
      await prisma.category.create({
        data: category
      });
    }
  }

  // Create default clients
  const clients = [
    { name: 'Internal', description: 'Internal company tasks' },
    { name: 'Client A', description: 'Primary client A support' },
    { name: 'Client B', description: 'Primary client B support' },
  ];

  for (const client of clients) {
    const existing = await prisma.client.findFirst({
      where: { name: client.name }
    });
    
    if (!existing) {
      await prisma.client.create({
        data: client
      });
    }
  }

  console.log('Database seeded successfully!');
  console.log('Default admin user: admin@tasktracker.com / admin123');
  console.log('User role: ADMIN');
  console.log('User can create new team members via registration.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });