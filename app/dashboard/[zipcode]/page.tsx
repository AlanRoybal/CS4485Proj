import { fetchPrediction, fetchHistory, fetchBedroomPrices, fetchModelMetrics, fetchBacktest, fetchZipcodeProfile } from '@/lib/api'
import type { BacktestResult, ZipcodeProfileResult } from '@/lib/api'
import { buildChartData } from '@/lib/mock-data'
import DashboardHeader from '@/components/DashboardHeader'

export const dynamic = 'force-dynamic'
import ForecastTimeline from '@/components/ForecastTimeline'
import PriceChart from '@/components/PriceChart'
import ConfidenceGauge from '@/components/ConfidenceGauge'
import BedroomCards from '@/components/BedroomCards'
import MarketMomentum from '@/components/MarketMomentum'
import BacktestChart from '@/components/BacktestChart'
import ZipcodeProfile from '@/components/ZipcodeProfile'
import DashboardMap from '@/components/DashboardMap'
import MortgageRateContext from '@/components/MortgageRateContext'
import BathroomImpact from '@/components/BathroomImpact'
import { notFound } from 'next/navigation'

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ zipcode: string }>
  searchParams: Promise<{ bedrooms?: string; bathrooms?: string }>
}) {
  const { zipcode } = await params
  const { bedrooms: bedroomsStr, bathrooms: bathroomsStr } = await searchParams
  const bedrooms = parseInt(bedroomsStr ?? '3', 10)
  const bathrooms = parseInt(bathroomsStr ?? '2', 10)

  let prediction: Awaited<ReturnType<typeof fetchPrediction>>
  let history: Awaited<ReturnType<typeof fetchHistory>>
  let bedroomData: Awaited<ReturnType<typeof fetchBedroomPrices>>
  let modelMetrics: Awaited<ReturnType<typeof fetchModelMetrics>>
  let backtestData: BacktestResult | null
  let zipcodeProfileData: ZipcodeProfileResult | null

  try {
    ;[prediction, history, bedroomData, modelMetrics, backtestData, zipcodeProfileData] = await Promise.all([
      fetchPrediction(zipcode, bedrooms, bathrooms),
      fetchHistory(zipcode, bedrooms, bathrooms),
      fetchBedroomPrices(zipcode, bathrooms),
      fetchModelMetrics(),
      fetchBacktest(zipcode, bedrooms, bathrooms),
      fetchZipcodeProfile(zipcode, bedrooms, bathrooms),
    ])
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('not found')) notFound()
    throw err
  }

  const { prices: bedroomPrices, city } = bedroomData

  // Align history to the prediction's snapshot so every "current price" on the
  // page comes from the same source. /history can have points newer than
  // latest_data.pkl; trimming keeps the chart, momentum, and YoY consistent
  // with prediction.current_price.
  const sortedHistory = [...history].sort((a, b) => a.date.localeCompare(b.date))
  const alignedHistory = prediction.data_date
    ? sortedHistory.filter(p => p.date <= prediction.data_date!)
    : sortedHistory

  const chartData = buildChartData(alignedHistory, prediction)

  const currentPrice = prediction.current_price
  const twelveMonthsAgo = alignedHistory[alignedHistory.length - 13]?.zhvi ?? currentPrice
  const yoyChange = twelveMonthsAgo > 0
    ? ((currentPrice - twelveMonthsAgo) / twelveMonthsAgo) * 100
    : 0

  // Market momentum: compute 3m, 6m, 12m price changes from history
  const momentumPeriods = [
    { label: '3 Months', months: 3 },
    { label: '6 Months', months: 6 },
    { label: '12 Months', months: 12 },
  ].map(({ label, months }) => {
    const pastPrice = alignedHistory[alignedHistory.length - 1 - months]?.zhvi
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
              bathrooms={bathrooms}
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
                modelMetrics={modelMetrics}
              />
            </section>

            {/* Bathroom Impact */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px w-5 bg-teal-800" />
                <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-800">
                  Bathroom Impact
                </h2>
              </div>
              <BathroomImpact
                bedrooms={bedrooms}
                bathrooms={bathrooms}
                currentPrice={currentPrice}
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

            {/* Mortgage Rate Context */}
            {prediction.current_mortgage_rate != null && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px w-5 bg-teal-800" />
                  <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-800">
                    Rate Environment
                  </h2>
                </div>
                <MortgageRateContext
                  rate={prediction.current_mortgage_rate}
                  dataDate={prediction.data_date}
                />
              </section>
            )}

            {/* Your Zipcode's Profile */}
            {zipcodeProfileData && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px w-5 bg-teal-800" />
                  <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-800">
                    Your Zipcode&apos;s Profile
                  </h2>
                </div>
                <ZipcodeProfile profile={zipcodeProfileData} />
              </section>
            )}

            {/* How Accurate Have We Been? */}
            {backtestData && backtestData.data.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px w-5 bg-teal-800" />
                  <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-800">
                    How Accurate Have We Been?
                  </h2>
                </div>
                <BacktestChart backtest={backtestData} />
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
                <BedroomCards prices={bedroomPrices} selectedBedrooms={bedrooms} bathrooms={bathrooms} />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
