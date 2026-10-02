async function test() {
  try {
    const loginRes = await fetch('http://localhost:4002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@lms.com', password: 'password123' })
    });
    
    const cookies = loginRes.headers.get('set-cookie');
    console.log("Cookies:", cookies);
    
    const profileRes = await fetch('http://localhost:4002/api/auth/profile', {
      headers: { Cookie: cookies }
    });
    
    const data = await profileRes.json();
    console.log("Profile Data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
test();
