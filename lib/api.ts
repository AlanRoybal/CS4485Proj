import type { PredictionResult, HistoryPoint, BedroomPrices } from './types'

interface ModalHorizonResult {
  horizon: string
  predicted_price: number
  predicted_change_dollars: number
  predicted_change_pct: number
  direction: 'up' | 'down'
}

interface ModalDirectionExplanation {
  confidence_label: string
  summary: string
  method: string
  predicted_change_pct: number
  model_mape_1m: number
}

interface ModalPredictResponse {
  zipcode: string
  city: string
  bedrooms: number
  current_price: number
  forecasts: ModalHorizonResult[]
  direction_1m: { direction: 'up' | 'down'; confidence: number }
  direction_explanation: ModalDirectionExplanation
  data_date: string
  forecast_date_1m: string
  forecast_date_3m: string
  forecast_date_6m: string
}

interface ModalHistoryResponse {
  zipcode: string
  bedrooms: number
  data: HistoryPoint[]
}

function getBackendUrl(): string {
  const url = process.env.MODAL_BACKEND_URL
  if (!url) throw new Error('MODAL_BACKEND_URL is not configured')
  return url
}

export async function fetchPrediction(
  zipcode: string,
  bedrooms: number,
): Promise<PredictionResult & { city: string }> {
  const res = await fetch(`${getBackendUrl()}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zipcode, bedrooms }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      res.status === 404
        ? `Zipcode ${zipcode} not found`
        : `Prediction request failed (${res.status}): ${body}`,
    )
  }

  const data: ModalPredictResponse = await res.json()
  const forecast1m = data.forecasts.find(f => f.horizon === '1m') ?? data.forecasts[0]

  const dateMap: Record<string, string> = {
    '1m': data.forecast_date_1m,
    '3m': data.forecast_date_3m,
    '6m': data.forecast_date_6m,
  }

  return {
    zipcode: data.zipcode,
    bedrooms: data.bedrooms,
    current_price: data.current_price,
    predicted_price: forecast1m.predicted_price,
    predicted_change_dollars: forecast1m.predicted_change_dollars,
    predicted_change_pct: forecast1m.predicted_change_pct,
    direction: data.direction_1m.direction,
    confidence: data.direction_1m.confidence,
    city: data.city,
    data_date: data.data_date,
    forecast_date: data.forecast_date_1m,
    forecasts: data.forecasts.map(f => ({
      horizon: f.horizon as '1m' | '3m' | '6m',
      predicted_price: f.predicted_price,
      predicted_change_dollars: f.predicted_change_dollars,
      predicted_change_pct: f.predicted_change_pct,
      direction: f.direction,
      forecast_date: dateMap[f.horizon] ?? data.forecast_date_1m,
    })),
    direction_explanation: data.direction_explanation,
  }
}

export async function fetchHistory(
  zipcode: string,
  bedrooms: number,
): Promise<HistoryPoint[]> {
  const res = await fetch(`${getBackendUrl()}/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zipcode, bedrooms }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      res.status === 404
        ? `Zipcode ${zipcode} not found`
        : `History request failed (${res.status}): ${body}`,
    )
  }

  const data: ModalHistoryResponse = await res.json()
  return data.data
}

export interface ModelInfo {
  top_drivers: { feature: string; importance: number }[]
  dataset: { zipcodes: number; data_points: number; date_range_start: string; date_range_end: string }
}

export async function fetchModelInfo(): Promise<ModelInfo | null> {
  try {
    const res = await fetch(`${getBackendUrl()}/model-info`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export interface ModelMetrics {
  [horizon: string]: { rmse: number; mae: number; mape: number }
}

export async function fetchModelMetrics(): Promise<ModelMetrics> {
  const res = await fetch(`${getBackendUrl()}/model-metrics`, { cache: 'no-store' })
  if (!res.ok) return {}
  return res.json()
}

/**
 * Fetch current median prices for all bedroom tiers (2–5) by calling
 * /predict for each. Returns the BedroomPrices map and the city name.
 */
export async function fetchBedroomPrices(
  zipcode: string,
): Promise<{ prices: BedroomPrices; city: string }> {
  const tiers = [2, 3, 4, 5] as const
  const results = await Promise.all(
    tiers.map(async (br) => {
      const res = await fetch(`${getBackendUrl()}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipcode, bedrooms: br }),
        cache: 'no-store',
      })
      if (!res.ok) return null
      const data: ModalPredictResponse = await res.json()
      return { bedrooms: br, current_price: data.current_price, city: data.city }
    }),
  )

  const prices: BedroomPrices = { '2br': 0, '3br': 0, '4br': 0, '5br': 0 }
  let city = 'Unknown'
  for (const r of results) {
    if (!r) continue
    city = r.city
    const key = `${r.bedrooms === 5 ? '5' : r.bedrooms}br` as keyof BedroomPrices
    prices[key] = r.current_price
  }

  return { prices, city }
}
