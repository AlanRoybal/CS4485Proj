import { MOCK_HISTORY, MOCK_PREDICTION, MOCK_BEDROOM_PRICES, MOCK_CITY, buildChartData } from '@/lib/mock-data'
import DashboardHeader from '@/components/DashboardHeader'
import ForecastCallout from '@/components/ForecastCallout'
import PriceChart from '@/components/PriceChart'
import ConfidenceGauge from '@/components/ConfidenceGauge'
import BedroomCards from '@/components/BedroomCards'

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ zipcode: string }>
  searchParams: Promise<{ bedrooms?: string }>
}) {
  const { zipcode } = await params
  const { bedrooms: bedroomsStr } = await searchParams
  const bedrooms = parseInt(bedroomsStr ?? '3', 10)

  // Phase 1: use mock data.
  // Phase 3: replace with fetch('/api/predict', {...}) and fetch('/api/history', {...})
  const prediction = MOCK_PREDICTION
  const history = MOCK_HISTORY
  const bedroomPrices = MOCK_BEDROOM_PRICES
  const city = MOCK_CITY

  // Build chart data (historical + forecast extension point)
  const chartData = buildChartData(history, prediction)

  // Compute YoY change from history data
  // Find current price (most recent) and price 12 months ago
  const sortedHistory = [...history].sort((a, b) => a.date.localeCompare(b.date))
  const currentPrice = sortedHistory[sortedHistory.length - 1]?.zhvi ?? prediction.current_price
  const twelveMonthsAgo = sortedHistory[sortedHistory.length - 13]?.zhvi ?? currentPrice
  const yoyChange = twelveMonthsAgo > 0
    ? ((currentPrice - twelveMonthsAgo) / twelveMonthsAgo) * 100
    : 0

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Card grid layout */}
      <div className="grid grid-cols-1 gap-6">

        {/* 1. Header card — full width */}
        <DashboardHeader
          zipcode={zipcode}
          city={city}
          bedrooms={bedrooms}
          currentPrice={currentPrice}
          yoyChange={yoyChange}
        />

        {/* 2. Historical price chart — full width */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">5-Year Price History</h2>
          <PriceChart data={chartData} height={350} />
        </div>

        {/* 3 & 4. Forecast callout + Confidence gauge — side by side on lg screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ForecastCallout
            predictedPrice={prediction.predicted_price}
            currentPrice={prediction.current_price}
            changeDollars={prediction.predicted_change_dollars}
            changePct={prediction.predicted_change_pct}
            direction={prediction.direction}
          />
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 self-start">Direction Signal</h2>
            <ConfidenceGauge
              direction={prediction.direction}
              confidence={prediction.confidence}
            />
          </div>
        </div>

        {/* 5. Bedroom breakdown — full width */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bedroom Price Breakdown</h2>
          <BedroomCards prices={bedroomPrices} selectedBedrooms={bedrooms} />
        </div>

      </div>
    </main>
  )
}
