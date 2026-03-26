import { fetchPrediction, fetchHistory, fetchBedroomPrices, fetchModelMetrics, fetchModelInfo } from '@/lib/api'
import { buildChartData } from '@/lib/mock-data'
import DashboardHeader from '@/components/DashboardHeader'

export const dynamic = 'force-dynamic'
import ForecastTimeline from '@/components/ForecastTimeline'
import PriceChart from '@/components/PriceChart'
import ConfidenceGauge from '@/components/ConfidenceGauge'
import BedroomCards from '@/components/BedroomCards'
import MarketMomentum from '@/components/MarketMomentum'
import ModelAccuracy from '@/components/ModelAccuracy'
import ModelInsights from '@/components/ModelInsights'
import DashboardMap from '@/components/DashboardMap'
import { notFound } from 'next/navigation'

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

  let prediction: Awaited<ReturnType<typeof fetchPrediction>>
  let history: Awaited<ReturnType<typeof fetchHistory>>
  let bedroomData: Awaited<ReturnType<typeof fetchBedroomPrices>>
  let modelMetrics: Awaited<ReturnType<typeof fetchModelMetrics>>
  let modelInfo: Awaited<ReturnType<typeof fetchModelInfo>>

  try {
    ;[prediction, history, bedroomData, modelMetrics, modelInfo] = await Promise.all([
      fetchPrediction(zipcode, bedrooms),
      fetchHistory(zipcode, bedrooms),
      fetchBedroomPrices(zipcode),
      fetchModelMetrics(),
      fetchModelInfo(),
    ])
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('not found')) notFound()
    throw err
  }

  const { prices: bedroomPrices, city } = bedroomData
  const chartData = buildChartData(history, prediction)

  const sortedHistory = [...history].sort((a, b) => a.date.localeCompare(b.date))
  const currentPrice = sortedHistory[sortedHistory.length - 1]?.zhvi ?? prediction.current_price
  const twelveMonthsAgo = sortedHistory[sortedHistory.length - 13]?.zhvi ?? currentPrice
  const yoyChange = twelveMonthsAgo > 0
    ? ((currentPrice - twelveMonthsAgo) / twelveMonthsAgo) * 100
    : 0

  // Market momentum: compute 3m, 6m, 12m price changes from history
  const momentumPeriods = [
    { label: '3 Months', months: 3 },
    { label: '6 Months', months: 6 },
    { label: '12 Months', months: 12 },
  ].map(({ label, months }) => {
    const pastPrice = sortedHistory[sortedHistory.length - 1 - months]?.zhvi
    const pct = pastPrice && pastPrice > 0
      ? ((currentPrice - pastPrice) / pastPrice) * 100
      : 0
    return { label, pct }
  })

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
                  12-Month Trend &amp; Forecast
                </h2>
              </div>
              <div className="bg-white rounded border border-gray-200/80 p-6">
                <PriceChart data={chartData} height={360} />
              </div>
            </section>

            {/* Price Forecasts (1m, 3m, 6m) */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px w-5 bg-teal-800" />
                <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-800">
                  Price Forecasts
                </h2>
              </div>
              <ForecastTimeline
                forecasts={prediction.forecasts}
                currentPrice={prediction.current_price}
              />
            </section>

            {/* Direction Signal */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px w-5 bg-teal-800" />
                <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-800">
                  Direction Signal
                </h2>
              </div>
              <ConfidenceGauge
                direction={prediction.direction}
                confidence={prediction.confidence}
                explanation={prediction.direction_explanation}
                momentumPeriods={momentumPeriods}
              />
            </section>

            {/* Model Accuracy */}
            {modelMetrics && Object.keys(modelMetrics).length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px w-5 bg-teal-800" />
                  <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-800">
                    Model Accuracy
                  </h2>
                </div>
                <ModelAccuracy metrics={modelMetrics} />
              </section>
            )}

            {/* How We Predict */}
            {modelInfo && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px w-5 bg-teal-800" />
                  <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-800">
                    How We Predict
                  </h2>
                </div>
                <ModelInsights info={modelInfo} />
              </section>
            )}
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

              {/* Market momentum */}
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400 mb-3">
                  Market Momentum
                </p>
                <MarketMomentum periods={momentumPeriods} />
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
