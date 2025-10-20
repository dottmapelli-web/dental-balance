
// THIS FILE IS NOW A FALLBACK FOR INITIAL MIGRATION
// The source of truth for categories is now Firestore in the 'transactionCategories' collection.
// This data is used once to populate Firestore if it's empty.

export type ForecastType = 'Costi di Produzione' | 'Costi Produttivi';

export interface CategoryStructure {
  subcategories: string[];
  forecastType?: ForecastType;
}

export interface CategoryDefinition {
  [category: string]: CategoryStructure;
}

export const initialExpenseCategories: { [key: string]: string[] } = {
  "Spese Fisse": ["Affitto", "Spese condominiali", "Elettricità", "Rifiuti", "Internet/Telefono"],
  "Spesa Studio": ["Manutenzione", "Assicurazione", "Software Gestionale", "Licenze d’uso", "Forniture D’Ufficio"],
  "Materiali": ["Materiali di Consumo Odontoiatrico", "Materiale Conservativa", "Materiale Chirurgia", "Materiale Impianti", "Materiali Endo", "Materiale Protesi", "Materiale Ortodonzia", "Materiale Igiene", "Materiale Estetica"],
  "Personale": ["Stipendio Ilaria", "Stipendio Daniela", "Stipendio Chiara", "TFR", "Emolumento Amministratori", "Rimborso Trasferte"],
  "Compensi Medici": ["Compenso Dr. Mapelli", "Compenso Dr. Manfredi", "Compenso Dr. Rinaldi", "Compenso Dr. Crottini", "Compenso Dr. Beretta", "Compenso Dr. De Vecchi", "Compenso Dr. Gjoni"],
  "Servizi esterni": ["Lab. Baisotti", "Lab. Ennevi (Orto)", "Commercialista", "Consulente del Lavoro", "APM (DVR + aggiornamente)"],
  "Marketing e Sviluppo": ["Marketing", "Campagne Web", "Web Agency", "Regali", "Corsi e Congressi"],
  "Spese Finanziarie e Legali": ["Tasse", "Finanziamenti", "Prestiti", "Leasing", "Servizi Finanziari (Pagodil)", "Marche da Bollo", "Banca", "Obbligo di legge", "ANDI"],
  "Altre spese": ["Varie ed Eventuali"],
};

export const initialIncomeCategories: { [key: string]: string[] } = {
  "Pazienti": [],
  "Altre fonti di reddito": [],
};

// These types and constants can remain as they are still useful throughout the app
export const recurrenceFrequencies = ['Mensile', 'Bimestrale', 'Trimestrale', 'Semestrale', 'Annuale'] as const;
export type RecurrenceFrequency = typeof recurrenceFrequencies[number];

export const transactionStatuses = ['Completato', 'In Attesa', 'Pianificato'] as const;
export type TransactionStatus = typeof transactionStatuses[number];
