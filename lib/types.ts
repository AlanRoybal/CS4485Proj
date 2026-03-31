// Shared TypeScript interfaces — matches exact API contract from CLAUDE.md
// These types are used by mock-data.ts (Phase 1) and API proxy routes (Phase 3)

export interface HistoryPoint {
  date: string   // 'YYYY-MM-DD'
  zhvi: number
}

export interface ForecastHorizon {
  horizon: '1m' | '3m' | '6m'
  predicted_price: number
  predicted_change_dollars: number
  predicted_change_pct: number
  direction: 'up' | 'down'
  forecast_date: string       // YYYY-MM-DD
}

export interface DirectionExplanation {
  confidence_label: string       // "Slight lean" | "Moderate" | "Strong" | "Very strong"
  summary: string                // Plain-English explanation
  method: string                 // How direction + confidence are computed
  predicted_change_pct: number   // Raw predicted 1m change %
  model_mape_1m: number          // XGBoost 1-month MAPE
}

export interface PredictionResult {
  zipcode: string
  bedrooms: number
  predicted_price: number
  direction: 'up' | 'down'
  confidence: number          // 0–1
  current_price: number
  predicted_change_dollars: number
  predicted_change_pct: number
  data_date?: string          // YYYY-MM-DD — latest data point date
  forecast_date?: string      // YYYY-MM-DD — 1-month forecast target date
  forecasts: ForecastHorizon[]  // all horizons (1m, 3m, 6m)
  direction_explanation?: DirectionExplanation
}

export interface BedroomPrices {
  '2br': number
  '3br': number
  '4br': number
  '5br': number
}

// Shape of a single chart data point (historical + optional forecast extension)
export interface ChartDataPoint {
  date: string
  zhvi?: number        // undefined on the forecast-only point
  forecast?: number    // defined only on the forecast extension point
}
