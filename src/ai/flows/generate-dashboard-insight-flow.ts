
'use server';
/**
 * @fileOverview Un flusso Genkit per generare un breve insight sulla dashboard.
 *
 * - generateDashboardInsight - Una funzione che genera l'insight.
 * - GenerateDashboardInsightInput - Il tipo di input per la funzione.
 * - GenerateDashboardInsightOutput - Il tipo di ritorno per la funzione.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDashboardInsightInputSchema = z.object({
  totalIncome: z.number().describe('Le entrate totali del mese corrente.'),
  totalExpenses: z.number().describe('Le uscite totali del mese corrente.'),
  balance: z.number().describe('Il saldo del mese corrente (entrate - uscite).'),
});
export type GenerateDashboardInsightInput = z.infer<typeof GenerateDashboardInsightInputSchema>;

const GenerateDashboardInsightOutputSchema = z.object({
  insightText: z.string().describe('Un breve commento (1-2 frasi) sulla salute finanziaria e un consiglio.'),
});
export type GenerateDashboardInsightOutput = z.infer<typeof GenerateDashboardInsightOutputSchema>;

export async function generateDashboardInsight(input: GenerateDashboardInsightInput): Promise<GenerateDashboardInsightOutput> {
  return generateDashboardInsightFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDashboardInsightPrompt',
  input: {schema: GenerateDashboardInsightInputSchema},
  output: {schema: GenerateDashboardInsightOutputSchema},
  prompt: `Sei un consulente finanziario esperto per uno studio dentistico.
Basandoti sulle seguenti cifre per il mese corrente:
- Entrate Totali: €{{{totalIncome}}}
- Uscite Totali: €{{{totalExpenses}}}
- Saldo Mensile: €{{{balance}}}

Fornisci un breve commento (massimo 2-3 frasi concise) sulla salute finanziaria dello studio per questo mese.
Evidenzia un aspetto positivo o un'area di attenzione e, se opportuno, offri un brevissimo consiglio pratico.
Mantieni un tono professionale e incoraggiante.
Se il saldo è significativamente positivo, congratulati. Se è negativo, suggerisci cautela o analisi.
Se entrate e uscite sono zero, indica che non ci sono dati sufficienti per un'analisi dettagliata.`,
});

const generateDashboardInsightFlow = ai.defineFlow(
  {
    name: 'generateDashboardInsightFlow',
    inputSchema: GenerateDashboardInsightInputSchema,
    outputSchema: GenerateDashboardInsightOutputSchema,
  },
  async input => {
    if (input.totalIncome === 0 && input.totalExpenses === 0) {
      return { insightText: "Non ci sono dati di entrate o uscite per il mese corrente per fornire un'analisi dettagliata." };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
