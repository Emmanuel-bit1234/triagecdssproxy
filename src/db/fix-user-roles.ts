import 'dotenv/config';
import { db } from './connection.js';
import { users } from './schema.js';
import { sql } from 'drizzle-orm';

async function fixUserRoles() {
  try {
    console.log('Updating all existing users to have role "Nurse"...');
    
    // Update all users where role is NULL or undefined to 'Nurse'
    await db.execute(
      sql`UPDATE users SET role = 'Nurse' WHERE role IS NULL OR role = 'undefined'`
    );
    
    console.log('✅ All existing users have been updated to role "Nurse"');
    
    // Also ensure all users have a role (in case some are still null)
    await db.execute(
      sql`UPDATE users SET role = 'Nurse' WHERE role IS NULL`
    );
    
    // Verify the update
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    }).from(users);
    
    console.log('\n📊 Current users and their roles:');
    allUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}): ${user.role || 'NULL'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating user roles:', error);
    process.exit(1);
  }
}

fixUserRoles();

