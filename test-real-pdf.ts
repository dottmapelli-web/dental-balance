import { extractInvoiceDataFlow } from './src/ai/flows/extract-invoice-data';

async function main() {
  // A minimal valid PDF
  const pdfBase64 = "JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1szIDAgUl0+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCA1OTUgODQyXS9SZXNvdXJjZXM8PC9Gb250PDwvRjEgNCAwIFI+Pj4+L0NvbnRlbnRzIDUgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvSGVsdmV0aWNhPj4KZW5kb2JqCjUgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCjcwIDcwMCBUZAovRjEgMjQgVGYKKEludm9pY2UgMTAwJCApIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjIgMDAwMDAgbiAKMDAwMDAwMDEyMSAwMDAwMCBuIAowMDAwMDAwMjM1IDAwMDAwIG4gCjAwMDAwMDAzMjMgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgo0MTgKJSVFT0YK";
  const dataUri = `data:application/pdf;base64,${pdfBase64}`;

  try {
    console.log("Calling flow...");
    const result = await extractInvoiceDataFlow({ fileDataUri: dataUri });
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Flow failed:", err);
  }
}

main();
