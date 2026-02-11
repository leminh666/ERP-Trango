const jwt = require('jsonwebtoken');
const http = require('http');

// Get fresh token
const loginData = JSON.stringify({ email: 'admin@demo.com', password: '123456' });

const loginReq = http.request({
  hostname: 'localhost',
  port: 4000,
  path: '/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    const token = result.accessToken;
    console.log('✅ Got fresh token:', token.substring(0, 50) + '...\n');
    
    // Test with different secrets
    console.log('Testing token with different secrets:');
    const secrets = [
      'your-super-secret-key-change-in-production',
      'default-secret-key',
      'other-secret'
    ];
    
    secrets.forEach(secret => {
      try {
        const decoded = jwt.verify(token, secret);
        console.log(`✅ SUCCESS with secret: "${secret}"`);
        console.log(`   Payload: sub=${decoded.sub}, email=${decoded.email}\n`);
      } catch(e) {
        console.log(`❌ FAILED with secret: "${secret}" - ${e.message}\n`);
      }
    });
  });
});

loginReq.write(loginData);
loginReq.end();

