const http = require('http');
const jwt = require('jsonwebtoken');

// First, login to get a fresh token
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
  res.on('end', async () => {
    const loginResult = JSON.parse(data);
    if (loginResult.accessToken) {
      console.log('✅ Login success!');
      const token = loginResult.accessToken;
      
      console.log('\n📝 Raw Authorization header:');
      console.log(`Bearer ${token.substring(0, 30)}...`);
      
      // Now test the protected endpoint - make sure headers are sent correctly
      console.log('\n🧪 Testing /auth/me with proper headers...');
      
      const options = {
        hostname: 'localhost',
        port: 4000,
        path: '/auth/me',
        method: 'GET',
        headers: {}
      };
      
      // Build headers manually
      const authHeader = `Bearer ${token}`;
      options.headers['Authorization'] = authHeader;
      options.headers['Content-Type'] = 'application/json';
      
      console.log('Headers being sent:', JSON.stringify(options.headers, null, 2));
      
      const protectedReq = http.request(options, (protectedRes) => {
        let protectedData = '';
        protectedRes.on('data', chunk => protectedData += chunk);
        protectedRes.on('end', () => {
          console.log('\nResponse status:', protectedRes.statusCode);
          console.log('Response headers:', JSON.stringify(protectedRes.headers, null, 2));
          console.log('Response body:', protectedData);
        });
      });
      
      protectedReq.on('error', (e) => console.error('Error:', e.message));
      protectedReq.end();
      
    } else {
      console.log('❌ Login failed:', data);
    }
  });
});

loginReq.on('error', (e) => console.error('Login request error:', e.message));
loginReq.write(loginData);
loginReq.end();

