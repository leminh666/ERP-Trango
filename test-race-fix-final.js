// Comprehensive test for race condition fix
const http = require('http');

async function login() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({email: 'admin@demo.com', password: '123456'});
    const req = http.request({
      hostname: 'localhost', port: 4000, path: '/auth/login', method: 'POST',
      headers: {'Content-Type': 'application/json', 'Content-Length': data.length}
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({status: res.statusCode, body}));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function apiRequest(method, endpoint, token, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost', port: 4000, path: endpoint, method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      }
    };
    if (body) {
      const data = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(data);
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({status: res.statusCode, body}));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    } else {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({status: res.statusCode, body}));
      });
      req.on('error', reject);
      req.end();
    }
  });
}

async function runTests() {
  console.log('='.repeat(70));
  console.log('🧪 COMPREHENSIVE RACE CONDITION FIX TEST');
  console.log('='.repeat(70) + '\n');

  // 1. Login
  console.log('1️⃣  Login...');
  const loginResult = await login();
  if (loginResult.status !== 200) {
    console.log('   ❌ Login failed!');
    return;
  }
  const {accessToken} = JSON.parse(loginResult.body);
  console.log('   ✅ Login OK\n');

  // 2. Get current wallets
  console.log('2️⃣  Get current wallets...');
  const wallets = await apiRequest('GET', '/wallets', accessToken);
  const walletList = JSON.parse(wallets.body);
  const wWallets = walletList.filter(w => w.code.startsWith('W'));
  console.log(`   Total wallets: ${walletList.length}`);
  console.log(`   W-prefixed wallets: ${wWallets.length}`);
  wWallets.forEach(w => console.log(`     - ${w.code}: ${w.name}`));
  console.log('');

  // 3. Create NEW wallet
  const timestamp1 = Date.now();
  console.log(`3️⃣  Create NEW wallet (${timestamp1})...`);
  const newWallet = {
    name: `Ví Test ${timestamp1}`,
    type: 'CASH',
    iconType: 'ICON',
    iconKey: 'wallet',
    openingBalance: 100000
  };
  const createResult = await apiRequest('POST', '/wallets', accessToken, newWallet);
  console.log(`   Status: ${createResult.status}`);
  if (createResult.status === 201) {
    const wallet = JSON.parse(createResult.body);
    console.log(`   ✅ Created: ${wallet.code} - ${wallet.name}`);
  } else {
    const err = JSON.parse(createResult.body);
    console.log(`   ❌ Failed: ${err.message}`);
  }
  console.log('');

  // 4. Test validation error (400)
  console.log('4️⃣  Test validation error (missing name - 400 expected)...');
  const invalidWallet = {
    type: 'CASH',
    iconType: 'ICON',
    iconKey: 'wallet'
    // missing name
  };
  const validateResult = await apiRequest('POST', '/wallets', accessToken, invalidWallet);
  console.log(`   Status: ${validateResult.status}`);
  if (validateResult.status === 400) {
    const err = JSON.parse(validateResult.body);
    console.log(`   ✅ Returns 400: ${err.message}`);
  } else {
    console.log(`   ❌ Expected 400, got ${validateResult.status}`);
  }
  console.log('');

  // 5. Concurrent creation test (simulate race condition)
  console.log('5️⃣  CONCURRENT creation test (5 requests same time)...');
  const concurrentCount = 5;
  const baseTime = Date.now();
  const concurrentPromises = [];
  for (let i = 0; i < concurrentCount; i++) {
    concurrentPromises.push(
      apiRequest('POST', '/wallets', accessToken, {
        name: `Ví Concurrent ${baseTime} - ${i}`,
        type: 'CASH',
        iconType: 'ICON',
        iconKey: 'wallet',
        openingBalance: 1000
      })
    );
  }
  const results = await Promise.all(concurrentPromises);
  const successCount = results.filter(r => r.status === 201).length;
  const conflictCount = results.filter(r => r.status === 409).length;
  console.log(`   Total requests: ${concurrentCount}`);
  console.log(`   Success (201): ${successCount}`);
  console.log(`   Conflict (409): ${conflictCount}`);
  if (successCount > 0 && successCount + conflictCount === concurrentCount) {
    console.log('   ✅ Race condition handled correctly (some success, some conflicts)');
  } else if (successCount === concurrentCount) {
    console.log('   ✅ ALL created successfully (retry logic working!)');
  } else {
    console.log('   ❌ Some requests failed unexpectedly');
  }
  console.log('');

  // 6. Final wallet count
  console.log('6️⃣  Final wallet count...');
  const finalWallets = await apiRequest('GET', '/wallets', accessToken);
  const finalList = JSON.parse(finalWallets.body);
  const finalWWallets = finalList.filter(w => w.code.startsWith('W'));
  console.log(`   Total: ${finalList.length}`);
  console.log(`   W-prefixed: ${finalWWallets.length}`);
  console.log('');

  console.log('='.repeat(70));
  console.log('✅ TEST COMPLETED');
  console.log('='.repeat(70));
}

runTests().catch(console.error);

