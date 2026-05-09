
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractedTransactionSchema = z.object({
  date: z.string().describe("Data della transazione in formato yyyy-MM-dd"),
  description: z.string().describe("Descrizione breve della voce di spesa o del totale"),
  amount: z.number().describe("L'importo associato alla voce (sempre positivo, i numeri negativi vanno convertiti in positivi)"),
  category: z.string().describe("Categoria suggerita per lo studio dentistico (es. 'Materiali', 'Personale', 'Spese Fisse', 'Utenze', 'Imposte', 'Servizi esterni', 'Spese Finanziarie e Legali', 'Gestione e Promozione')"),
  subcategory: z.string().optional().describe("Sottocategoria suggerita all'interno della categoria (es. 'Materiale di consumo', 'Materiale Ortodonzia', 'Affitto', 'Energia Elettrica', ecc.)"),
});

export const ExtractInvoiceDataInputSchema = z.object({
  fileDataUri: z.string().describe("File in base64 (data URI, es. data:image/png;base64,... o data:application/pdf;base64,...)"),
});

export const ExtractInvoiceDataOutputSchema = z.object({
  items: z.array(ExtractedTransactionSchema).describe("Lista delle voci estratte"),
});

export type ExtractInvoiceDataInput = z.infer<typeof ExtractInvoiceDataInputSchema>;
export type ExtractInvoiceDataOutput = z.infer<typeof ExtractInvoiceDataOutputSchema>;

export const extractInvoiceDataFlow = ai.defineFlow(
  {
    name: 'extractInvoiceDataFlow',
    inputSchema: ExtractInvoiceDataInputSchema,
    outputSchema: ExtractInvoiceDataOutputSchema,
  },
  async (input) => {
    // Extract contentType from data URI (e.g. data:application/pdf;base64,...)
    const contentTypeMatch = input.fileDataUri.match(/^data:(.*?);/);
    const contentType = contentTypeMatch ? contentTypeMatch[1] : undefined;

    const response = await ai.generate({
      prompt: [
        { text: "Sei un assistente esperto in contabilità per uno studio dentistico. Il tuo compito è analizzare fatture, ricevute o scontrini." },
        { text: "Estrai le spese dal documento. Puoi estrarre ogni singola riga significativa, oppure raggruppare voci simili (es. tutti i materiali di consumo in un'unica voce 'Materiale di consumo'). Assicurati di estrarre la data del documento (in yyyy-MM-dd), una descrizione chiara, l'importo totale della voce (IVA inclusa), e suggerisci la categoria e sottocategoria migliore. Restituisci gli importi sempre in positivo." },
        { media: { url: input.fileDataUri, contentType: contentType } }
      ],
      output: { schema: ExtractInvoiceDataOutputSchema },
    });
    
    return response.output!;
  }
);
