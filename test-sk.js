fetch('http://localhost:3000/api/store', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'df_stripe_sk', value: 'sk_test_12345' })
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
