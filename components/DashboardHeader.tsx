import { TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  zipcode: string
  city: string
  bedrooms: number
  currentPrice: number
  yoyChange: number   // percentage, e.g. 3.2 means +3.2%
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function DashboardHeader({ zipcode, city, bedrooms, currentPrice, yoyChange }: Props) {
  const isUp = yoyChange >= 0
  const yoyAbs = Math.abs(yoyChange).toFixed(1)
  const bedroomLabel = bedrooms === 5 ? '5+ bedroom' : `${bedrooms}-bedroom`

  return (
    <div className="flex items-end justify-between flex-wrap gap-4 pb-6 border-b border-gray-200/80">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-gray-400 mb-1">
          {city} · {zipcode}
        </p>
        <h1 className="font-serif text-3xl text-gray-950">
          {bedroomLabel.charAt(0).toUpperCase() + bedroomLabel.slice(1)} Homes
        </h1>
      </div>
      <div className="text-right">
        <p className="font-serif text-3xl text-teal-800">{formatPrice(currentPrice)}</p>
        <div className={`flex items-center justify-end gap-1.5 mt-1 text-sm font-medium ${isUp ? 'text-emerald-700' : 'text-red-600'}`}>
          {isUp
            ? <TrendingUp size={14} aria-hidden="true" />
            : <TrendingDown size={14} aria-hidden="true" />}
          <span>{isUp ? '+' : '-'}{yoyAbs}% year over year</span>
        </div>
      </div>
    </div>
  )
}
