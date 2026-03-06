import type { BedroomPrices } from '@/lib/types'

interface Props {
  prices: BedroomPrices
  selectedBedrooms: number  // 2, 3, 4, or 5
}

const BEDROOM_LABELS: Array<{ key: keyof BedroomPrices; label: string; value: number }> = [
  { key: '2br', label: '2 BR', value: 2 },
  { key: '3br', label: '3 BR', value: 3 },
  { key: '4br', label: '4 BR', value: 4 },
  { key: '5br', label: '5 BR+', value: 5 },
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
    <div className="grid grid-cols-4 gap-3" role="list" aria-label="Bedroom price breakdown">
      {BEDROOM_LABELS.map(({ key, label, value }) => {
        const isSelected = value === selectedBedrooms
        return (
          <div
            key={key}
            role="listitem"
            className={`rounded-lg p-4 bg-white border-2 text-center transition-colors ${
              isSelected
                ? 'border-teal-600 ring-2 ring-teal-200'
                : 'border-gray-200'
            }`}
          >
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatPrice(prices[key])}</p>
          </div>
        )
      })}
    </div>
  )
}
