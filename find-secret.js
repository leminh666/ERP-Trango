const jwt = require('jsonwebtoken');
const http = require('http');

// Get fresh token
const loginReq = http.request({
  hostname: 'localhost',
  port: 4000,
  path: '/auth/login',
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json', 
    'Content-Length': '56' 
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const token = JSON.parse(data).accessToken;
    console.log('Token:', token.substring(0, 50) + '...');
    
    // Decode without verification
    const decoded = jwt.decode(token);
    console.log('Decoded payload:', JSON.stringify(decoded, null, 2));
    
    // Try common secrets
    const secrets = [
      'your-super-secret-key-change-in-production',
      'default-secret-key',
      'jwt-secret-2024',
      'super-secret-jwt-key-2026-change-in-prod'
    ];
    
    console.log('\nTesting token verification:');
    secrets.forEach(secret => {
      try {
        jwt.verify(token, secret);
        console.log('✅ SUCCESS with:', secret);
      } catch(e) {
        console.log('❌ FAILED with:', secret, '-', e.message);
      }
    });
  });
});
loginReq.write('{"email":"admin@demo.com","password":"123456"}');
loginReq.end();

