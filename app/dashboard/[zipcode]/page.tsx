import { MOCK_HISTORY, MOCK_PREDICTION, MOCK_BEDROOM_PRICES, MOCK_CITY, buildChartData } from '@/lib/mock-data'
import DashboardHeader from '@/components/DashboardHeader'
import ForecastCallout from '@/components/ForecastCallout'
import PriceChart from '@/components/PriceChart'
import ConfidenceGauge from '@/components/ConfidenceGauge'
import BedroomCards from '@/components/BedroomCards'
import DashboardMap from '@/components/DashboardMap'

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
  const sortedHistory = [...history].sort((a, b) => a.date.localeCompare(b.date))
  const currentPrice = sortedHistory[sortedHistory.length - 1]?.zhvi ?? prediction.current_price
  const twelveMonthsAgo = sortedHistory[sortedHistory.length - 13]?.zhvi ?? currentPrice
  const yoyChange = twelveMonthsAgo > 0
    ? ((currentPrice - twelveMonthsAgo) / twelveMonthsAgo) * 100
    : 0

  return (
    <main className="min-h-[calc(100dvh-56px)]">
      <div className="flex flex-col lg:flex-row">
        {/* Left content — Charts + Analysis */}
        <div className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-6 lg:px-10 py-8 space-y-8">
            {/* Page header */}
            <DashboardHeader
              zipcode={zipcode}
              city={city}
              bedrooms={bedrooms}
              currentPrice={currentPrice}
              yoyChange={yoyChange}
            />

            {/* Price chart */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px w-5 bg-teal-800" />
                <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-800">
                  5-Year Price History
                </h2>
              </div>
              <div className="bg-white rounded border border-gray-200/80 p-6">
                <PriceChart data={chartData} height={360} />
              </div>
            </section>

            {/* Forecast + Confidence */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px w-5 bg-teal-800" />
                  <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-800">
                    1-Month Forecast
                  </h2>
                </div>
                <ForecastCallout
                  predictedPrice={prediction.predicted_price}
                  currentPrice={prediction.current_price}
                  changeDollars={prediction.predicted_change_dollars}
                  changePct={prediction.predicted_change_pct}
                  direction={prediction.direction}
                />
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px w-5 bg-teal-800" />
                  <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-800">
                    Direction Signal
                  </h2>
                </div>
                <div className="bg-white rounded border border-gray-200/80 p-6 flex flex-col items-center justify-center h-[calc(100%-2rem)]">
                  <ConfidenceGauge
                    direction={prediction.direction}
                    confidence={prediction.confidence}
                  />
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Right sidebar — Map + Location Info */}
        <aside className="w-full lg:w-[380px] xl:w-[420px] shrink-0 lg:sticky lg:top-14 lg:h-[calc(100dvh-56px)] bg-white border-t lg:border-t-0 lg:border-l border-gray-200/60">
          <div className="flex flex-col h-full">
            {/* Map */}
            <DashboardMap
              zipcode={zipcode}
              className="h-[280px] lg:h-[320px] w-full"
            />

            {/* Location info panel */}
            <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto">
              {/* Location header */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-px w-5 bg-teal-800" />
                  <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-teal-800">
                    Location
                  </span>
                </div>
                <h2 className="font-serif text-2xl text-gray-950">{city}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{zipcode}</p>
              </div>

              {/* Quick stats */}
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400 mb-1">
                    Current Median
                  </p>
                  <p className="text-2xl font-serif text-gray-950">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(currentPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400 mb-1">
                    Year-over-Year
                  </p>
                  <p className={`text-lg font-semibold ${yoyChange >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {yoyChange >= 0 ? '+' : ''}{yoyChange.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Bedroom cards */}
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400 mb-3">
                  By Bedroom Count
                </p>
                <BedroomCards prices={bedroomPrices} selectedBedrooms={bedrooms} />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
