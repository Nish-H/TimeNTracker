import prisma from '../lib/prisma';

async function addOverlapConstraint() {
  try {
    console.log('Adding database constraint to prevent overlapping time entries...');
    
    // First, check if the btree_gist extension is available
    try {
      await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS btree_gist;`;
      console.log('✓ btree_gist extension enabled');
    } catch (error) {
      console.log('Note: btree_gist extension may already exist or require superuser privileges');
    }
    
    // Add the exclusion constraint to prevent overlapping time logs
    await prisma.$executeRaw`
      ALTER TABLE time_logs 
      ADD CONSTRAINT no_overlapping_time_logs 
      EXCLUDE USING GIST (
        user_id WITH =,
        tsrange(start_time, end_time, '[)') WITH &&
      ) WHERE (end_time IS NOT NULL);
    `;
    
    console.log('✓ Successfully added overlap prevention constraint');
    console.log('This constraint will prevent any overlapping time entries at the database level');
    
  } catch (error: any) {
    if (error.code === '42P07') {
      console.log('✓ Overlap constraint already exists');
    } else if (error.code === '3F000') {
      console.log('Warning: btree_gist extension not available. Using alternative approach...');
      
      // Alternative: Add a simple check constraint (less robust but better than nothing)
      try {
        await prisma.$executeRaw`
          ALTER TABLE time_logs 
          ADD CONSTRAINT check_time_order 
          CHECK (start_time < end_time);
        `;
        console.log('✓ Added basic time order validation');
      } catch (checkError: any) {
        if (checkError.code === '42P07') {
          console.log('✓ Time order constraint already exists');
        } else {
          console.log('Could not add time constraints:', checkError.message);
        }
      }
    } else {
      console.error('Error adding overlap constraint:', error.message);
      console.log('Manual overlap validation in application code will still work');
    }
  } finally {
    await prisma.$disconnect();
  }
}

addOverlapConstraint();