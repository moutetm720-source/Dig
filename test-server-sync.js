fetch('http://localhost:3000/api/store', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'test_key', value: 'test_value' })
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
