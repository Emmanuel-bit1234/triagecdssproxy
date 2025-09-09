import { testConnection } from './db/test-connection.js';

async function testAuth() {
  console.log('Testing database connection...');
  const dbConnected = await testConnection();
  
  if (dbConnected) {
    console.log('✅ Database connection successful');
    console.log('✅ Authentication system is ready!');
    console.log('\nAvailable endpoints:');
    console.log('POST /auth/register - Register new user');
    console.log('POST /auth/login - Login user');
    console.log('GET /auth/me - Get current user (requires auth)');
    console.log('POST /auth/logout - Logout user');
    console.log('POST /predict - Protected prediction endpoint (requires auth)');
    console.log('\nTo test:');
    console.log('1. Set DATABASE_URL in your .env file');
    console.log('2. Run: pnpm db:generate && pnpm db:migrate');
    console.log('3. Start server: pnpm dev');
  } else {
    console.log('❌ Database connection failed');
    console.log('Please check your DATABASE_URL in .env file');
  }
}

testAuth().catch(console.error);
