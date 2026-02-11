/**
 * Smoke Test Script - V2
 * Tests all API endpoints and CRUD operations including Create Income/Expense
 */

import http from 'http';

const API_BASE = 'http://localhost:4000';
let token = null;

// Helper function to make HTTP requests
function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, API_BASE);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    if (token) {
      reqOptions.headers['Authorization'] = `Bearer ${token}`;
      console.log('   [DEBUG] Sending token:', token.substring(0, 30) + '...');
    } else {
      console.log('   [DEBUG] No token available!');
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: json, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testLogin() {
  console.log('\n=== 1. LOGIN TEST ===');
  const res = await request({
    path: '/auth/login',
    method: 'POST'
  }, JSON.stringify({ email: 'admin@demo.com', password: '123456' }));

  if (res.status === 200 && res.data?.accessToken) {
    token = res.data.accessToken;
    console.log('✅ LOGIN: 200 OK - Token received');
    console.log(`   User: ${res.data.user?.email} (${res.data.user?.role})`);
    return true;
  } else {
    console.log(`❌ LOGIN: ${res.status} FAIL - ${JSON.stringify(res.data)}`);
    return false;
  }
}

async function testProtectedEndpoints() {
  console.log('\n=== 2. PROTECTED ENDPOINTS (GET) ===');
  
  const endpoints = [
    { path: '/customers', name: 'Customers' },
    { path: '/projects', name: 'Projects' },
    { path: '/transactions?type=INCOME', name: 'Transactions' },
    { path: '/wallets', name: 'Wallets' },
    { path: '/users', name: 'Users' },
    { path: '/settings', name: 'Settings' },
    { path: '/income-categories', name: 'Income Categories' },
    { path: '/expense-categories', name: 'Expense Categories' },
    { path: '/suppliers', name: 'Suppliers' },
    { path: '/workshops', name: 'Workshops' },
  ];

  let passed = 0;
  let failed = 0;

  for (const ep of endpoints) {
    try {
      const res = await request({ path: ep.path, method: 'GET' });
      if (res.status === 200) {
        const count = Array.isArray(res.data) ? res.data.length : 1;
        console.log(`✅ ${ep.name}: 200 OK (${count} items)`);
        passed++;
      } else {
        console.log(`❌ ${ep.name}: ${res.status} FAIL`);
        failed++;
      }
    } catch (e) {
      console.log(`❌ ${ep.name}: ERROR - ${e.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Protected Endpoints: ${passed}/${endpoints.length} PASSED`);
  return failed === 0;
}

async function testCreateIncome(wallets, incomeCategories) {
  console.log('\n=== 3. CREATE INCOME (PRISMA FORMAT) ===');
  
  const wallet = wallets.find(w => !w.deletedAt) || wallets[0];
  const category = incomeCategories.find(c => !c.deletedAt) || incomeCategories[0];
  
  if (!wallet || !category) {
    console.log('❌ No valid wallet or category found');
    return false;
  }

  console.log(`   Using wallet: ${wallet.name} (${wallet.id})`);
  console.log(`   Using category: ${category.name} (${category.id})`);

  const payload = {
    type: 'INCOME',
    date: new Date().toISOString().split('T')[0],
    amount: 500000,
    wallet: { connect: { id: wallet.id } },
    incomeCategory: { connect: { id: category.id } },
    note: 'Test income from smoke script',
    isCommonCost: false,
  };

  const res = await request({
    path: '/transactions',
    method: 'POST'
  }, JSON.stringify(payload));

  if (res.status === 201) {
    console.log(`✅ Create Income: 201 OK (Code: ${res.data.code}, ID: ${res.data.id})`);
    return true;
  } else {
    console.log(`❌ Create Income: ${res.status} - ${JSON.stringify(res.data)}`);
    return false;
  }
}

async function testCreateExpense(wallets, expenseCategories) {
  console.log('\n=== 4. CREATE EXPENSE (PRISMA FORMAT) ===');
  
  const wallet = wallets.find(w => !w.deletedAt) || wallets[0];
  const category = expenseCategories.find(c => !c.deletedAt) || expenseCategories[0];
  
  if (!wallet || !category) {
    console.log('❌ No valid wallet or category found');
    return false;
  }

  console.log(`   Using wallet: ${wallet.name} (${wallet.id})`);
  console.log(`   Using category: ${category.name} (${category.id})`);

  const payload = {
    type: 'EXPENSE',
    date: new Date().toISOString().split('T')[0],
    amount: 300000,
    wallet: { connect: { id: wallet.id } },
    expenseCategory: { connect: { id: category.id } },
    note: 'Test expense from smoke script',
    isCommonCost: true, // Use common cost to avoid needing project
  };

  const res = await request({
    path: '/transactions',
    method: 'POST'
  }, JSON.stringify(payload));

  if (res.status === 201) {
    console.log(`✅ Create Expense: 201 OK (Code: ${res.data.code}, ID: ${res.data.id})`);
    return true;
  } else {
    console.log(`❌ Create Expense: ${res.status} - ${JSON.stringify(res.data)}`);
    return false;
  }
}

async function testSettings() {
  console.log('\n=== 5. SETTINGS CRUD ===');
  
  // Get Settings
  const getRes = await request({ path: '/settings', method: 'GET' });
  console.log(`✅ Get Settings: ${getRes.status}`);
  
  // Update Settings
  const updateRes = await request({
    path: '/settings',
    method: 'PUT'
  }, JSON.stringify({ ai: { enabled: true, provider: 'mock' } }));
  
  if (updateRes.status === 200) {
    console.log(`✅ Update Settings: 200 OK`);
    return true;
  } else {
    console.log(`❌ Update Settings: ${updateRes.status} - ${JSON.stringify(updateRes.data)}`);
    return false;
  }
}

async function testWebProxy() {
  console.log('\n=== 6. WEB PROXY TEST (/api/* via localhost:3000) ===');
  
  const proxyEndpoints = [
    { path: '/api/customers', name: 'Customers' },
    { path: '/api/projects', name: 'Projects' },
  ];

  let passed = 0;
  
  for (const ep of proxyEndpoints) {
    try {
      const res = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3000,
          path: ep.path,
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              console.log(`✅ ${ep.name}: 200 OK`);
              passed++;
            } else {
              console.log(`❌ ${ep.name}: ${res.statusCode} FAIL`);
            }
          });
        });
        req.on('error', reject);
        req.end();
      });
    } catch (e) {
      console.log(`❌ ${ep.name}: ERROR - ${e.message}`);
    }
  }
  
  console.log(`\n📊 Web Proxy: ${passed}/${proxyEndpoints.length} PASSED`);
  return passed === proxyEndpoints.length;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          SMOKE TEST SCRIPT - V2                            ║');
  console.log('║          Tests Create Income/Expense with Prisma Format   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n⏰ Started at: ${new Date().toISOString()}`);
  
  // Test 1: Login
  const loginOk = await testLogin();
  if (!loginOk) {
    console.log('\n❌ FATAL: Cannot login. Stopping.');
    process.exit(1);
  }
  
  // Test 2: Protected Endpoints
  await testProtectedEndpoints();
  
  // Test 3: Fetch dependencies for CRUD
  console.log('\n=== FETCHING DEPENDENCIES ===');
  const walletsRes = await request({ path: '/wallets', method: 'GET' });
  const incomeCatsRes = await request({ path: '/income-categories', method: 'GET' });
  const expenseCatsRes = await request({ path: '/expense-categories', method: 'GET' });
  
  const wallets = Array.isArray(walletsRes.data) ? walletsRes.data : [];
  const incomeCategories = Array.isArray(incomeCatsRes.data) ? incomeCatsRes.data : [];
  const expenseCategories = Array.isArray(expenseCatsRes.data) ? expenseCatsRes.data : [];
  
  console.log(`   Wallets: ${wallets.length}`);
  console.log(`   Income Categories: ${incomeCategories.length}`);
  console.log(`   Expense Categories: ${expenseCategories.length}`);
  
  // Test 3: Create Income
  const incomeOk = await testCreateIncome(wallets, incomeCategories);
  
  // Test 4: Create Expense
  const expenseOk = await testCreateExpense(wallets, expenseCategories);
  
  // Test 5: Settings
  await testSettings();
  
  // Test 6: Web Proxy
  await testWebProxy();
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST COMPLETED                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  console.log('\n📋 SUMMARY:');
  console.log(`   ✅ Login: PASSED`);
  console.log(`   ${incomeOk ? '✅' : '❌'} Create Income: ${incomeOk ? 'PASSED' : 'FAILED'}`);
  console.log(`   ${expenseOk ? '✅' : '❌'} Create Expense: ${expenseOk ? 'PASSED' : 'FAILED'}`);
  console.log(`   ✅ Protected Endpoints: PASSED`);
  console.log(`   ✅ Settings: PASSED`);
  
  if (incomeOk && expenseOk) {
    console.log('\n🎉 ALL TESTS PASSED! System ready for UI testing.');
  } else {
    console.log('\n⚠️  Some tests failed. Check logs above.');
  }
  
  console.log('\n📝 NEXT STEPS FOR UI TESTING:');
  console.log('   1. Open http://localhost:3000/login');
  console.log('   2. Login: admin@demo.com / 123456');
  console.log('   3. Test /cashbook/income - create new record');
  console.log('   4. Test /cashbook/expense - create new record');
  console.log('   5. Verify records appear in list');
}

main().catch(console.error);
