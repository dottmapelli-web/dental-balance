
export type ForecastItemKey = 
  // Ricavi
  | 'pazienti'
  // Costi di Produzione
  | 'compensi_collaboratori'
  | 'spese_materiali'
  | 'spese_riparazioni'
  | 'marketing'
  // Costi Produttivi
  | 'stipendio_personale'
  | 'tfr_personale'
  | 'affitto'
  | 'marketing_fisso'
  | 'auto'
  | 'commercialista'
  | 'bollette'
  | 'compenso_amministratore'
  | 'bolli_diritti'
  | 'laboratorio'
  | 'oneri_bancari'
  | 'internet'
  | 'assicurazione'
  | 'altro_produttivo'; // Voce generica per categorie non mappate direttamente

export interface ForecastItem {
  key: ForecastItemKey;
  label: string;
  type: 'row';
  mappable: boolean; // Indica se questa riga può essere mappata direttamente da categorie di transazione
  transactionCategory?: string | string[]; // Categoria/e di transazione di `expenseCategories` o `incomeCategories`
  transactionSubCategory?: string | string[]; // Sottocategoria/e di transazione
}

interface HeaderRow {
  label: string;
  type: 'header';
}

interface TotalRow {
  label: string;
  type: 'total';
  // `calculate` definisce quali chiavi di `ForecastItem` o altri totali compongono questo totale.
  // I totali usano il prefisso `total_`. I margini `margin_`.
  calculate: Array<`total_${string}` | `margin_${string}` | ForecastItemKey>;
}

interface MarginRow {
    label: string;
    type: 'margin';
    // Calcola il margine. `from` è l'array di chiavi da cui partire (somma), `subtract` è l'array da sottrarre.
    calculate: {
        from: Array<`total_${string}` | ForecastItemKey>;
        subtract: Array<`total_${string}` | ForecastItemKey>;
    }
}

export type ForecastRow = ForecastItem | HeaderRow | TotalRow | MarginRow;

export const forecastStructure: ForecastRow[] = [
  // --- RICAVI ---
  { label: 'RICAVI', type: 'header' },
  { key: 'pazienti', label: 'Pazienti', type: 'row', mappable: true, transactionCategory: 'Pazienti' },
  { label: 'TOTALE RICAVI', type: 'total', calculate: ['pazienti'] },
  
  // --- COSTI DI PRODUZIONE ---
  { label: 'COSTI DI PRODUZIONE', type: 'header' },
  { key: 'compensi_collaboratori', label: 'Compensi collaboratori', type: 'row', mappable: true, transactionSubCategory: ['Compenso Chiara', 'Compenso Dr. Mapelli', 'Compenso Dr. Manfredi', 'Compenso Dr. Rinaldi', 'Compenso Dr. Crottini', 'Compenso Dr. Beretta', 'Compenso Dr. De Vecchi', 'Compenso Dr. Gjoni'] },
  { key: 'spese_materiali', label: 'Spese materiali', type: 'row', mappable: true, transactionCategory: 'Materiali' },
  { key: 'spese_riparazioni', label: 'Spese di riparazioni', type: 'row', mappable: true, transactionSubCategory: 'Manutenzione' },
  { key: 'marketing', label: 'Marketing', type: 'row', mappable: true, transactionSubCategory: 'Marketing' }, // Questo potrebbe sovrapporsi con 'marketing_fisso'
  { label: 'TOTALI COSTI DI PRODUZIONE', type: 'total', calculate: ['compensi_collaboratori', 'spese_materiali', 'spese_riparazioni', 'marketing'] },

  // --- MARGINE DI CONTRIBUZIONE ---
  { label: 'MARGINE DI CONTRIBUZIONE', type: 'margin', calculate: { from: ['total_totale_ricavi'], subtract: ['total_totali_costi_di_produzione'] } },

  // --- COSTI PRODUTTIVI ---
  { label: 'COSTI PRODUTTIVI', type: 'header' },
  { key: 'stipendio_personale', label: 'Stipendio personale', type: 'row', mappable: true, transactionSubCategory: ['Stipendio Ilaria', 'Stipendio Daniela'] },
  { key: 'tfr_personale', label: 'Tfr personale', type: 'row', mappable: false }, // Non mappabile da transazioni
  { key: 'affitto', label: 'Affitto', type: 'row', mappable: true, transactionSubCategory: 'Affitto' },
  { key: 'marketing_fisso', label: 'Marketing fisso', type: 'row', mappable: true, transactionCategory: 'Marketing' }, // Usa la categoria generale
  { key: 'auto', label: 'Auto', type: 'row', mappable: true, transactionCategory: 'Altre spese' }, // Mappatura ipotetica
  { key: 'commercialista', label: 'Commercialista/altri professionisti', type: 'row', mappable: true, transactionSubCategory: ['Commercialista', 'Consulente del Lavoro'] },
  { key: 'bollette', label: 'Bollette', type: 'row', mappable: true, transactionSubCategory: ['Elettricità', 'Spese condominiali'] },
  { key: 'compenso_amministratore', label: 'Compenso Amministratore', type: 'row', mappable: false }, // Non mappabile
  { key: 'bolli_diritti', label: 'Bolli e diritti', type: 'row', mappable: true, transactionSubCategory: 'Marche da Bollo' },
  { key: 'laboratorio', label: 'Laboratorio', type: 'row', mappable: true, transactionSubCategory: ['Lab. Baisotti', 'Lab. Ennevi (Orto)'] },
  { key: 'oneri_bancari', label: 'Oneri Bancari', type: 'row', mappable: true, transactionSubCategory: 'Banca' },
  { key: 'internet', label: 'Internet', type: 'row', mappable: true, transactionSubCategory: 'Internet/Telefono' },
  { key: 'assicurazione', label: 'Assicurazione', type: 'row', mappable: true, transactionSubCategory: 'Assicurazione' },
  { key: 'altro_produttivo', label: 'Altro Produttivo', type: 'row', mappable: false }, // Non mappabile
  { label: 'TOTALE COSTI PRODUTTIVI', type: 'total', calculate: ['stipendio_personale', 'tfr_personale', 'affitto', 'marketing_fisso', 'auto', 'commercialista', 'bollette', 'compenso_amministratore', 'bolli_diritti', 'laboratorio', 'oneri_bancari', 'internet', 'assicurazione', 'altro_produttivo'] },

  // --- TOTALI FINALI ---
  { label: 'TOTALE COSTI', type: 'total', calculate: ['total_totali_costi_di_produzione', 'total_totale_costi_produttivi'] },
  { label: 'EBITDA', type: 'margin', calculate: { from: ['margin_margine_di_contribuzione'], subtract: ['total_totale_costi_produttivi'] } },
];
