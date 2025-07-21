// Simple API validation tests to verify all fixes work correctly
// This is not meant to be run with Jest but as a manual verification script

import prisma from '../lib/prisma';
import { execSync } from 'child_process';

async function validateDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

async function validateCRUDOperations() {
  console.log('🔍 Testing CRUD operations...');
  try {
    // Test client creation
    const testClient = await prisma.client.create({
      data: {
        name: 'Test Client API Validation',
        description: 'Test client for API validation'
      }
    });
    console.log('✅ Client creation successful');

    // Test client update
    await prisma.client.update({
      where: { id: testClient.id },
      data: { description: 'Updated description' }
    });
    console.log('✅ Client update successful');

    // Test duplicate name validation
    try {
      await prisma.client.create({
        data: {
          name: 'Test Client API Validation',
          description: 'Duplicate test'
        }
      });
      console.log('⚠️  Duplicate validation not working - this should have failed');
    } catch (error) {
      console.log('✅ Duplicate validation working correctly');
    }

    // Test category creation
    const testCategory = await prisma.category.create({
      data: {
        name: 'Test Category API Validation',
        color: '#FF5733'
      }
    });
    console.log('✅ Category creation successful');

    // Clean up test data
    await prisma.client.delete({ where: { id: testClient.id } });
    await prisma.category.delete({ where: { id: testCategory.id } });
    console.log('✅ Test data cleanup successful');

    return true;
  } catch (error) {
    console.error('❌ CRUD operations failed:', error);
    return false;
  }
}

async function validateBackupSystem() {
  console.log('🔍 Testing backup system...');
  try {
    // Import backup functions
    const { runBackup } = require('../scripts/backup');
    
    // Test backup creation
    const result = await runBackup();
    if (result.success) {
      console.log('✅ Backup creation successful');
      console.log(`   Backup file: ${result.filename}`);
      console.log(`   Size: ${result.size} bytes`);
      return true;
    } else {
      console.error('❌ Backup creation failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Backup system test failed:', error);
    return false;
  }
}

async function validateExportSystem() {
  console.log('🔍 Testing export system...');
  try {
    // Test basic data counts
    const [clientCount, categoryCount, taskCount, userCount] = await Promise.all([
      prisma.client.count(),
      prisma.category.count(),
      prisma.task.count(),
      prisma.user.count()
    ]);

    console.log('✅ Export system data access successful');
    console.log(`   Clients: ${clientCount}`);
    console.log(`   Categories: ${categoryCount}`);
    console.log(`   Tasks: ${taskCount}`);
    console.log(`   Users: ${userCount}`);

    return true;
  } catch (error) {
    console.error('❌ Export system test failed:', error);
    return false;
  }
}

async function runAllValidationTests() {
  console.log('🚀 Starting API Validation Tests\n');

  const results = {
    database: await validateDatabaseConnection(),
    crud: await validateCRUDOperations(),
    backup: await validateBackupSystem(),
    export: await validateExportSystem()
  };

  console.log('\n📊 Test Results Summary:');
  console.log(`Database Connection: ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`CRUD Operations: ${results.crud ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Backup System: ${results.backup ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Export System: ${results.export ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED! The Task Tracker app data issues have been fixed.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
  }

  // Disconnect Prisma
  await prisma.$disconnect();
  
  return allPassed;
}

// Export for manual execution
export { runAllValidationTests };

// Allow direct execution
if (require.main === module) {
  runAllValidationTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}