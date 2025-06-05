
'use server';
/**
 * @fileOverview A Genkit flow to generate a textual summary of monthly financial transactions from Firestore.
 *
 * - generateMonthlyTextSummary - A function that generates the summary.
 * - GenerateMonthlyTextSummaryInput - The input type for the function.
 * - GenerateMonthlyTextSummaryOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { type Transaction } from '@/data/transactions-data'; // Keep type definition
import { format, isValid, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

// Helper function to fetch transactions from Firestore for a specific month and year
async function getTransactionsForMonth(year: number, month: number): Promise<Transaction[]> {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999); // Last moment of the specified month

  const transactionsCol = collection(db, 'transactions');
  const q = query(
    transactionsCol,
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)), // Use '<=' for endDate to include the whole last day
    orderBy('date', 'asc')
  );

  const querySnapshot = await getDocs(q);
  const transactions: Transaction[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    transactions.push({
      id: doc.id,
      date: data.date instanceof Timestamp ? format(data.date.toDate(), "yyyy-MM-dd") : data.date,
      description: data.description,
      category: data.category,
      subcategory: data.subcategory,
      type: data.type,
      amount: data.amount, // Amount is stored correctly in Firestore
      status: data.status as Transaction['status'],
      isRecurring: data.isRecurring || false,
      recurrenceDetails: data.recurrenceDetails ? {
        ...data.recurrenceDetails,
        startDate: data.recurrenceDetails.startDate instanceof Timestamp ? format(data.recurrenceDetails.startDate.toDate(), "yyyy-MM-dd") : data.recurrenceDetails.startDate,
        endDate: data.recurrenceDetails.endDate && data.recurrenceDetails.endDate instanceof Timestamp ? format(data.recurrenceDetails.endDate.toDate(), "yyyy-MM-dd") : undefined,
      } : undefined,
      originalRecurringId: data.originalRecurringId,
    });
  });
  return transactions;
}


// Helper function to format transactions for the prompt
const formatTransactionsForPrompt = (transactions: Transaction[]): string => {
  if (transactions.length === 0) {
    return "Nessuna transazione registrata per questo periodo.";
  }
  return transactions.map(t => {
    // Ensure date is valid before formatting
    const dateObj = parseISO(t.date);
    const datePart = isValid(dateObj) ? format(dateObj, "dd/MM/yyyy", { locale: it }) : "Data non valida";
    
    // Amounts are stored with correct sign in Firestore, prompt might expect absolute for expenses
    // However, the current prompt seems to handle signed amounts.
    // If expenses need to be positive in prompt: amount: €${t.type === 'Uscita' ? Math.abs(t.amount).toFixed(2) : t.amount.toFixed(2)}
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
    try {
      const monthName = format(new Date(year, month), "MMMM", { locale: it });

      // Fetch transactions from Firestore
      const monthlyTransactions = await getTransactionsForMonth(year, month);

      if (monthlyTransactions.length === 0) {
          return { summaryText: `Nessuna transazione registrata in Firestore per ${monthName} ${year}. Non è possibile generare un riepilogo dettagliato.` };
      }

      const formattedTransactions = formatTransactionsForPrompt(monthlyTransactions);

      try {
        const response = await prompt({ month, year, formattedTransactions, monthName });
      
        if (response && response.output && typeof response.output.summaryText === 'string') {
          return response.output;
        } else {
          console.error('AI output is not in the expected format or missing summaryText. Response:', response);
          const outputDetails = response && response.output ? JSON.stringify(response.output) : 'Nessun output ricevuto.';
          return { 
            summaryText: `Impossibile generare il riepilogo AI per ${monthName} ${year}. L'output del modello non era nel formato previsto o il campo summaryText era mancante. Dettagli output: ${outputDetails}\n\nDati forniti al modello (da Firestore):\n${formattedTransactions}`
          };
        }
      } catch (promptError: any) {
          console.error('Error during AI prompt execution in generateMonthlyTextSummaryFlow:', promptError);
          return { 
            summaryText: `Errore durante la generazione del riepilogo AI per ${monthName} ${year}: ${promptError.message || 'Errore sconosciuto durante l\'esecuzione del prompt.'}.\n\nDati forniti al modello (da Firestore):\n${formattedTransactions}`
          };
      }
    } catch (flowError: any) { 
        console.error('Error in generateMonthlyTextSummaryFlow preparation stages (Firestore fetch or date formatting):', flowError);
        const monthForErrorDisplay = format(new Date(year, month), "MMMM yyyy", { locale: it });
        return { 
          summaryText: `Si è verificato un errore imprevisto durante la preparazione dei dati (recupero da Firestore o formattazione date) per il riepilogo di ${monthForErrorDisplay}. Dettagli errore: ${flowError.message || 'Errore sconosciuto.'}`
        };
    }
  }
);

    