#!/usr/bin/env node
/**
 * Smoke Test Script
 * Tests core API endpoints to verify FE-BE communication
 * 
 * Usage: node tools/smoke-test.mjs
 */

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@demo.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';

let token = null;

async function request(method, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    method,
    headers,
    ...options,
  });

  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else {
    data = await response.text().catch(() => null);
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    url: response.url,
  };
}

async function login() {
  console.log('\n🔐 Attempting login...');
  const res = await request('POST', '/auth/login', {
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  if (!res.ok || !res.data?.accessToken) {
    console.error('❌ Login failed:', res.data?.message || 'Unknown error');
    console.log('   Make sure backend is running and credentials are correct');
    return false;
  }

  token = res.data.accessToken;
  console.log('✅ Login successful, token acquired');
  return true;
}

async function testEndpoint(method, path, description) {
  const start = Date.now();
  const res = await request(method, path);
  const duration = Date.now() - start;

  const statusIcon = res.ok ? '✅' : res.status === 401 ? '🔒' : '❌';
  const statusText = res.ok ? 'OK' : `${res.status} ${res.statusText}`;

  console.log(`${statusIcon} ${method.padEnd(6)} ${path.padEnd(35)} ${statusText.padEnd(15)} (${duration}ms)`);

  if (!res.ok) {
    console.log(`      Error: ${JSON.stringify(res.data || res.data).substring(0, 100)}`);
    if (res.status === 401) {
      console.log('      → Token may be invalid or expired');
    }
  }

  return res.ok;
}

async function runSmokeTests() {
  console.log('='.repeat(70));
  console.log('🧪 SMOKE TEST - API Communication Verification');
  console.log('='.repeat(70));
  console.log(`🌐 API URL: ${BASE_URL}`);
  console.log(`📅 Run at: ${new Date().toISOString()}`);
  console.log('');

  let allPassed = true;

  // Test 1: Health check (no auth)
  console.log('\n📋 Public Endpoints:');
  allPassed = await testEndpoint('GET', '/health', 'Health check') && allPassed;

  // Test 2: Login
  if (!(await login())) {
    console.log('\n⚠️  Skipping authenticated tests due to login failure');
    process.exit(1);
  }

  // Test 3: Auth profile (requires auth)
  allPassed = await testEndpoint('GET', '/auth/profile', 'Get profile') && allPassed;

  // Test 4: Settings
  allPassed = await testEndpoint('GET', '/settings', 'Get settings') && allPassed;

  // Test 5: Users
  allPassed = await testEndpoint('GET', '/users', 'List users') && allPassed;

  // Test 6: Customers
  allPassed = await testEndpoint('GET', '/customers', 'List customers') && allPassed;

  // Test 7: Products
  allPassed = await testEndpoint('GET', '/products', 'List products') && allPassed;

  // Test 8: Wallets
  allPassed = await testEndpoint('GET', '/wallets', 'List wallets') && allPassed;

  // Test 9: Income categories
  allPassed = await testEndpoint('GET', '/income-categories', 'List income categories') && allPassed;

  // Test 10: Expense categories
  allPassed = await testEndpoint('GET', '/expense-categories', 'List expense categories') && allPassed;

  // Test 11: Transfers
  allPassed = await testEndpoint('GET', '/transfers', 'List transfers') && allPassed;

  // Test 12: Adjustments
  allPassed = await testEndpoint('GET', '/adjustments', 'List adjustments') && allPassed;

  // Test 13: Cashflow
  allPassed = await testEndpoint('GET', '/cashflow', 'Get cashflow report') && allPassed;

  // Test 14: Projects (orders)
  allPassed = await testEndpoint('GET', '/projects', 'List projects') && allPassed;

  // Test 15: Workshops
  allPassed = await testEndpoint('GET', '/workshops', 'List workshops') && allPassed;

  // Test 16: Workshop jobs
  allPassed = await testEndpoint('GET', '/workshop-jobs', 'List workshop jobs') && allPassed;

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  console.log('='.repeat(70));

  if (!allPassed) {
    console.log('\n📝 Troubleshooting tips:');
    console.log('  1. Check backend is running: cd apps/api && npm run start:dev');
    console.log('  2. Check database is accessible');
    console.log('  3. Verify JWT_SECRET in apps/api/.env');
    console.log('  4. Check CORS settings in apps/api/src/main.ts');
    console.log('');
  }

  process.exit(allPassed ? 0 : 1);
}

runSmokeTests().catch(err => {
  console.error('💥 Fatal error:', err.message);
  process.exit(1);
});
