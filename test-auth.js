const axios = require('axios');
const http = require('http');

async function test() {
  try {
    const loginRes = await axios.post('http://localhost:4002/api/auth/login', {
      identifier: 'admin@lms.com',
      password: 'password123'
    }, { 
      withCredentials: true,
      httpAgent: new http.Agent({ keepAlive: true })
    });
    
    const cookies = loginRes.headers['set-cookie'];
    console.log("Cookies:", cookies);
    
    const profileRes = await axios.get('http://localhost:4002/api/auth/profile', {
      headers: { Cookie: cookies[0] }
    });
    
    console.log("Profile Data:", JSON.stringify(profileRes.data, null, 2));
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
test();
