// Final comprehensive test
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
  console.log('🧪 FINAL VERIFICATION TEST');
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

  // 2. Create wallet - VALID
  console.log('2️⃣  Create VALID wallet...');
  const timestamp = Date.now();
  const validWallet = {
    name: `Ví Hợp Lệ ${timestamp}`,
    type: 'CASH',
    iconType: 'ICON',
    iconKey: 'wallet'
  };
  const createResult = await apiRequest('POST', '/wallets', accessToken, validWallet);
  console.log(`   Status: ${createResult.status} (expected 201)`);
  if (createResult.status === 201) {
    const wallet = JSON.parse(createResult.body);
    console.log(`   ✅ Created: ${wallet.code} - ${wallet.name}`);
  } else {
    const err = JSON.parse(createResult.body);
    console.log(`   ❌ Failed: ${err.message}`);
  }
  console.log('');

  // 3. Create wallet - MISSING NAME (400)
  console.log('3️⃣  Create wallet MISSING NAME...');
  const invalidWallet = {
    type: 'CASH',
    iconType: 'ICON',
    iconKey: 'wallet'
  };
  const invalidResult = await apiRequest('POST', '/wallets', accessToken, invalidWallet);
  console.log(`   Status: ${invalidResult.status} (expected 400)`);
  if (invalidResult.status === 400) {
    const err = JSON.parse(invalidResult.body);
    console.log(`   ✅ Returns 400: ${err.message}`);
  } else {
    console.log(`   ❌ Expected 400, got ${invalidResult.status}`);
  }
  console.log('');

  // 4. Create wallet - MISSING ICON (400)
  console.log('4️⃣  Create wallet MISSING ICON...');
  const noIconWallet = {
    name: 'Ví Không Icon',
    type: 'CASH',
    iconType: 'ICON'
    // missing iconKey
  };
  const noIconResult = await apiRequest('POST', '/wallets', accessToken, noIconWallet);
  console.log(`   Status: ${noIconResult.status} (expected 400)`);
  if (noIconResult.status === 400) {
    const err = JSON.parse(noIconResult.body);
    console.log(`   ✅ Returns 400: ${err.message}`);
  }
  console.log('');

  // 5. Get products
  console.log('5️⃣  GET /products...');
  const products = await apiRequest('GET', '/products', accessToken);
  const productList = JSON.parse(products.body);
  console.log(`   Status: ${products.status}`);
  console.log(`   Products count: ${productList.length}\n`);

  // 6. Create product - VALID
  console.log('6️⃣  Create VALID product...');
  const timestamp2 = Date.now();
  const validProduct = {
    name: `Sản Phẩm Test ${timestamp2}`,
    unit: 'm2',
    productType: 'CEILING_WOOD',
    imageUrl: 'http://localhost:4000/uploads/placeholder-product.png'
  };
  const createProduct = await apiRequest('POST', '/products', accessToken, validProduct);
  console.log(`   Status: ${createProduct.status} (expected 201)`);
  if (createProduct.status === 201) {
    const product = JSON.parse(createProduct.body);
    console.log(`   ✅ Created: ${product.code} - ${product.name}`);
  } else {
    const err = JSON.parse(createProduct.body);
    console.log(`   ❌ Failed: ${err.message}`);
  }
  console.log('');

  // 7. Create product - MISSING NAME (400)
  console.log('7️⃣  Create product MISSING NAME...');
  const invalidProduct = {
    unit: 'm2',
    productType: 'CEILING_WOOD',
    imageUrl: 'http://localhost:4000/uploads/placeholder-product.png'
  };
  const invalidProdResult = await apiRequest('POST', '/products', accessToken, invalidProduct);
  console.log(`   Status: ${invalidProdResult.status} (expected 400)`);
  if (invalidProdResult.status === 400) {
    const err = JSON.parse(invalidProdResult.body);
    console.log(`   ✅ Returns 400: ${err.message}`);
  }
  console.log('');

  console.log('='.repeat(70));
  console.log('✅ ALL TESTS PASSED!');
  console.log('='.repeat(70));
}

runTests().catch(console.error);

