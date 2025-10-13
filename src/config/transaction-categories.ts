
export const expenseCategories = {
  "Spese Fisse": ["Affitto", "Spese condominiali", "Elettricità", "Rifiuti", "Internet/Telefono"],
  "Spesa Studio": ["Manutenzione", "Assicurazione", "Software Gestionale", "Licenze d’uso", "Forniture D’Ufficio"],
  "Materiali": ["Materiali di Consumo Odontoiatrico", "Materiale Conservativa", "Materiale Chirurgia", "Materiale Impianti", "Materiali Endo", "Materiale Protesi", "Materiale Ortodonzia", "Materiale Igiene", "Materiale Estetica"],
  "Personale": ["Stipendio Ilaria", "Stipendio Daniela", "Compenso Chiara", "Compenso Dr. Mapelli", "Compenso Dr. Manfredi", "Compenso Dr. Rinaldi", "Compenso Dr. Crottini", "Compenso Dr. Beretta", "Compenso Dr. De Vecchi", "Compenso Dr. Gjoni", "TFR", "Emolumento Amministratori", "Rimborso Trasferte"],
  "Servizi esterni": ["Lab. Baisotti", "Lab. Ennevi (Orto)", "Commercialista", "Consulente del Lavoro", "APM (DVR + aggiornamente)"],
  "Marketing e Sviluppo": ["Marketing", "Campagne Web", "Web Agency", "Regali", "Corsi e Congressi"],
  "Spese Finanziarie e Legali": ["Tasse", "Finanziamenti", "Prestiti", "Leasing", "Servizi Finanziari (Pagodil)", "Marche da Bollo", "Banca", "Obbligo di legge", "ANDI"],
  "Altre spese": ["Varie ed Eventuali"],
};

export const incomeCategories = {
  "Pazienti": [],
  "Altre fonti di reddito": [],
};

export type ExpenseCategory = keyof typeof expenseCategories;
export type IncomeCategory = keyof typeof incomeCategories;

export const allExpenseCategories = Object.keys(expenseCategories) as ExpenseCategory[];
export const allIncomeCategories = Object.keys(incomeCategories) as IncomeCategory[];

export const getSubcategories = (type: 'Entrata' | 'Uscita', category: string): string[] => {
  if (type === 'Uscita') {
    return expenseCategories[category as ExpenseCategory] || [];
  }
  if (type === 'Entrata') {
    // Per le entrate, le sottocategorie potrebbero non essere necessarie, ma restituiamo un array vuoto
    return incomeCategories[category as IncomeCategory] || [];
  }
  return [];
};

export const recurrenceFrequencies = ['Mensile', 'Bimestrale', 'Trimestrale', 'Semestrale', 'Annuale'] as const;
export type RecurrenceFrequency = typeof recurrenceFrequencies[number];

export const transactionStatuses = ['Completato', 'In Attesa', 'Pianificato'] as const;
export type TransactionStatus = typeof transactionStatuses[number];
