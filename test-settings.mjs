/**
 * Settings Update Test - V2.1
 */
import http from 'http';

async function test() {
  // Login
  const loginData = JSON.stringify({ email: 'admin@demo.com', password: '123456' });
  
  const loginReq = http.request({
    hostname: 'localhost',
    port: 4000,
    path: '/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
      const json = JSON.parse(data);
      const token = json.accessToken;
      console.log('Login:', res.statusCode);
      
      // Test Get Settings
      console.log('\n--- GET Settings ---');
      const getReq = http.request({
        hostname: 'localhost',
        port: 4000,
        path: '/settings',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
      }, (getRes) => {
        let getData = '';
        getRes.on('data', chunk => getData += chunk);
        getRes.on('end', () => {
          console.log('GET Settings:', getRes.statusCode);
          
          // Test Update Settings with correct payload
          console.log('\n--- PUT Settings (with ai config) ---');
          const updatePayload = JSON.stringify({
            ai: { enabled: true, provider: 'mock', model: 'gpt-4' }
          });
          
          const updateReq = http.request({
            hostname: 'localhost',
            port: 4000,
            path: '/settings',
            method: 'PUT',
            headers: {
              'Authorization': 'Bearer ' + token,
              'Content-Type': 'application/json',
              'Content-Length': updatePayload.length
            }
          }, (updateRes) => {
            let updateData = '';
            updateRes.on('data', chunk => updateData += chunk);
            updateRes.on('end', () => {
              console.log('PUT Settings:', updateRes.statusCode);
              console.log('Response:', updateData.substring(0, 500));
            });
          });
          updateReq.on('error', e => console.log('Update Error:', e.message));
          updateReq.write(updatePayload);
          updateReq.end();
        });
      });
      getReq.on('error', e => console.log('Get Error:', e.message));
      getReq.end();
    });
  });
  
  loginReq.on('error', e => console.log('Login Error:', e.message));
  loginReq.write(loginData);
  loginReq.end();
}

test();

