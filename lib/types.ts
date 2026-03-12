// Shared TypeScript interfaces — matches exact API contract from CLAUDE.md
// These types are used by mock-data.ts (Phase 1) and API proxy routes (Phase 3)

export interface HistoryPoint {
  date: string   // 'YYYY-MM-DD'
  zhvi: number
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
