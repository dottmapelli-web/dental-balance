import { extractInvoiceDataFlow } from './src/ai/flows/extract-invoice-data';
import * as fs from 'fs';

async function main() {
  const fileContent = fs.readFileSync('test-large-pdf.js', 'utf-8');
  const base64Match = fileContent.match(/const largePdfBase64 = "(.*?)";/);
  if (!base64Match) throw new Error("Base64 not found");
  
  const base64 = base64Match[1];
  try {
    console.log("Calling flow...");
    const result = await extractInvoiceDataFlow({ fileDataUri: base64 });
    console.log("Result:", result);
  } catch (err) {
    console.error("Flow failed:", err);
  }
}

main();
