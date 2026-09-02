import fetch from 'node-fetch'; // if we need fetch, wait node 22 has fetch built-in
async function test() {
  const res = await fetch('http://localhost:3000/api/stripe/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer sk_test_123',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'success_url=http://localhost:3000&cancel_url=http://localhost:3000'
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
