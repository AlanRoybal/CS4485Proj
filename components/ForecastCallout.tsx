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

  return (
    <div className={`rounded border p-6 h-[calc(100%-2rem)] ${
      isUp
        ? 'border-emerald-200 bg-emerald-50/50'
        : 'border-red-200 bg-red-50/50'
    }`}>
      <p className="font-serif text-4xl text-gray-950 mb-4">
        {formatPrice(predictedPrice)}
      </p>
      <div className={`flex items-center gap-2 text-sm font-semibold ${
        isUp ? 'text-emerald-700' : 'text-red-600'
      }`}>
        {isUp
          ? <TrendingUp size={15} aria-hidden="true" />
          : <TrendingDown size={15} aria-hidden="true" />}
        <span>
          {isUp ? '+' : ''}{formatPrice(changeDollars)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
        </span>
      </div>
      <p className="text-xs text-gray-400 mt-2">Predicted change next month</p>
    </div>
  )
}
