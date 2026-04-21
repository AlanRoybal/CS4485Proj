import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { ForecastHorizon } from '@/lib/types'
import type { ModelMetrics } from '@/lib/api'

interface Props {
  forecasts: ForecastHorizon[]
  currentPrice: number
  modelMetrics?: ModelMetrics
}

const HORIZON_LABELS: Record<string, string> = {
  '1m': '1 Month',
  '3m': '3 Months',
  '6m': '6 Months',
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(
    new Date(dateStr + 'T12:00:00'),
  )
}

export default function ForecastTimeline({ forecasts, currentPrice, modelMetrics }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {forecasts.map((f) => {
        const isUp = f.direction === 'up'
        const mape = modelMetrics?.[f.horizon]?.mape
        const rangeLow = mape != null ? f.predicted_price * (1 - mape / 100) : null
        const rangeHigh = mape != null ? f.predicted_price * (1 + mape / 100) : null

        // If the predicted change is smaller than the model's typical error
        // (MAPE), the direction is noise. Show a flat/neutral card instead of
        // a confident up/down signal.
        const absPct = Math.abs(f.predicted_change_pct)
        const isFlat = mape != null && absPct < mape

        const cardClass = isFlat
          ? 'border-gray-200 bg-gray-50/60'
          : isUp
          ? 'border-emerald-200 bg-emerald-50/50'
          : 'border-red-200 bg-red-50/50'

        const changeColor = isFlat
          ? 'text-gray-500'
          : isUp
          ? 'text-emerald-700'
          : 'text-red-600'

        const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown
        const signDollars = isFlat ? '' : isUp ? '+' : ''
        const signPct = isFlat ? '' : isUp ? '+' : ''

        return (
          <div
            key={f.horizon}
            className={`rounded border p-5 ${cardClass}`}
          >
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400 mb-2">
              {HORIZON_LABELS[f.horizon] ?? f.horizon}
            </p>
            <p className="font-serif text-2xl text-gray-950 mb-1">
              {formatPrice(f.predicted_price)}
            </p>
            {rangeLow != null && rangeHigh != null && (
              <p className="text-[10px] text-gray-400 mb-2">
                Expected range: {formatPrice(rangeLow)} – {formatPrice(rangeHigh)}
              </p>
            )}
            <div className={`flex items-center gap-1.5 text-sm font-semibold ${changeColor}`}>
              <Icon size={14} aria-hidden="true" />
              <span>
                {signDollars}{formatPrice(f.predicted_change_dollars)} ({signPct}{f.predicted_change_pct.toFixed(2)}%)
              </span>
            </div>
            {isFlat && (
              <p className="text-[10px] text-gray-500 italic mt-1.5">
                Within margin of error &mdash; roughly flat signal
              </p>
            )}
            <p className="text-[10px] text-gray-400 mt-2">
              {formatDate(f.forecast_date)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
