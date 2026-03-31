import type { ModelMetrics } from '@/lib/api'

interface Props {
  metrics: ModelMetrics
}

const HORIZON_LABELS: Record<string, string> = {
  '1m': '1-Month',
  '3m': '3-Month',
  '6m': '6-Month',
}

function getRating(mape: number): { label: string; color: string } {
  if (mape < 2) return { label: 'Excellent', color: 'text-emerald-700' }
  if (mape < 5) return { label: 'Good', color: 'text-teal-700' }
  return { label: 'Moderate', color: 'text-amber-600' }
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function ModelAccuracy({ metrics }: Props) {
  const horizons = Object.entries(metrics)
  if (horizons.length === 0) return null

  const m1m = metrics['1m']

  return (
    <div className="bg-white rounded border border-gray-200/80 p-6">
      {/* Headline stat */}
      {m1m && (
        <p className="text-sm text-gray-600 mb-4">
          Our 1-month predictions are typically within{' '}
          <span className="font-semibold text-gray-950">{m1m.mape.toFixed(1)}%</span>{' '}
          of actual prices (avg. error: {formatPrice(m1m.mae)}).
        </p>
      )}

      {/* Per-horizon metrics */}
      <div className="grid grid-cols-3 gap-4">
        {horizons.map(([h, m]) => {
          const rating = getRating(m.mape)
          return (
            <div key={h} className="text-center">
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400 mb-1">
                {HORIZON_LABELS[h] ?? h}
              </p>
              <p className="text-lg font-serif text-gray-950">{m.mape.toFixed(1)}%</p>
              <p className={`text-[11px] font-semibold ${rating.color}`}>{rating.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {formatPrice(m.mae)} avg error
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
