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

// Build chart data: trim to last ~1 year of history + fill gap months + forecast.
// If actual data exists for months between the last data point and the forecast,
// those months appear as solid historical line. Otherwise, linearly interpolated
// estimates fill the gap as a dashed forecast line.
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

  // Determine the target forecast point
  const forecasts = prediction.forecasts ?? []
  const forecast1m = forecasts.find(f => f.horizon === '1m')

  let forecastDate: string
  let forecastPrice: number

  if (forecast1m) {
    forecastDate = forecast1m.forecast_date
    forecastPrice = forecast1m.predicted_price
  } else {
    forecastDate = prediction.forecast_date ?? new Date().toISOString().slice(0, 10)
    forecastPrice = prediction.predicted_price
  }

  // Fill gap months between the last historical point and the forecast
  // with interpolated zhvi values so they render as part of the solid line.
  // Uses pure year/month arithmetic to avoid JS Date setMonth rollover bugs
  // (e.g. March 31 + 1 month = May 1 because April 31 doesn't exist).
  if (historical.length > 0) {
    const lastHist = historical[historical.length - 1]
    const lastHistDate = new Date(lastHist.date + 'T12:00:00')
    const forecastDateObj = new Date(forecastDate + 'T12:00:00')
    const lastHistPrice = lastHist.zhvi ?? prediction.current_price

    const baseMonth = lastHistDate.getMonth()   // 0-indexed
    const baseYear = lastHistDate.getFullYear()
    const monthsDiff =
      (forecastDateObj.getFullYear() - baseYear) * 12 +
      (forecastDateObj.getMonth() - baseMonth)

    if (monthsDiff > 1) {
      for (let i = 1; i < monthsDiff; i++) {
        const m = (baseMonth + i) % 12
        const y = baseYear + Math.floor((baseMonth + i) / 12)
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-01`

        const t = i / monthsDiff
        const interpPrice = Math.round((lastHistPrice + t * (forecastPrice - lastHistPrice)) * 100) / 100

        historical.push({ date: dateStr, zhvi: interpPrice })
      }
    }
  }

  // Bridge: the last solid-line point also gets a forecast value so the
  // dashed forecast line connects seamlessly from it.
  if (historical.length > 0) {
    historical[historical.length - 1].forecast =
      historical[historical.length - 1].zhvi ?? prediction.current_price
  }

  // Final forecast point (the 1-month prediction endpoint with label)
  historical.push({
    date: forecastDate,
    forecast: forecastPrice,
  })

  return historical
}
