import 'dotenv/config';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let adminToken = '';
let nurseToken = '';
let adminUserId = 0;
let nurseUserId = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    console.log(`\n${colors.blue}Testing: ${name}${colors.reset}`);
    await fn();
    console.log(`${colors.green}✅ ${name} - PASSED${colors.reset}`);
  } catch (error: any) {
    console.error(`${colors.red}❌ ${name} - FAILED${colors.reset}`);
    console.error(`   Error: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Body: ${JSON.stringify(error.response.body, null, 2)}`);
    }
  }
}

async function request(method: string, endpoint: string, body?: any, token?: string) {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    const error: any = new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    error.response = { status: response.status, body: data };
    throw error;
  }

  return data;
}

async function runTests() {
  console.log(`${colors.blue}=== User Management API Tests ===${colors.reset}\n`);

  // Test 1: Register Admin User
  await test('Register Admin User', async () => {
    const response = await request('POST', '/auth/register', {
      email: `admin-test-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Test Admin',
      role: 'Admin',
    });

    if (!response.user || response.user.role !== 'Admin') {
      throw new Error('Admin user not created with correct role');
    }
    if (!response.token) {
      throw new Error('Token not returned');
    }

    adminToken = response.token;
    adminUserId = response.user.id;
    console.log(`   Admin ID: ${adminUserId}, Token: ${adminToken.substring(0, 20)}...`);
  });

  // Test 2: Register Nurse User (without role - should default to Nurse)
  await test('Register Nurse User (default role)', async () => {
    const response = await request('POST', '/auth/register', {
      email: `nurse-test-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Test Nurse',
    });

    if (!response.user || response.user.role !== 'Nurse') {
      throw new Error('User should default to Nurse role');
    }
    if (!response.token) {
      throw new Error('Token not returned');
    }

    nurseToken = response.token;
    nurseUserId = response.user.id;
    console.log(`   Nurse ID: ${nurseUserId}, Token: ${nurseToken.substring(0, 20)}...`);
  });

  // Test 3: Register Doctor User
  await test('Register Doctor User', async () => {
    const response = await request('POST', '/auth/register', {
      email: `doctor-test-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Test Doctor',
      role: 'Doctor',
    });

    if (!response.user || response.user.role !== 'Doctor') {
      throw new Error('Doctor user not created with correct role');
    }
  });

  // Test 4: Get All Users
  await test('Get All Users', async () => {
    const response = await request('GET', '/users', undefined, adminToken);

    if (!response.users || !Array.isArray(response.users)) {
      throw new Error('Users array not returned');
    }
    if (typeof response.total !== 'number') {
      throw new Error('Total count not returned');
    }

    console.log(`   Found ${response.total} users`);
  });

  // Test 5: Get User by ID
  await test('Get User by ID', async () => {
    const response = await request('GET', `/users/${adminUserId}`, undefined, adminToken);

    if (!response.user || response.user.id !== adminUserId) {
      throw new Error('Wrong user returned');
    }
    if (response.user.role !== 'Admin') {
      throw new Error('User role incorrect');
    }
  });

  // Test 6: Update User Profile (own profile)
  await test('Update Own Profile', async () => {
    const newName = 'Updated Test Nurse';
    const response = await request(
      'PUT',
      `/users/${nurseUserId}`,
      { name: newName },
      nurseToken
    );

    if (response.user.name !== newName) {
      throw new Error('Name not updated');
    }
    console.log(`   Updated name to: ${newName}`);
  });

  // Test 7: Update User Role (Admin only)
  await test('Update User Role (Admin)', async () => {
    const response = await request(
      'PUT',
      `/users/${nurseUserId}/role`,
      { role: 'Doctor' },
      adminToken
    );

    if (response.user.role !== 'Doctor') {
      throw new Error('Role not updated');
    }
    console.log(`   Updated role to: Doctor`);
  });

  // Test 8: Search Users
  await test('Search Users', async () => {
    const response = await request('GET', '/users/search?query=Test', undefined, adminToken);

    if (!response.users || !Array.isArray(response.users)) {
      throw new Error('Users array not returned');
    }
    console.log(`   Found ${response.total} users matching "Test"`);
  });

  // Test 9: Filter Users by Role
  await test('Filter Users by Role', async () => {
    const response = await request('GET', '/users?role=Admin', undefined, adminToken);

    if (!response.users || !Array.isArray(response.users)) {
      throw new Error('Users array not returned');
    }
    const allAdmins = response.users.every((u: any) => u.role === 'Admin');
    if (!allAdmins) {
      throw new Error('Not all users are Admins');
    }
    console.log(`   Found ${response.total} Admin users`);
  });

  // Test 10: Non-admin cannot update role
  await test('Non-admin Cannot Update Role', async () => {
    try {
      await request(
        'PUT',
        `/users/${adminUserId}/role`,
        { role: 'Nurse' },
        nurseToken
      );
      throw new Error('Should have failed with 403');
    } catch (error: any) {
      if (error.response?.status !== 403) {
        throw new Error(`Expected 403, got ${error.response?.status}`);
      }
      console.log(`   Correctly rejected with 403 Forbidden`);
    }
  });

  // Test 11: Non-admin cannot delete user
  await test('Non-admin Cannot Delete User', async () => {
    try {
      await request('DELETE', `/users/${adminUserId}`, undefined, nurseToken);
      throw new Error('Should have failed with 403');
    } catch (error: any) {
      if (error.response?.status !== 403) {
        throw new Error(`Expected 403, got ${error.response?.status}`);
      }
      console.log(`   Correctly rejected with 403 Forbidden`);
    }
  });

  // Test 12: Invalid role validation
  await test('Invalid Role Validation', async () => {
    try {
      await request('POST', '/auth/register', {
        email: `invalid-role-${Date.now()}@test.com`,
        password: 'password123',
        name: 'Invalid Role',
        role: 'InvalidRole',
      });
      throw new Error('Should have failed with 400');
    } catch (error: any) {
      if (error.response?.status !== 400) {
        throw new Error(`Expected 400, got ${error.response?.status}`);
      }
      console.log(`   Correctly rejected invalid role`);
    }
  });

  // Test 13: Email uniqueness validation
  await test('Email Uniqueness Validation', async () => {
    const email = `duplicate-${Date.now()}@test.com`;
    
    // Register first user
    await request('POST', '/auth/register', {
      email,
      password: 'password123',
      name: 'First User',
    });

    // Try to register again with same email
    try {
      await request('POST', '/auth/register', {
        email,
        password: 'password123',
        name: 'Second User',
      });
      throw new Error('Should have failed with 409');
    } catch (error: any) {
      if (error.response?.status !== 409) {
        throw new Error(`Expected 409, got ${error.response?.status}`);
      }
      console.log(`   Correctly rejected duplicate email`);
    }
  });

  // Test 14: Get users with pagination
  await test('Get Users with Pagination', async () => {
    const response = await request('GET', '/users?limit=5&offset=0', undefined, adminToken);

    if (!response.users || response.users.length > 5) {
      throw new Error('Pagination not working');
    }
    if (typeof response.limit !== 'number' || typeof response.offset !== 'number') {
      throw new Error('Pagination metadata missing');
    }
    console.log(`   Pagination working: limit=${response.limit}, offset=${response.offset}`);
  });

  console.log(`\n${colors.green}=== All Tests Completed ===${colors.reset}\n`);
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});

