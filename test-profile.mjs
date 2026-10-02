async function test() {
  const loginRes = await fetch('http://localhost:4002/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@lms.com', password: 'password123' })
  });
  const cookies = loginRes.headers.get('set-cookie');
  const profileRes = await fetch('http://localhost:4002/api/auth/profile', {
    headers: { Cookie: cookies }
  });
  console.log(JSON.stringify(await profileRes.json(), null, 2));
}
test();
