import { TrendingUp, TrendingDown } from 'lucide-react'
import type { ForecastHorizon } from '@/lib/types'

interface Props {
  forecasts: ForecastHorizon[]
  currentPrice: number
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

export default function ForecastTimeline({ forecasts, currentPrice }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {forecasts.map((f) => {
        const isUp = f.direction === 'up'
        return (
          <div
            key={f.horizon}
            className={`rounded border p-5 ${
              isUp
                ? 'border-emerald-200 bg-emerald-50/50'
                : 'border-red-200 bg-red-50/50'
            }`}
          >
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400 mb-2">
              {HORIZON_LABELS[f.horizon] ?? f.horizon}
            </p>
            <p className="font-serif text-2xl text-gray-950 mb-2">
              {formatPrice(f.predicted_price)}
            </p>
            <div className={`flex items-center gap-1.5 text-sm font-semibold ${
              isUp ? 'text-emerald-700' : 'text-red-600'
            }`}>
              {isUp
                ? <TrendingUp size={14} aria-hidden="true" />
                : <TrendingDown size={14} aria-hidden="true" />}
              <span>
                {isUp ? '+' : ''}{formatPrice(f.predicted_change_dollars)} ({isUp ? '+' : ''}{f.predicted_change_pct.toFixed(2)}%)
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              {formatDate(f.forecast_date)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
