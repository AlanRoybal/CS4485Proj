import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MomentumPeriod {
  label: string
  pct: number
}

interface Props {
  periods: MomentumPeriod[]
}

function getSummary(periods: MomentumPeriod[]): string {
  const positiveCount = periods.filter(p => p.pct > 0.5).length
  const negativeCount = periods.filter(p => p.pct < -0.5).length

  if (positiveCount === periods.length) return 'Strong upward momentum across all timeframes.'
  if (negativeCount === periods.length) return 'Consistent downward trend across all timeframes.'
  if (positiveCount > negativeCount) return 'Mostly positive momentum — market is trending upward.'
  if (negativeCount > positiveCount) return 'Mostly negative momentum — market is cooling.'
  return 'Mixed signals — market is stabilizing.'
}

export default function MarketMomentum({ periods }: Props) {
  const summary = getSummary(periods)

  return (
    <div className="space-y-3">
      {periods.map((p) => {
        const isUp = p.pct > 0.5
        const isDown = p.pct < -0.5
        const isFlat = !isUp && !isDown
        return (
          <div key={p.label} className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{p.label}</span>
            <div className={`flex items-center gap-1 text-sm font-semibold ${
              isUp ? 'text-emerald-700' : isDown ? 'text-red-600' : 'text-gray-500'
            }`}>
              {isUp && <TrendingUp size={12} />}
              {isDown && <TrendingDown size={12} />}
              {isFlat && <Minus size={12} />}
              <span>{p.pct >= 0 ? '+' : ''}{p.pct.toFixed(1)}%</span>
            </div>
          </div>
        )
      })}
      <p className="text-[11px] text-gray-400 pt-1 border-t border-gray-100">
        {summary}
      </p>
    </div>
  )
}
