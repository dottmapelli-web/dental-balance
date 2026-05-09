const fs = require('fs');

// Minimal valid PDF in base64
const dummyPdfBase64 = "data:application/pdf;base64,JVBERi0xLgoxIDAgb2JqPDwvUGFnZXMgMiAwIFI+PmVuZG9iagoyIDAgb2JqPDwvS2lkc1szIDAgUl0vQ291bnQgMT4+ZW5kb2JqCjMgMCBvYmo8PC9QYXJlbnQgMiAwIFI+PmVuZG9iagp0cmFpbGVyIDw8L1Jvb3QgMSAwIFI+PgolJUVPRgo=";

fetch('http://localhost:3003/api/extract-invoice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileDataUri: dummyPdfBase64 })
})
.then(res => res.json().then(data => console.log(res.status, data)))
.catch(err => console.error(err));
