import type { ModelInfo } from '@/lib/api'

interface Props {
  info: ModelInfo
}

export default function ModelInsights({ info }: Props) {
  const maxImp = info.top_drivers[0]?.importance ?? 1
  const startYear = new Date(info.dataset.date_range_start + 'T12:00:00').getFullYear()
  const endDate = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(info.dataset.date_range_end + 'T12:00:00'),
  )

  return (
    <div className="bg-white rounded border border-gray-200/80 p-6 space-y-5">
      {/* Top drivers */}
      <div>
        <p className="text-sm text-gray-600 mb-3">
          The model weighs these factors when generating forecasts:
        </p>
        <div className="space-y-2.5">
          {info.top_drivers.map((d) => {
            const pct = (d.importance / maxImp) * 100
            return (
              <div key={d.feature}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">{d.feature}</span>
                  <span className="text-[10px] text-gray-400">{(d.importance * 100).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-700 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dataset quick facts */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-lg font-serif text-gray-950">{info.dataset.zipcodes}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Zipcodes</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-serif text-gray-950">{(info.dataset.data_points / 1000).toFixed(0)}k+</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Data Points</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-serif text-gray-950">{startYear}–now</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">History</p>
        </div>
      </div>

      <p className="text-[11px] text-gray-400">
        Predictions powered by XGBoost, trained on Zillow Home Value Index data through {endDate}.
      </p>
    </div>
  )
}
