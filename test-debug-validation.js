// Debug validation error
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

async function test() {
  console.log('=== DEBUG VALIDATION ERROR ===\n');

  const loginResult = await login();
  if (loginResult.status !== 200) {
    console.log('Login failed');
    return;
  }
  const {accessToken} = JSON.parse(loginResult.body);
  console.log('Logged in\n');

  // Test missing name
  console.log('Test: Missing name (should be 400)...');
  const result = await new Promise((resolve, reject) => {
    const data = JSON.stringify({
      type: 'CASH',
      iconType: 'ICON',
      iconKey: 'wallet'
    });
    const req = http.request({
      hostname: 'localhost', port: 4000, path: '/wallets', method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({status: res.statusCode, body}));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
  console.log('Status:', result.status);
  console.log('Body:', result.body);
}

test().catch(console.error);

