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
      
      // Decode token without verification to see payload
      try {
        const decoded = jwt.decode(token);
        console.log('\n📝 Token payload (decoded):');
        console.log(JSON.stringify(decoded, null, 2));
        
        // Try to verify with different secrets
        const secrets = [
          'your-super-secret-key-change-in-production',
          'default-secret-key',
          process.env.JWT_SECRET || 'not-set'
        ];
        
        console.log('\n🔐 Testing token verification with different secrets:');
        for (const secret of secrets) {
          try {
            jwt.verify(token, secret);
            console.log(`✅ Secret "${secret.substring(0, 20)}...": VERIFIED`);
          } catch (e) {
            console.log(`❌ Secret "${secret.substring(0, 20)}...": ${e.message}`);
          }
        }
      } catch (e) {
        console.log('❌ Failed to decode token:', e.message);
      }
      
      // Now test the protected endpoint
      console.log('\n🧪 Testing /auth/me with login token...');
      
      const protectedReq = http.request({
        hostname: 'localhost',
        port: 4000,
        path: '/auth/me',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }, (protectedRes) => {
        let protectedData = '';
        protectedRes.on('data', chunk => protectedData += chunk);
        protectedRes.on('end', () => {
          console.log('\nResponse status:', protectedRes.statusCode);
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

