
import { format, getMonth, getYear, subDays, subMonths, addDays, startOfMonth } from "date-fns";
import type { RecurrenceFrequency, TransactionStatus } from "@/config/transaction-categories";

interface RecurrenceDetails {
  frequency: RecurrenceFrequency;
  startDate: string;
  endDate?: string;
  nextDueDate?: string;
}

export interface Transaction {
  id: string;
  date: string; // yyyy-MM-dd
  description?: string;
  category: string;
  subcategory?: string;
  type: 'Entrata' | 'Uscita';
  amount: number; // Positivo per Entrata, Negativo per Uscita
  status: TransactionStatus;
  isRecurring?: boolean;
  recurrenceDetails?: RecurrenceDetails;
  originalRecurringId?: string;
}

const today = new Date();
const currentMonthStart = startOfMonth(today);

export const initialTransactions: Transaction[] = [
  // Mese Corrente
  { 
    id: "t1", 
    date: format(currentMonthStart, "yyyy-MM-dd"), 
    description: "Incasso da Paziente Mario Rossi", 
    category: "Pazienti", 
    type: "Entrata", 
    amount: 250.00, 
    status: "Completato" 
  },
  { 
    id: "t2", 
    date: format(addDays(currentMonthStart, 2), "yyyy-MM-dd"), 
    description: "Fornitura materiali conservativa", 
    category: "Materiali", 
    subcategory: "Materiale Conservativa", 
    type: "Uscita", 
    amount: -75.50, 
    status: "Completato" 
  },
  { 
    id: "t3-def", 
    date: format(addDays(currentMonthStart, 5), "yyyy-MM-dd"), 
    description: "Affitto Studio (Definizione)", 
    category: "Spese Fisse", 
    subcategory: "Affitto", 
    type: "Uscita", 
    amount: -1200.00, 
    status: "Completato", 
    isRecurring: true, 
    recurrenceDetails: { 
      frequency: "Mensile", 
      startDate: format(addDays(currentMonthStart, 5), "yyyy-MM-dd") 
    } 
  },
  
  // Mese Precedente (esempio di istanza da ricorrenza)
  { 
    id: "t4-instance", 
    date: format(subMonths(addDays(currentMonthStart, 5), 1), "yyyy-MM-dd"), 
    description: "Affitto Studio - Mese Prec.", 
    category: "Spese Fisse", 
    subcategory: "Affitto", 
    type: "Uscita", 
    amount: -1200.00, 
    status: "Completato", 
    isRecurring: false, // Istanza
    originalRecurringId: "t3-def" 
  },
  { 
    id: "t5", 
    date: format(subMonths(currentMonthStart, 1), "yyyy-MM-dd"), 
    description: "Pagamento laboratorio - Mese Prec.", 
    category: "Servizi esterni", 
    subcategory: "Lab. Baisotti", 
    type: "Uscita", 
    amount: -350.00, 
    status: "Completato" 
  },

  // Transazione Futura/Pianificata
  { 
    id: "fut1", 
    date: format(addDays(today, 7), "yyyy-MM-dd"), 
    description: "Pagamento rata leasing", 
    category: "Spese Finanziarie e Legali", 
    subcategory: "Leasing", 
    type: "Uscita", 
    amount: -250.00, 
    status: "Pianificato" 
  },
  {
    id: "fut2",
    date: format(addDays(today, 14), "yyyy-MM-dd"),
    description: "Stipendio Assistente - Prossimo",
    category: "Personale",
    subcategory: "Stipendio Daniela",
    type: "Uscita",
    amount: -1350.00,
    status: "Pianificato",
    isRecurring: false, // Immaginiamo sia un'istanza di una definizione non inclusa qui per brevità
    originalRecurringId: "stipendio-daniela-def" // ID fittizio della definizione
  }
];
