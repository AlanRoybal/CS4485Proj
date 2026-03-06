import { TrendingUp, TrendingDown, MapPin } from 'lucide-react'

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={18} className="text-teal-600" aria-hidden="true" />
            <span className="text-sm font-medium text-gray-500">{city} · {zipcode}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {bedroomLabel.charAt(0).toUpperCase() + bedroomLabel.slice(1)} homes
          </h1>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-teal-700">{formatPrice(currentPrice)}</p>
          <div className={`flex items-center justify-end gap-1 mt-1 text-sm font-medium ${isUp ? 'text-green-600' : 'text-red-600'}`}>
            {isUp
              ? <TrendingUp size={16} aria-hidden="true" />
              : <TrendingDown size={16} aria-hidden="true" />}
            <span>{isUp ? '+' : '-'}{yoyAbs}% year over year</span>
          </div>
        </div>
      </div>
    </div>
  )
}
