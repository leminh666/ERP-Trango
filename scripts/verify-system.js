/**
 * Final Verification Script - Kiểm tra toàn bộ hệ thống ERP
 * 
 * Chạy: node scripts/verify-system.js
 * 
 * Script này sẽ:
 * 1. Login vào hệ thống
 * 2. Test tất cả API endpoints chính
 * 3. Verify dữ liệu trả về
 * 4. Báo cáo trạng thái
 */

const http = require('http');

const CONFIG = {
  apiUrl: 'http://localhost:4000',
  frontendUrl: 'http://localhost:3000',
  email: 'admin@demo.com',
  password: '123456',
  dateRange: {
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  }
};

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
        try {
          const result = JSON.parse(data);
          resolve(result.accessToken);
        } catch (e) {
          reject(new Error('Login failed'));
        }
      });
    });
    req.write(JSON.stringify({ email: CONFIG.email, password: CONFIG.password }));
    req.end();
  });
}

async function testAPI(path, name, token, checkFn) {
  return new Promise((resolve) => {
    const req = http.get(`${CONFIG.apiUrl}${path}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode !== 200) {
            resolve({ status: 'FAIL', message: `HTTP ${res.statusCode}`, data: null });
            return;
          }
          const check = checkFn(result);
          resolve({
            status: check.ok ? 'PASS' : 'FAIL',
            message: check.message,
            data: result
          });
        } catch (e) {
          resolve({ status: 'FAIL', message: 'Parse error', data: null });
        }
      });
    });
    req.onerror = () => resolve({ status: 'FAIL', message: 'Network error', data: null });
    req.end();
  });
}

async function verifyFrontendProxy(path, name, token) {
  return new Promise((resolve) => {
    const req = http.get(`${CONFIG.frontendUrl}${path}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({
            status: res.statusCode === 200 ? 'PASS' : 'FAIL',
            message: res.statusCode === 200 ? 'Proxy working' : `HTTP ${res.statusCode}`,
            data: result
          });
        } catch (e) {
          resolve({ status: 'FAIL', message: 'Parse error', data: null });
        }
      });
    });
    req.onerror = () => resolve({ status: 'FAIL', message: 'Network error', data: null });
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('   🔍 VERIFY HỆ THỐNG ERP - TRẦN GỖ HOÀNG GIA');
  console.log('='.repeat(60));
  console.log(`\n📅 Date Range: ${CONFIG.dateRange.from} đến ${CONFIG.dateRange.to}\n`);

  // Login
  console.log('🔐 Đang login...');
  const token = await login().catch(() => null);
  if (!token) {
    console.log('❌ Login FAILED - Không thể login vào hệ thống');
    process.exit(1);
  }
  console.log('✅ Login thành công\n');

  const results = [];

  // Test Dashboard
  console.log('--- DASHBOARD ---');
  const dashboard = await testAPI(
    `/reports/dashboard?from=${CONFIG.dateRange.from}&to=${CONFIG.dateRange.to}`,
    'Dashboard',
    token,
    (r) => ({
      ok: r.revenueTotal > 0 && r.expenseTotal >= 0 && r.series?.length > 0,
      message: `Revenue: ${(r.revenueTotal/1e6).toFixed(1)}M, Expense: ${(r.expenseTotal/1e6).toFixed(1)}M, Series: ${r.series?.length || 0} ngày`
    })
  );
  console.log(`${dashboard.status === 'PASS' ? '✅' : '❌'} Dashboard: ${dashboard.message}`);
  results.push({ name: 'Dashboard', ...dashboard });

  // Test Expense Report
  console.log('\n--- REPORTS ---');
  const expense = await testAPI(
    `/reports/expense-summary?from=${CONFIG.dateRange.from}&to=${CONFIG.dateRange.to}`,
    'Expense Summary',
    token,
    (r) => ({
      ok: r.total > 0 && Array.isArray(r.byCategory),
      message: `Total: ${(r.total/1e6).toFixed(1)}M, Categories: ${r.byCategory?.length || 0}`
    })
  );
  console.log(`${expense.status === 'PASS' ? '✅' : '❌'} Báo cáo chi: ${expense.message}`);
  results.push({ name: 'Expense Report', ...expense });

  const income = await testAPI(
    `/reports/income-summary?from=${CONFIG.dateRange.from}&to=${CONFIG.dateRange.to}`,
    'Income Summary',
    token,
    (r) => ({
      ok: r.total > 0 && Array.isArray(r.byCategory),
      message: `Total: ${(r.total/1e6).toFixed(1)}M, Categories: ${r.byCategory?.length || 0}`
    })
  );
  console.log(`${income.status === 'PASS' ? '✅' : '❌'} Báo cáo thu: ${income.message}`);
  results.push({ name: 'Income Report', ...income });

  const regions = await testAPI(
    `/reports/customer-regions?from=${CONFIG.dateRange.from}&to=${CONFIG.dateRange.to}`,
    'Customer Regions',
    token,
    (r) => ({
      ok: Array.isArray(r.byRegion),
      message: `Regions: ${r.byRegion?.length || 0}, HCM Revenue: ${r.byRegion?.find(x => x.region === 'HCM')?.revenueTotal?.toLocaleString() || 0}`
    })
  );
  console.log(`${regions.status === 'PASS' ? '✅' : '❌'} Báo cáo khu vực: ${regions.message}`);
  results.push({ name: 'Customer Regions', ...regions });

  // Test Cashflow
  console.log('\n--- CASHFLOW ---');
  const cashflow = await testAPI(
    `/cashflow?from=${CONFIG.dateRange.from}&to=${CONFIG.dateRange.to}`,
    'Cashflow',
    token,
    (r) => ({
      ok: Array.isArray(r.byWallet),
      message: `Wallets: ${r.byWallet?.length || 0}, Net Change: ${(r.totals?.netChange || 0).toLocaleString()}`
    })
  );
  console.log(`${cashflow.status === 'PASS' ? '✅' : '❌'} Dòng tiền: ${cashflow.message}`);
  results.push({ name: 'Cashflow', ...cashflow });

  // Test Transfers & Adjustments
  console.log('\n--- TRANSFERS & ADJUSTMENTS ---');
  const transfers = await testAPI(
    `/transfers?from=${CONFIG.dateRange.from}&to=${CONFIG.dateRange.to}`,
    'Transfers',
    token,
    (r) => ({
      ok: Array.isArray(r),
      message: `${Array.isArray(r) ? r.length : 0} transfers`
    })
  );
  console.log(`${transfers.status === 'PASS' ? '✅' : '❌'} Chuyển tiền: ${transfers.message}`);
  results.push({ name: 'Transfers', ...transfers });

  const adjustments = await testAPI(
    `/adjustments?from=${CONFIG.dateRange.from}&to=${CONFIG.dateRange.to}`,
    'Adjustments',
    token,
    (r) => ({
      ok: Array.isArray(r),
      message: `${Array.isArray(r) ? r.length : 0} adjustments`
    })
  );
  console.log(`${adjustments.status === 'PASS' ? '✅' : '❌'} Điều chỉnh: ${adjustments.message}`);
  results.push({ name: 'Adjustments', ...adjustments });

  // Test Audit
  console.log('\n--- AUDIT ---');
  const audit = await testAPI(
    `/audit-logs?from=${CONFIG.dateRange.from}&to=${CONFIG.dateRange.to}`,
    'Audit Logs',
    token,
    (r) => ({
      ok: Array.isArray(r.items),
      message: `${r.items?.length || 0} audit logs`
    })
  );
  console.log(`${audit.status === 'PASS' ? '✅' : '❌'} Audit log: ${audit.message}`);
  results.push({ name: 'Audit', ...audit });

  // Test Frontend Proxy
  console.log('\n--- FRONTEND PROXY ---');
  const frontendProxy = await verifyFrontendProxy(
    `/api/reports/dashboard?from=${CONFIG.dateRange.from}&to=${CONFIG.dateRange.to}`,
    'Frontend Proxy',
    token
  );
  console.log(`${frontendProxy.status === 'PASS' ? '✅' : '❌'} Frontend Proxy: ${frontendProxy.message}`);
  results.push({ name: 'Frontend Proxy', ...frontendProxy });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('   📊 TỔNG KẾT');
  console.log('='.repeat(60));
  
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`\n✅ PASS: ${passCount}/${results.length}`);
  console.log(`❌ FAIL: ${failCount}/${results.length}`);
  
  if (failCount > 0) {
    console.log('\n⚠️  Các trang cần kiểm tra:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
  } else {
    console.log('\n🎉 Tất cả API đều hoạt động đúng!');
    console.log('\n📝 Hướng dẫn:');
    console.log('   1. Mở trình duyệt tại http://localhost:3000');
    console.log('   2. Login với: admin@demo.com / 123456');
    console.log('   3. Kiểm tra các trang:');
    console.log('      - Dashboard (http://localhost:3000/dashboard)');
    console.log('      - Báo cáo chi (http://localhost:3000/reports/expense)');
    console.log('      - Báo cáo khu vực (http://localhost:3000/reports/customer-regions)');
    console.log('   4. Mở Console (F12) để kiểm tra lỗi');
  }
  
  console.log('\n' + '='.repeat(60));
  
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Lỗi:', e.message);
  process.exit(1);
});

