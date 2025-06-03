
'use server';
/**
 * @fileOverview A Genkit flow to generate a textual summary of monthly financial transactions.
 *
 * - generateMonthlyTextSummary - A function that generates the summary.
 * - GenerateMonthlyTextSummaryInput - The input type for the function.
 * - GenerateMonthlyTextSummaryOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { initialTransactions, type Transaction } from '@/app/transactions/page';
import { format, getMonth, getYear, parseISO, isValid } from 'date-fns';
import { it } from 'date-fns/locale';

const GenerateMonthlyTextSummaryInputSchema = z.object({
  month: z.number().int().min(0).max(11).describe('The month for the summary (0-indexed, e.g., 0 for January).'),
  year: z.number().int().describe('The year for the summary.'),
});
export type GenerateMonthlyTextSummaryInput = z.infer<typeof GenerateMonthlyTextSummaryInputSchema>;

const GenerateMonthlyTextSummaryOutputSchema = z.object({
  summaryText: z.string().describe('The generated textual summary of financial activities for the month.'),
});
export type GenerateMonthlyTextSummaryOutput = z.infer<typeof GenerateMonthlyTextSummaryOutputSchema>;

export async function generateMonthlyTextSummary(input: GenerateMonthlyTextSummaryInput): Promise<GenerateMonthlyTextSummaryOutput> {
  return generateMonthlyTextSummaryFlow(input);
}

// Helper function to format transactions for the prompt
const formatTransactionsForPrompt = (transactions: Transaction[]): string => {
  // Questa funzione non dovrebbe essere chiamata se transactions è vuoto,
  // ma per sicurezza, la manteniamo così.
  if (transactions.length === 0) {
    return "Nessuna transazione registrata per questo periodo.";
  }
  return transactions.map(t => {
    const datePart = isValid(parseISO(t.date)) ? format(parseISO(t.date), "dd/MM/yyyy", { locale: it }) : "Data non valida";
    return `- Data: ${datePart}, Tipo: ${t.type}, Categoria: ${t.category}${t.subcategory ? ` (${t.subcategory})` : ''}, Importo: €${t.amount.toFixed(2)}${t.description ? `, Descrizione: ${t.description}` : ''}`;
  }).join('\n');
};

const prompt = ai.definePrompt({
  name: 'generateMonthlyTextSummaryPrompt',
  input: { schema: z.object({ month: z.number(), year: z.number(), formattedTransactions: z.string(), monthName: z.string() }) },
  output: { schema: GenerateMonthlyTextSummaryOutputSchema },
  prompt: `Sei un assistente finanziario per lo Studio De Vecchi & Mapelli.
Il tuo compito è generare un riepilogo testuale narrativo dell'attività finanziaria per il mese di {{{monthName}}} {{{year}}}.
Analizza la seguente lista di transazioni e descrivi l'andamento generale.
Evidenzia:
- Le principali fonti di entrata e il loro andamento.
- Le principali categorie di spesa e il loro andamento.
- Eventuali spese particolarmente significative o inaspettate.
- Un commento generale sul bilancio del mese (se le entrate superano le uscite o viceversa).

Lista delle transazioni per {{{monthName}}} {{{year}}}:
{{{formattedTransactions}}}

Fornisci un riepilogo conciso ma informativo.
Inizia il riepilogo con "Nel mese di {{{monthName}}} {{{year}}}, l'attività finanziaria dello studio è stata caratterizzata da..."
`,
});

const generateMonthlyTextSummaryFlow = ai.defineFlow(
  {
    name: 'generateMonthlyTextSummaryFlow',
    inputSchema: GenerateMonthlyTextSummaryInputSchema,
    outputSchema: GenerateMonthlyTextSummaryOutputSchema,
  },
  async ({ month, year }) => {
    const monthName = format(new Date(year, month), "MMMM", { locale: it });

    const monthlyTransactions = initialTransactions.filter(t => {
      const transactionDate = parseISO(t.date);
      return isValid(transactionDate) && getMonth(transactionDate) === month && getYear(transactionDate) === year;
    });

    if (monthlyTransactions.length === 0) {
        return { summaryText: `Nessuna transazione registrata per ${monthName} ${year}. Non è possibile generare un riepilogo dettagliato.` };
    }

    const formattedTransactions = formatTransactionsForPrompt(monthlyTransactions);

    const { output } = await prompt({ month, year, formattedTransactions, monthName });
    
    if (!output || !output.summaryText) {
        // Fallback se AI fallisce a generare o l'output non è conforme
        return { summaryText: `Riepilogo per ${monthName} ${year}:\n${formattedTransactions}\n\n(Riepilogo generato automaticamente basato sui dati grezzi. L'analisi AI potrebbe non essere stata completata correttamente. Si prega di rivedere.)`};
    }
    return output;
  }
);
