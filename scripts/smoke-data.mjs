/**
 * Smoke Data Script - Test API endpoints for data availability
 * Run: node scripts/smoke-data.mjs
 */

import http from 'http';

const API_URL = 'http://localhost:4000';
const WEB_URL = 'http://localhost:3000';

const results = {
  timestamp: new Date().toISOString(),
  tests: [],
};

function httpRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data, isHtml: data.startsWith('<') });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testEndpoint(name, path, token = null, queryParams = {}) {
  const url = new URL(path, API_URL);
  Object.entries(queryParams).forEach(([k, v]) => url.searchParams.append(k, v));
  
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };

  try {
    const res = await httpRequest(options);
    const count = Array.isArray(res.data) ? res.data.length : 
                  res.data?.items?.length || 
                  res.data?.data?.length || 
                  res.data?.length || 0;
    
    const sample = Array.isArray(res.data) ? res.data[0] :
                   res.data?.items?.[0] || 
                   res.data?.data?.[0] || 
                   null;

    const passed = res.status >= 200 && res.status < 400 && count > 0;
    
    results.tests.push({
      name,
      path,
      status: res.status,
      count,
      sample: sample ? { id: sample.id, ...sample } : null,
      passed,
    });

    if (passed) {
      console.log(`✅ ${name}: ${count} items (status ${res.status})`);
      if (sample) {
        console.log(`   Sample: ${JSON.stringify(sample).substring(0, 100)}...`);
      }
    } else if (count === 0) {
      console.log(`❌ ${name}: RỖNG (status ${res.status}) - CẦN KIỂM TRA FILTER/SEED`);
    } else {
      console.log(`⚠️  ${name}: LỖI - status ${res.status}`);
    }
    
    return { passed, count, data: res.data };
  } catch (err) {
    results.tests.push({ name, path, error: err.message, passed: false });
    console.log(`❌ ${name}: LỖI - ${err.message}`);
    return { passed: false, count: 0, error: err.message };
  }
}

async function testProxyEndpoint(name, path, token = null) {
  const url = new URL(path, WEB_URL);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };

  try {
    const res = await httpRequest(options);
    const count = Array.isArray(res.data) ? res.data.length : 
                  res.data?.items?.length || 
                  res.data?.data?.length || 0;
    
    const passed = res.status >= 200 && res.status < 400 && count > 0;
    
    results.tests.push({
      name: `PROXY ${name}`,
      path,
      status: res.status,
      count,
      passed,
    });

    if (passed) {
      console.log(`✅ PROXY ${name}: ${count} items`);
    } else if (count === 0) {
      console.log(`❌ PROXY ${name}: RỖNG`);
    } else {
      console.log(`⚠️  PROXY ${name}: status ${res.status}`);
    }
    
    return { passed, count };
  } catch (err) {
    console.log(`❌ PROXY ${name}: LỖI - ${err.message}`);
    return { passed: false, count: 0 };
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║              SMOKE DATA - Test API Endpoints                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  let token = null;

  // Test login
  console.log('🔐 Testing login...');
  const loginRes = await testEndpoint('Login', '/auth/login', null, {
    email: 'admin@demo.com',
    password: '123456',
  });
  
  if (loginRes.passed && loginRes.data?.access_token) {
    token = loginRes.data.access_token;
    console.log(`   Token: ${token.substring(0, 20)}...\n`);
  } else {
    console.log('   ⚠️ Login failed - using without auth\n');
  }

  // Test main endpoints
  console.log('📊 Testing main endpoints...\n');

  // Products
  await testEndpoint('Products (direct)', '/products', token);
  await testProxyEndpoint('Products (proxy)', '/api/products', token);
  console.log('');

  // Workshop Jobs
  await testEndpoint('Workshop Jobs (direct)', '/workshop-jobs', token, { includeDeleted: 'false' });
  await testProxyEndpoint('Workshop Jobs (proxy)', '/api/workshop-jobs', token);
  console.log('');

  // Transactions - Income
  await testEndpoint('Transactions Income (direct)', '/transactions', token, { type: 'INCOME' });
  await testProxyEndpoint('Transactions Income (proxy)', '/api/transactions?type=INCOME', token);
  console.log('');

  // Transactions - Expense
  await testEndpoint('Transactions Expense (direct)', '/transactions', token, { type: 'EXPENSE' });
  await testProxyEndpoint('Transactions Expense (proxy)', '/api/transactions?type=EXPENSE', token);
  console.log('');

  // Projects (for order dropdown)
  await testEndpoint('Projects (direct)', '/projects', token);
  await testProxyEndpoint('Projects (proxy)', '/api/projects', token);
  console.log('');

  // Projects Summary (used in some places)
  await testEndpoint('Projects Summary (direct)', '/projects/summary', token);
  await testProxyEndpoint('Projects Summary (proxy)', '/api/projects/summary', token);
  console.log('');

  // Wallets
  await testEndpoint('Wallets (direct)', '/wallets', token);
  await testProxyEndpoint('Wallets (proxy)', '/api/wallets', token);
  console.log('');

  // Income Categories
  await testEndpoint('Income Categories (direct)', '/income-categories', token);
  console.log('');

  // Expense Categories
  await testEndpoint('Expense Categories (direct)', '/expense-categories', token);
  console.log('');

  // Summary
  console.log('═'.repeat(70));
  console.log('📊 SMOKE DATA RESULTS');
  console.log('═'.repeat(70));

  const passed = results.tests.filter(t => t.passed).length;
  const failed = results.tests.filter(t => !t.passed && !t.name.includes('Login')).length;

  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  // Write report
  const fs = await import('fs');
  fs.writeFileSync('scripts/smoke-data.report.json', JSON.stringify(results, null, 2));
  console.log(`\n💾 Report saved: scripts/smoke-data.report.json`);

  console.log('\n' + '═'.repeat(70));
  if (failed === 0) {
    console.log('✅ ALL ENDPOINTS HAVE DATA!');
  } else {
    console.log(`⚠️  ${failed} ENDPOINTS NEED ATTENTION`);
    console.log('\n💡 Fix recommendations:');
    console.log('   - If count=0: Check seed data or date filters');
    console.log('   - If status!=200: Check API is running and auth token');
    console.log('   - If status=401: Login failed or token expired');
  }
  console.log('═'.repeat(70));
}

main().catch(err => {
  console.error('Smoke data test failed:', err);
  process.exit(2);
});

