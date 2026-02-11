const http = require('http');

function login() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: '/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data).accessToken));
    });
    req.write(JSON.stringify({ email: 'admin@demo.com', password: '123456' }));
    req.end();
  });
}

async function testAPI(token) {
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
  const yearEnd = today.toISOString().split('T')[0];

  console.log(`Date range: ${yearStart} to ${yearEnd}\n`);

  // Test expense summary
  await callAPI(`/reports/expense-summary?from=${yearStart}&to=${yearEnd}`, 'Expense Summary', token);
  
  // Test customer regions
  await callAPI(`/reports/customer-regions?from=${yearStart}&to=${yearEnd}`, 'Customer Regions', token);
}

async function callAPI(path, name, token) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.error) {
            console.log(`❌ ${name}: ERROR - ${JSON.stringify(result)}`);
          } else {
            console.log(`✅ ${name}: OK`);
            console.log(JSON.stringify(result, null, 2).substring(0, 2000));
          }
        } catch (e) {
          console.log(`❌ ${name}: Parse error - ${data.substring(0, 300)}`);
        }
        console.log('---');
        resolve();
      });
    });
    req.onerror = () => { console.log(`❌ ${name}: Network error`); resolve(); };
    req.end();
  });
}

async function main() {
  try {
    const token = await login();
    console.log('✅ Login success\n');
    await testAPI(token);
  } catch (e) {
    console.log('❌ Error:', e.message);
  }
}

main();

