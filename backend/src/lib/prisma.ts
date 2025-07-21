import { PrismaClient } from '@prisma/client';

declare global {
  // Prevent multiple instances of Prisma in development
  var __globalPrisma__: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error']
  });
} else {
  // In development, store the Prisma instance globally to prevent multiple connections
  if (!globalThis.__globalPrisma__) {
    globalThis.__globalPrisma__ = new PrismaClient({
      log: ['error', 'warn']
    });
  }
  prisma = globalThis.__globalPrisma__;
}

// Handle graceful shutdowns
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;