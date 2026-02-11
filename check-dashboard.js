const http = require('http');

// Login first
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
      res.on('end', () => {
        const result = JSON.parse(data);
        resolve(result.accessToken);
      });
    });
    req.write(JSON.stringify({ email: 'admin@demo.com', password: '123456' }));
    req.end();
  });
}

async function testDashboard(token) {
  console.log('\n=== DASHBOARD DATA CHECK ===');
  
  // Get date range for this year
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
  const yearEnd = today.toISOString().split('T')[0];
  
  console.log(`Date range: ${yearStart} to ${yearEnd}\n`);
  
  // Check transactions directly
  await checkTransactions(token, yearStart, yearEnd);
  
  // Check dashboard API
  await callAPI(`/reports/dashboard?from=${yearStart}&to=${yearEnd}`, 'Dashboard API', token);
}

async function checkTransactions(token, from, to) {
  console.log('--- Transaction Counts by Type ---');
  
  const types = ['INCOME', 'EXPENSE', 'TRANSFER'];
  for (const type of types) {
    await callAPI(`/transactions?type=${type}&from=${from}&to=${to}`, `Transactions (${type})`, token);
  }
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
          if (Array.isArray(result)) {
            const total = result.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
            console.log(`✅ ${name}: ${result.length} records, total=${total.toLocaleString()}`);
          } else if (result.revenueTotal !== undefined) {
            console.log(`✅ ${name}: revenueTotal=${result.revenueTotal?.toLocaleString()}, expenseTotal=${result.expenseTotal?.toLocaleString()}, profit=${result.profit?.toLocaleString()}`);
          } else if (result.total !== undefined) {
            console.log(`✅ ${name}: total=${result.total?.toLocaleString()}`);
          } else {
            console.log(`✅ ${name}: OK - ${JSON.stringify(result).substring(0, 200)}`);
          }
        } catch (e) {
          console.log(`❌ ${name}: Parse error - ${data.substring(0, 200)}`);
        }
        resolve();
      });
    });
    req.onerror = () => { console.log(`❌ ${name}: Error`); resolve(); };
    req.end();
  });
}

async function main() {
  try {
    const token = await login();
    console.log('✅ Login success');
    await testDashboard(token);
  } catch (e) {
    console.log('❌ Error:', e.message);
  }
}

main();

