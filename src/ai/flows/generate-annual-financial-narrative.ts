
'use server';
/**
 * @fileOverview Un flusso Genkit per generare un commento narrativo sulla performance finanziaria annuale.
 *
 * - generateAnnualFinancialNarrative - Una funzione che genera il commento.
 * - GenerateAnnualFinancialNarrativeInput - Il tipo di input per la funzione.
 * - GenerateAnnualFinancialNarrativeOutput - Il tipo di ritorno per la funzione.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAnnualFinancialNarrativeInputSchema = z.object({
  currentYear: z.number().int().describe("L'anno per cui generare il commento."),
  currentYearIncome: z.number().describe("Le entrate totali dell'anno corrente."),
  currentYearExpenses: z.number().describe("Le uscite totali dell'anno corrente."),
  currentYearNetProfit: z.number().describe("Il profitto netto dell'anno corrente."),
  previousYearIncome: z.number().optional().describe("Le entrate totali dell'anno precedente (opzionale)."),
  previousYearExpenses: z.number().optional().describe("Le uscite totali dell'anno precedente (opzionale)."),
  previousYearNetProfit: z.number().optional().describe("Il profitto netto dell'anno precedente (opzionale)."),
  companyName: z.string().default("Studio De Vecchi & Mapelli").describe("Il nome dello studio dentistico."),
});
export type GenerateAnnualFinancialNarrativeInput = z.infer<typeof GenerateAnnualFinancialNarrativeInputSchema>;

const GenerateAnnualFinancialNarrativeOutputSchema = z.object({
  narrativeText: z.string().describe("Il commento narrativo generato sulla performance finanziaria annuale."),
});
export type GenerateAnnualFinancialNarrativeOutput = z.infer<typeof GenerateAnnualFinancialNarrativeOutputSchema>;

export async function generateAnnualFinancialNarrative(input: GenerateAnnualFinancialNarrativeInput): Promise<GenerateAnnualFinancialNarrativeOutput> {
  return generateAnnualFinancialNarrativeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAnnualFinancialNarrativePrompt',
  input: {schema: GenerateAnnualFinancialNarrativeInputSchema},
  output: {schema: GenerateAnnualFinancialNarrativeOutputSchema},
  prompt: `Sei un consulente finanziario esperto per lo studio dentistico "{{companyName}}".
Il tuo compito è generare un breve commento narrativo (3-5 frasi) sulla performance finanziaria per l'anno {{currentYear}}.

Dati per l'anno {{currentYear}}:
- Entrate Totali: €{{currentYearIncome}}
- Uscite Totali: €{{currentYearExpenses}}
- Profitto Netto: €{{currentYearNetProfit}}

{{#if previousYearIncome}}
Dati per l'anno precedente ({{currentYear}}-1):
- Entrate Totali Precedenti: €{{previousYearIncome}}
- Uscite Totali Precedenti: €{{previousYearExpenses}}
- Profitto Netto Precedente: €{{previousYearNetProfit}}

Nel tuo commento, evidenzia:
- L'andamento generale del profitto netto dell'anno {{currentYear}}.
- Un confronto chiave con l'anno precedente (se i dati sono disponibili), sottolineando miglioramenti o peggioramenti significativi.
- Un breve consiglio o un'osservazione basata sui dati.
Mantieni un tono professionale, conciso e orientato all'azione.
Se i dati dell'anno precedente non sono disponibili, focalizzati solo sull'anno corrente.
Se il profitto è significativamente positivo, congratulati. Se è negativo o in calo, suggerisci un'analisi più approfondita delle cause.
Inizia il commento con "Per l'anno {{currentYear}}, la performance finanziaria dello studio {{companyName}} può essere così riassunta:".
Termina con una breve frase di incoraggiamento o un suggerimento.
Evita di elencare semplicemente i numeri; crea una narrazione.
{{else}}
Nel tuo commento, evidenzia:
- L'andamento generale del profitto netto dell'anno {{currentYear}}.
- Un breve consiglio o un'osservazione basata sui dati.
Mantieni un tono professionale, conciso e orientato all'azione.
Se il profitto è significativamente positivo, congratulati. Se è negativo, suggerisci un'analisi più approfondita delle cause.
Inizia il commento con "Per l'anno {{currentYear}}, la performance finanziaria dello studio {{companyName}} può essere così riassunta:".
Termina con una breve frase di incoraggiamento o un suggerimento.
Evita di elencare semplicemente i numeri; crea una narrazione.
{{/if}}
`,
});

const generateAnnualFinancialNarrativeFlow = ai.defineFlow(
  {
    name: 'generateAnnualFinancialNarrativeFlow',
    inputSchema: GenerateAnnualFinancialNarrativeInputSchema,
    outputSchema: GenerateAnnualFinancialNarrativeOutputSchema,
  },
  async (input) => {
    // Semplice controllo per evitare output vuoti se i dati sono tutti zero
    if (input.currentYearIncome === 0 && input.currentYearExpenses === 0 && input.currentYearNetProfit === 0) {
        return { narrativeText: `Non ci sono dati finanziari significativi per l'anno ${input.currentYear} per generare un commento dettagliato.` };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
