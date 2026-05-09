import { NextResponse } from 'next/server';
import { extractInvoiceDataFlow } from '@/ai/flows/extract-invoice-data';

export const maxDuration = 60; // Consente a Vercel di far girare la funzione per 60s (necessario per task LLM con immagini)

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileDataUri } = body;

    if (!fileDataUri || typeof fileDataUri !== 'string') {
      return NextResponse.json(
        { error: 'fileDataUri è richiesto e deve essere una stringa valida' },
        { status: 400 }
      );
    }

    const result = await extractInvoiceDataFlow({ fileDataUri });

    return NextResponse.json({ success: true, data: result.items });
    } catch (error: any) {
    console.error('Errore durante l\'estrazione dei dati della fattura:', error);
    return NextResponse.json(
      { error: error?.message || 'Errore interno del server durante l\'elaborazione del file' },
      { status: 500 }
    );
  }
}
