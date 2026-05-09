const fs = require('fs');
const crypto = require('crypto');

// Create a 20MB dummy payload
const dummyBase64 = crypto.randomBytes(15000000).toString('base64');
const dataUri = "data:application/pdf;base64," + dummyBase64;

fetch('http://localhost:3003/api/extract-invoice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileDataUri: dataUri })
})
.then(res => {
  console.log('Status:', res.status);
  return res.text();
})
.then(text => console.log('Response:', text.substring(0, 100)))
.catch(err => console.error(err));
