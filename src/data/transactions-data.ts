
import { format, getMonth, getYear, subDays, subMonths, addMonths } from "date-fns";
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
  amount: number;
  status: TransactionStatus;
  isRecurring?: boolean;
  recurrenceDetails?: RecurrenceDetails;
  originalRecurringId?: string;
}

const today = new Date();
const currentMonth = getMonth(today);
const currentYear = getYear(today);

export const initialTransactions: Transaction[] = [
  // Mese Corrente
  { id: "t1", date: format(today, "yyyy-MM-dd"), description: "Pagamento Fattura #123 - Mario Rossi", category: "Pazienti", type: "Entrata", amount: 150.00, status: "Completato" },
  { id: "t2", date: format(today, "yyyy-MM-dd"), description: "Acquisto compositi", category: "Materiali", subcategory: "Materiale Conservativa", type: "Uscita", amount: -85.20, status: "Completato" },
  { id: "t3", date: format(new Date(currentYear, currentMonth, 15), "yyyy-MM-dd"), description: "Affitto Studio - Mese Corrente", category: "Spese Fisse", subcategory: "Affitto", type: "Uscita", amount: -1200.00, status: "Completato", isRecurring: true, recurrenceDetails: { frequency: "Mensile", startDate: format(new Date(currentYear, 0, 15), "yyyy-MM-dd") } },
  { id: "t5", date: format(subDays(today, 2), "yyyy-MM-dd"), description: "Fattura Laboratorio Baisotti", category: "Servizi Esterni", subcategory: "Lab. Baisotti", type: "Uscita", amount: -450.75, status: "Completato" },
  { id: "t6", date: format(subDays(today, 3), "yyyy-MM-dd"), description: "Forniture Ufficio", category: "Spesa Studio", subcategory: "Forniture D’Ufficio", type: "Uscita", amount: -60.00, status: "Completato" },
  { id: "t8", date: format(subDays(today, 1), "yyyy-MM-dd"), description: "Pulizia impianti", category: "Materiali", subcategory: "Materiale Impianti", type: "Uscita", amount: -120.50, status: "Pianificato" },
  { id: "t9", date: format(new Date(currentYear, currentMonth, 5), "yyyy-MM-dd"), description: "Marketing Facebook Ads", category: "Altre spese", subcategory: "Marketing", type: "Uscita", amount: -150.00, status: "Completato"},
  { id: "t10", date: format(new Date(currentYear, currentMonth, 10), "yyyy-MM-dd"), description: "Bolletta Luce", category: "Spese Fisse", subcategory: "Elettricità", type: "Uscita", amount: -95.60, status: "Completato"},
  { id: "t11", date: format(new Date(currentYear, currentMonth, 3), "yyyy-MM-dd"), description: "Stipendio Ilaria - Mese Corrente", category: "Personale", subcategory: "Stipendio Ilaria", type: "Uscita", amount: -1400.00, status: "Completato", isRecurring: true, recurrenceDetails: { frequency: "Mensile", startDate: format(new Date(currentYear, 0, 3), "yyyy-MM-dd") } },
  { id: "t12", date: format(new Date(currentYear, currentMonth, 12), "yyyy-MM-dd"), description: "Incasso Dr. Verdi", category: "Pazienti", type: "Entrata", amount: 280.00, status: "Completato"},
  { id: "t13", date: format(new Date(currentYear, currentMonth, 15), "yyyy-MM-dd"), description: "Tasse", category: "Spese Finanziarie", subcategory: "Tasse", type: "Uscita", amount: -3200.00, status: "Completato"},
  { id: "t14", date: format(new Date(currentYear, currentMonth, 8), "yyyy-MM-dd"), description: "Materiale Ortodonzia", category: "Materiali", subcategory: "Materiale Ortodonzia", type: "Uscita", amount: -210.00, status: "Completato"},
  { id: "t15", date: format(new Date(currentYear, currentMonth, 1), "yyyy-MM-dd"), description: "Compenso Dr. Mapelli", category: "Personale", subcategory: "Compenso Dr. Mapelli", type: "Uscita", amount: -2800.00, status: "Completato"},
  { id: "t28", date: format(new Date(currentYear, currentMonth, 18), "yyyy-MM-dd"), description: "Entrata da Sig.ra Paola Neri", category: "Pazienti", type: "Entrata", amount: 450.00, status: "Completato" },
  { id: "t29", date: format(new Date(currentYear, currentMonth, 20), "yyyy-MM-dd"), description: "Spesa cancelleria", category: "Spesa Studio", subcategory:"Forniture D’Ufficio", type: "Uscita", amount: -25.99, status: "Completato" },


  // Mese Precedente
  { id: "t4", date: format(subMonths(today, 1), "yyyy-MM-dd"), description: "Stipendio Daniela - Mese Prec.", category: "Personale", subcategory: "Stipendio Daniela", type: "Uscita", amount: -1350.00, status: "Completato" },
  { id: "t7", date: format(subMonths(today, 1), "yyyy-MM-dd"), description: "Incasso Dr. Bianchi - Mese Prec.", category: "Pazienti", type: "Entrata", amount: 320.00, status: "Completato" },
  { id: "t16", date: format(new Date(getYear(subMonths(today, 1)), getMonth(subMonths(today, 1)), 15), "yyyy-MM-dd"), description: "Affitto Studio - Mese Prec.", category: "Spese Fisse", subcategory: "Affitto", type: "Uscita", amount: -1200.00, status: "Completato", originalRecurringId: "t3"},
  { id: "t17", date: format(new Date(getYear(subMonths(today, 1)), getMonth(subMonths(today, 1)), 10), "yyyy-MM-dd"), description: "Materiale Impianti - Mese Prec.", category: "Materiali", subcategory: "Materiale Impianti", type: "Uscita", amount: -2150.00, status: "Completato"},
  { id: "t18", date: format(new Date(getYear(subMonths(today, 1)), getMonth(subMonths(today, 1)), 5), "yyyy-MM-dd"), description: "Entrata Sig. Rossi - Mese Prec.", category: "Pazienti", type: "Entrata", amount: 500.00, status: "Completato"},
  { id: "t31", date: format(new Date(getYear(subMonths(today, 1)), getMonth(subMonths(today, 1)), 3), "yyyy-MM-dd"), description: "Stipendio Ilaria - Mese Prec.", category: "Personale", subcategory: "Stipendio Ilaria", type: "Uscita", amount: -1400.00, status: "Completato", originalRecurringId: "t11"},


  // Due Mesi Fa
  { id: "t19", date: format(subMonths(today, 2), "yyyy-MM-dd"), description: "Pagamento Consulente del Lavoro", category: "Servizi Esterni", subcategory: "Consulente del Lavoro", type: "Uscita", amount: -300.00, status: "Completato" },
  { id: "t20", date: format(subMonths(today, 2), "yyyy-MM-dd"), description: "Incasso Sig. Verdi", category: "Pazienti", type: "Entrata", amount: 200.00, status: "Completato" },
  { id: "t21", date: format(new Date(getYear(subMonths(today, 2)), getMonth(subMonths(today, 2)), 15), "yyyy-MM-dd"), description: "Affitto Studio - Due Mesi Fa", category: "Spese Fisse", subcategory: "Affitto", type: "Uscita", amount: -1200.00, status: "Completato", originalRecurringId: "t3"},
  { id: "t22", date: format(new Date(getYear(subMonths(today, 2)), getMonth(subMonths(today, 2)), 3), "yyyy-MM-dd"), description: "Stipendio Ilaria - Due Mesi Fa", category: "Personale", subcategory: "Stipendio Ilaria", type: "Uscita", amount: -1400.00, status: "Completato", originalRecurringId: "t11"},


  // Tre Mesi Fa
  { id: "t23", date: format(subMonths(today, 3), "yyyy-MM-dd"), description: "Acquisto Software Gestionale Update", category: "Spesa Studio", subcategory: "Software Gestionale", type: "Uscita", amount: -500.00, status: "Completato" },
  { id: "t24", date: format(subMonths(today, 3), "yyyy-MM-dd"), description: "Entrata Sig. Neri", category: "Pazienti", type: "Entrata", amount: 120.00, status: "Completato" },

  // Quattro Mesi Fa
  { id: "t25", date: format(subMonths(today, 4), "yyyy-MM-dd"), description: "Manutenzione Attrezzature", category: "Spesa Studio", subcategory: "Manutenzione", type: "Uscita", amount: -250.00, status: "Completato" },
  { id: "t26", date: format(subMonths(today, 4), "yyyy-MM-dd"), description: "Entrata Sig.ra Gallo", category: "Pazienti", type: "Entrata", amount: 600.00, status: "Completato" },

  // Cinque Mesi Fa
  { id: "t27", date: format(subMonths(today, 5), "yyyy-MM-dd"), description: "Fattura Commercialista", category: "Servizi Esterni", subcategory: "Commercialista", type: "Uscita", amount: -350.00, status: "Completato" },
  { id: "t30", date: format(subMonths(today,5), "yyyy-MM-dd"), description: "Entrata Sig.ra Colombo", category: "Pazienti", type: "Entrata", amount: 180.00, status: "Completato" },
];
