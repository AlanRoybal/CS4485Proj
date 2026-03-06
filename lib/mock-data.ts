import type { HistoryPoint, PredictionResult, BedroomPrices, ChartDataPoint } from './types'

export const MOCK_HISTORY: HistoryPoint[] = [
  { date: '2019-01-01', zhvi: 298000 },
  { date: '2019-04-01', zhvi: 304000 },
  { date: '2019-07-01', zhvi: 310000 },
  { date: '2019-10-01', zhvi: 313000 },
  { date: '2020-01-01', zhvi: 318000 },
  { date: '2020-04-01', zhvi: 322000 },
  { date: '2020-07-01', zhvi: 335000 },
  { date: '2020-10-01', zhvi: 348000 },
  { date: '2021-01-01', zhvi: 360000 },
  { date: '2021-04-01', zhvi: 378000 },
  { date: '2021-07-01', zhvi: 392000 },
  { date: '2021-10-01', zhvi: 408000 },
  { date: '2022-01-01', zhvi: 418000 },
  { date: '2022-04-01', zhvi: 426000 },
  { date: '2022-07-01', zhvi: 430000 },
  { date: '2022-10-01', zhvi: 421000 },
  { date: '2023-01-01', zhvi: 410000 },
  { date: '2023-04-01', zhvi: 402000 },
  { date: '2023-07-01', zhvi: 398000 },
  { date: '2023-10-01', zhvi: 393000 },
  { date: '2024-01-01', zhvi: 388000 },
  { date: '2024-04-01', zhvi: 391000 },
  { date: '2024-07-01', zhvi: 396000 },
  { date: '2024-10-01', zhvi: 401000 },
  { date: '2025-01-01', zhvi: 404000 },
  { date: '2025-04-01', zhvi: 407000 },
  { date: '2025-07-01', zhvi: 410000 },
  { date: '2025-10-01', zhvi: 413000 },
  { date: '2026-01-01', zhvi: 412000 },
]

export const MOCK_PREDICTION: PredictionResult = {
  zipcode: '75252',
  bedrooms: 3,
  predicted_price: 419500,
  direction: 'up',
  confidence: 0.73,
  current_price: 412000,
  predicted_change_dollars: 7500,
  predicted_change_pct: 1.82,
}

export const MOCK_BEDROOM_PRICES: BedroomPrices = {
  '2br': 298000,
  '3br': 412000,
  '4br': 538000,
  '5br': 695000,
}

export const MOCK_CITY = 'Farmers Branch'

// Pre-built chart data: historical points + forecast extension point
// Used by PriceChart component in Phase 1. Phase 3 replaces with API data.
export function buildChartData(
  history: HistoryPoint[],
  prediction: PredictionResult,
): ChartDataPoint[] {
  const historical: ChartDataPoint[] = history.map(h => ({
    date: h.date,
    zhvi: h.zhvi,
  }))

  // Forecast extension: last historical point bridges to forecast dot
  // The last historical point gets a forecast value too (connects the dotted line)
  if (historical.length > 0) {
    historical[historical.length - 1].forecast = prediction.current_price
  }

  // Add the next-month forecast point (2026-02-01 for current mock)
  historical.push({
    date: '2026-02-01',
    forecast: prediction.predicted_price,
  })

  return historical
}
