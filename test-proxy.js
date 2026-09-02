fetch('http://localhost:3000/api/stripe/v1/checkout/sessions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_123',
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: 'success_url=http://localhost:3000&cancel_url=http://localhost:3000'
}).then(async res => {
  console.log('status', res.status);
  console.log('body', await res.text());
}).catch(e => console.error('error', e));
