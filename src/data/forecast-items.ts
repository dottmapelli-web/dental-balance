// This file is no longer the source of truth for the forecast structure.
// The structure is now dynamically generated in forecast/page.tsx based on categories
// from the CategoryContext in Firestore.
// This file can be removed or kept for reference, but it's not used by the application logic anymore.

export type ForecastItemKey = 
  // Ricavi
  | 'pazienti'
  | 'altre_fonti_reddito'
  // Spese
  | 'spese_fisse'
  | 'spesa_studio'
  | 'materiali'
  | 'personale'
  | 'servizi_esterni'
  | 'marketing_sviluppo'
  | 'spese_finanziarie_legali'
  | 'altre_spese';

export interface ForecastItem {
  key: ForecastItemKey;
  label: string;
  type: 'row';
  mappable: boolean; 
  transactionCategory?: string | string[];
  transactionSubCategory?: string | string[];
}

interface HeaderRow {
  label: string;
  type: 'header';
}

interface TotalRow {
  label: string;
  type: 'total';
  calculate: Array<`total_${string}` | `margin_${string}` | ForecastItemKey>;
}

interface MarginRow {
    label: string;
    type: 'margin';
    calculate: {
        from: Array<`total_${string}` | `margin_${string}` | ForecastItemKey>;
        subtract: Array<`total_${string}` | `margin_${string}` | ForecastItemKey>;
    }
}

export type ForecastRow = ForecastItem | HeaderRow | TotalRow | MarginRow;

// DEPRECATED: The forecast structure is now dynamic.
export const forecastStructure: ForecastRow[] = [];

    