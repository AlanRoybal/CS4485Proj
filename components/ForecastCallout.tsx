import { TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  predictedPrice: number
  currentPrice: number
  changeDollars: number
  changePct: number
  direction: 'up' | 'down'
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function ForecastCallout({ predictedPrice, changeDollars, changePct, direction }: Props) {
  const isUp = direction === 'up'
  const colorClass = isUp ? 'text-green-600' : 'text-red-600'
  const bgClass = isUp ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'

  return (
    <div className={`rounded-xl border-2 p-6 ${bgClass}`}>
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
        1-Month Price Forecast
      </p>
      <p className="text-4xl font-bold text-gray-900 mb-3">
        {formatPrice(predictedPrice)}
      </p>
      <div className={`flex items-center gap-2 text-sm font-semibold ${colorClass}`}>
        {isUp
          ? <TrendingUp size={16} aria-hidden="true" />
          : <TrendingDown size={16} aria-hidden="true" />}
        <span>
          {isUp ? '+' : ''}{formatPrice(changeDollars)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%) next month
        </span>
      </div>
    </div>
  )
}
