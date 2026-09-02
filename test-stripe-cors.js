fetch('https://api.stripe.com/v1/checkout/sessions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_123',
    'Content-Type': 'application/x-www-form-urlencoded'
  }
}).then(res => console.log('status', res.status)).catch(e => console.error('error', e));
