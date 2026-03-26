import type { HistoryPoint, PredictionResult, ForecastHorizon, BedroomPrices, ChartDataPoint } from './types'

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
  forecasts: [
    { horizon: '1m', predicted_price: 419500, predicted_change_dollars: 7500, predicted_change_pct: 1.82, direction: 'up', forecast_date: '2026-02-01' },
    { horizon: '3m', predicted_price: 425000, predicted_change_dollars: 13000, predicted_change_pct: 3.16, direction: 'up', forecast_date: '2026-04-01' },
    { horizon: '6m', predicted_price: 430000, predicted_change_dollars: 18000, predicted_change_pct: 4.37, direction: 'up', forecast_date: '2026-07-01' },
  ],
}

export const MOCK_BEDROOM_PRICES: BedroomPrices = {
  '2br': 298000,
  '3br': 412000,
  '4br': 538000,
  '5br': 695000,
}

export const MOCK_CITY = 'Farmers Branch'

// Build chart data: trim to last 3 years of history + forecast point.
// Shorter history gives the forecast more visual breathing room on the chart.
export function buildChartData(
  history: HistoryPoint[],
  prediction: PredictionResult,
): ChartDataPoint[] {
  // Trim to ~1 year of history so the forecast point gets visual prominence
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 1)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const trimmed = sorted.filter(h => h.date >= cutoffStr)
  const source = trimmed.length > 3 ? trimmed : sorted

  const historical: ChartDataPoint[] = source.map(h => ({
    date: h.date,
    zhvi: h.zhvi,
  }))

  // Bridge: last historical point also gets a forecast value to connect the dashed line
  if (historical.length > 0) {
    historical[historical.length - 1].forecast = prediction.current_price
  }

  // Plot all forecast horizons (1m, 3m, 6m) as separate points on the dashed line
  const forecasts = prediction.forecasts ?? []
  if (forecasts.length > 0) {
    for (const f of forecasts) {
      historical.push({
        date: f.forecast_date,
        forecast: f.predicted_price,
      })
    }
  } else {
    // Fallback: single forecast point (backwards compat)
    let forecastDate = prediction.forecast_date
    if (!forecastDate && source.length > 0) {
      const lastDate = source[source.length - 1].date
      const nextMonth = new Date(lastDate)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      forecastDate = nextMonth.toISOString().slice(0, 10)
    }
    forecastDate = forecastDate ?? new Date().toISOString().slice(0, 10)
    historical.push({
      date: forecastDate,
      forecast: prediction.predicted_price,
    })
  }

  return historical
}
