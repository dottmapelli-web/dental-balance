
export type ForecastItemKey = 
  // Ricavi
  | 'pazienti'
  | 'altre_fonti_reddito'
  // Costi di Produzione
  | 'materiali_uso'
  | 'laboratorio'
  | 'regali'
  | 'corsi_congressi'
  | 'campagne_web'
  // Costi Produttivi
  | 'costi_personale'
  | 'affitto_sede'
  | 'spese_condominiali'
  | 'utenze'
  | 'manutenzione'
  | 'assicurazione'
  | 'software_gestionale'
  | 'licenze_uso'
  | 'forniture_ufficio'
  | 'marketing'
  | 'apm_dvr'
  | 'web_agency'
  | 'consulenti'
  | 'tasse'
  | 'finanziamenti_prestiti_leasing'
  | 'servizi_finanziari'
  | 'marche_da_bollo'
  | 'obblighi_legge'
  | 'andi'
  | 'banca_oneri'
  | 'rimborso_trasferte'
  | 'varie_eventuali';

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
        from: Array<`total_${string}` | `margin_${string}` | ForecastItemKey>;
        subtract: Array<`total_${string}` | `margin_${string}` | ForecastItemKey>;
    }
}

export type ForecastRow = ForecastItem | HeaderRow | TotalRow | MarginRow;

export const forecastStructure: ForecastRow[] = [
  // --- RICAVI ---
  { label: 'RICAVI', type: 'header' },
  { key: 'pazienti', label: 'Pazienti', type: 'row', mappable: true, transactionCategory: 'Pazienti' },
  { key: 'altre_fonti_reddito', label: 'Altre Fonti di Reddito', type: 'row', mappable: true, transactionCategory: 'Altre fonti di reddito' },
  { label: 'TOTALE RICAVI', type: 'total', calculate: ['pazienti', 'altre_fonti_reddito'] },
  
  // --- COSTI DI PRODUZIONE ---
  { label: 'COSTI DI PRODUZIONE', type: 'header' },
  { key: 'materiali_uso', label: "Materiali d'uso", type: 'row', mappable: true, transactionCategory: 'Materiali' },
  { key: 'laboratorio', label: 'Laboratorio', type: 'row', mappable: true, transactionSubCategory: ['Lab. Baisotti', 'Lab. Ennevi (Orto)'] },
  { key: 'regali', label: 'Regali', type: 'row', mappable: true, transactionSubCategory: 'Regali' },
  { key: 'corsi_congressi', label: 'Corsi e Congressi', type: 'row', mappable: true, transactionSubCategory: 'Corsi e Congressi' },
  { key: 'campagne_web', label: 'Campagne Web', type: 'row', mappable: true, transactionSubCategory: 'Campagne Web' }, 
  { label: 'TOTALE COSTI DI PRODUZIONE', type: 'total', calculate: ['materiali_uso', 'laboratorio', 'regali', 'corsi_congressi', 'campagne_web'] },

  // --- MARGINE DI CONTRIBUZIONE ---
  { label: 'MARGINE DI CONTRIBUZIONE', type: 'margin', calculate: { from: ['total_totale_ricavi'], subtract: ['total_totale_costi_di_produzione'] } },

  // --- COSTI PRODUTTIVI ---
  { label: 'COSTI PRODUTTIVI', type: 'header' },
  { key: 'costi_personale', label: 'Costi del Personale (Compensi, Stipendi, TFR)', type: 'row', mappable: true, transactionCategory: 'Personale' },
  { key: 'affitto_sede', label: 'Affitto Sede', type: 'row', mappable: true, transactionSubCategory: 'Affitto' },
  { key: 'spese_condominiali', label: 'Spese Condominiali', type: 'row', mappable: true, transactionSubCategory: 'Spese condominiali' },
  { key: 'utenze', label: 'Utenze', type: 'row', mappable: true, transactionSubCategory: ['Elettricità', 'Rifiuti', 'Internet/Telefono'] },
  { key: 'manutenzione', label: 'Manutenzione', type: 'row', mappable: true, transactionSubCategory: 'Manutenzione' },
  { key: 'assicurazione', label: 'Assicurazione', type: 'row', mappable: true, transactionSubCategory: 'Assicurazione' },
  { key: 'software_gestionale', label: 'Software Gestionale', type: 'row', mappable: true, transactionSubCategory: 'Software Gestionale' },
  { key: 'licenze_uso', label: "Licenze d'uso", type: 'row', mappable: true, transactionSubCategory: "Licenze d’uso" },
  { key: 'forniture_ufficio', label: 'Forniture ufficio', type: 'row', mappable: true, transactionSubCategory: 'Forniture D’Ufficio' },
  { key: 'marketing', label: 'Marketing', type: 'row', mappable: true, transactionSubCategory: 'Marketing' },
  { key: 'apm_dvr', label: 'APM / DVR + aggiornamenti', type: 'row', mappable: true, transactionSubCategory: 'APM (DVR + aggiornamente)' },
  { key: 'web_agency', label: 'Web Agency', type: 'row', mappable: true, transactionSubCategory: 'Web Agency' },
  { key: 'consulenti', label: 'Commercialista/Consulenti', type: 'row', mappable: true, transactionSubCategory: ['Commercialista', 'Consulente del Lavoro'] },
  { key: 'tasse', label: 'Tasse', type: 'row', mappable: true, transactionSubCategory: 'Tasse' },
  { key: 'finanziamenti_prestiti_leasing', label: 'Finanziamenti/Prestiti/Leasing', type: 'row', mappable: true, transactionSubCategory: ['Finanziamenti', 'Prestiti', 'Leasing'] },
  { key: 'servizi_finanziari', label: 'Servizi Finanziari (Pagodil)', type: 'row', mappable: true, transactionSubCategory: 'Servizi Finanziari (Pagodil)' },
  { key: 'marche_da_bollo', label: 'Marche da bollo', type: 'row', mappable: true, transactionSubCategory: 'Marche da Bollo' },
  { key: 'obblighi_legge', label: 'Obblighi di Legge', type: 'row', mappable: true, transactionSubCategory: 'Obbligo di legge' },
  { key: 'andi', label: 'ANDI', type: 'row', mappable: true, transactionSubCategory: 'ANDI' },
  { key: 'banca_oneri', label: 'Banca e Oneri', type: 'row', mappable: true, transactionSubCategory: 'Banca' },
  { key: 'rimborso_trasferte', label: 'Rimborso Trasferte', type: 'row', mappable: true, transactionSubCategory: 'Rimborso Trasferte' },
  { key: 'varie_eventuali', label: 'Varie ed Eventuali', type: 'row', mappable: true, transactionCategory: 'Altre spese'},
  { label: 'TOTALE COSTI PRODUTTIVI', type: 'total', calculate: [
    'costi_personale', 'affitto_sede', 'spese_condominiali', 'utenze', 
    'manutenzione', 'assicurazione', 'software_gestionale', 
    'licenze_uso', 'forniture_ufficio', 'marketing', 'apm_dvr', 'web_agency', 
    'consulenti', 'tasse', 'finanziamenti_prestiti_leasing', 'servizi_finanziari', 
    'marche_da_bollo', 'obblighi_legge', 'andi', 'banca_oneri', 'rimborso_trasferte',
    'varie_eventuali'
  ] },

  // --- TOTALI FINALI ---
  { label: 'TOTALE COSTI', type: 'total', calculate: ['total_totale_costi_di_produzione', 'total_totale_costi_produttivi'] },
  { label: 'EBITDA', type: 'margin', calculate: { from: ['margin_margine_di_contribuzione'], subtract: ['total_totale_costi_produttivi'] } },
];
