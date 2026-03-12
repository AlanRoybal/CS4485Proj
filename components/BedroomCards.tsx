import type { BedroomPrices } from '@/lib/types'

interface Props {
  prices: BedroomPrices
  selectedBedrooms: number  // 2, 3, 4, or 5
}

const BEDROOM_LABELS: Array<{ key: keyof BedroomPrices; label: string; value: number }> = [
  { key: '2br', label: '2 BR', value: 2 },
  { key: '3br', label: '3 BR', value: 3 },
  { key: '4br', label: '4 BR', value: 4 },
  { key: '5br', label: '5+', value: 5 },
]

function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export default function BedroomCards({ prices, selectedBedrooms }: Props) {
  return (
    <div className="space-y-2" role="list" aria-label="Bedroom price breakdown">
      {BEDROOM_LABELS.map(({ key, label, value }) => {
        const isSelected = value === selectedBedrooms
        return (
          <div
            key={key}
            role="listitem"
            className={`flex items-center justify-between rounded px-4 py-3 transition-colors ${
              isSelected
                ? 'bg-teal-800 text-white'
                : 'bg-gray-50 text-gray-700'
            }`}
          >
            <span className={`text-sm font-medium ${isSelected ? 'text-teal-100' : 'text-gray-500'}`}>
              {label}
            </span>
            <span className={`text-sm font-semibold tabular-nums ${isSelected ? 'text-white' : 'text-gray-900'}`}>
              {formatPrice(prices[key])}
            </span>
          </div>
        )
      })}
    </div>
  )
}
