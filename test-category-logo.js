// Test category logo and icon functionality
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
  console.log('🧪 CATEGORY LOGO & ICON TEST');
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

  // 2. Create Income Category with ICON
  console.log('2️⃣  Create Income Category (ICON mode)...');
  const iconCat = {
    name: `Test Icon Category ${Date.now()}`,
    visualType: 'ICON',
    iconKey: 'dollar-sign',
    color: '#3b82f6'
  };
  const iconResult = await apiRequest('POST', '/income-categories', accessToken, iconCat);
  console.log(`   Status: ${iconResult.status} (expected 201)`);
  if (iconResult.status === 201) {
    const cat = JSON.parse(iconResult.body);
    console.log(`   ✅ Created: ${cat.code} - ${cat.name}`);
    console.log(`   📋 visualType: ${cat.visualType}, iconKey: ${cat.iconKey}`);
  } else {
    console.log(`   ❌ Failed: ${iconResult.body}`);
  }
  console.log('');

  // 3. Create Income Category with IMAGE (LOGO)
  console.log('3️⃣  Create Income Category (IMAGE mode)...');
  const imageCat = {
    name: `Test Logo Category ${Date.now()}`,
    visualType: 'IMAGE',
    iconKey: '', // empty when using logo
    imageUrl: 'http://localhost:4000/uploads/placeholder-product.png',
    color: '#3b82f6'
  };
  const imageResult = await apiRequest('POST', '/income-categories', accessToken, imageCat);
  console.log(`   Status: ${imageResult.status} (expected 201)`);
  if (imageResult.status === 201) {
    const cat = JSON.parse(imageResult.body);
    console.log(`   ✅ Created: ${cat.code} - ${cat.name}`);
    console.log(`   📋 visualType: ${cat.visualType}, imageUrl: ${cat.imageUrl?.substring(0, 50)}...`);
  } else {
    console.log(`   ❌ Failed: ${imageResult.body}`);
  }
  console.log('');

  // 4. Create Expense Category with ICON
  console.log('4️⃣  Create Expense Category (ICON mode)...');
  const expIconCat = {
    name: `Test Expense Icon ${Date.now()}`,
    visualType: 'ICON',
    iconKey: 'shopping-cart',
    color: '#ef4444'
  };
  const expIconResult = await apiRequest('POST', '/expense-categories', accessToken, expIconCat);
  console.log(`   Status: ${expIconResult.status} (expected 201)`);
  if (expIconResult.status === 201) {
    const cat = JSON.parse(expIconResult.body);
    console.log(`   ✅ Created: ${cat.code} - ${cat.name}`);
  } else {
    console.log(`   ❌ Failed: ${expIconResult.body}`);
  }
  console.log('');

  // 5. Create Expense Category with IMAGE (LOGO)
  console.log('5️⃣  Create Expense Category (IMAGE mode)...');
  const expImageCat = {
    name: `Test Expense Logo ${Date.now()}`,
    visualType: 'IMAGE',
    iconKey: '',
    imageUrl: 'http://localhost:4000/uploads/placeholder-product.png',
    color: '#ef4444'
  };
  const expImageResult = await apiRequest('POST', '/expense-categories', accessToken, expImageCat);
  console.log(`   Status: ${expImageResult.status} (expected 201)`);
  if (expImageResult.status === 201) {
    const cat = JSON.parse(expImageResult.body);
    console.log(`   ✅ Created: ${cat.code} - ${cat.name}`);
    console.log(`   📋 visualType: ${cat.visualType}, imageUrl: ${cat.imageUrl?.substring(0, 50)}...`);
  } else {
    console.log(`   ❌ Failed: ${expImageResult.body}`);
  }
  console.log('');

  // 6. Get all income categories
  console.log('6️⃣  GET Income Categories...');
  const incomeList = await apiRequest('GET', '/income-categories', accessToken);
  const incomeData = JSON.parse(incomeList.body);
  const incomeWithImage = incomeData.filter((c) => c.visualType === 'IMAGE');
  console.log('   Total:', incomeData.length);
  console.log('   With Image (Logo):', incomeWithImage.length);
  if (incomeWithImage.length > 0) {
    const sample = incomeWithImage[incomeWithImage.length - 1];
    console.log('   📋 Sample logo category:', sample.name, '(imageUrl:', sample.imageUrl?.substring(0, 50) + '...)');
  }
  console.log('');

  // 7. Get all expense categories
  console.log('7️⃣  GET Expense Categories...');
  const expenseList = await apiRequest('GET', '/expense-categories', accessToken);
  const expenseData = JSON.parse(expenseList.body);
  const expenseWithImage = expenseData.filter((c) => c.visualType === 'IMAGE');
  console.log('   Total:', expenseData.length);
  console.log('   With Image (Logo):', expenseWithImage.length);
  if (expenseWithImage.length > 0) {
    const sample = expenseWithImage[expenseWithImage.length - 1];
    console.log('   📋 Sample logo category:', sample.name, '(imageUrl:', sample.imageUrl?.substring(0, 50) + '...)');
  }
  console.log('');

  console.log('='.repeat(70));
  console.log('✅ CATEGORY TEST COMPLETED');
  console.log('='.repeat(70));
}

runTests().catch(console.error);

