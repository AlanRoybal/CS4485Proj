'use client'
import { PieChart, Pie, Cell } from 'recharts'

interface Props {
  direction: 'up' | 'down'
  confidence: number  // 0–1
}

export default function ConfidenceGauge({ direction, confidence }: Props) {
  const color = direction === 'up' ? '#16a34a' : '#dc2626'
  const textColor = direction === 'up' ? 'text-green-600' : 'text-red-600'
  const label = direction === 'up' ? 'UP' : 'DOWN'
  const pct = Math.round(confidence * 100)

  const filled = [{ value: confidence }, { value: 1 - confidence }]
  const bg = [{ value: 1 }]

  return (
    <div className="flex flex-col items-center" aria-label={`Price direction: ${label}, ${pct}% confidence`}>
      <div className="relative">
        <PieChart width={200} height={115}>
          {/* Gray background ring */}
          <Pie
            data={bg}
            cx={100} cy={105}
            innerRadius={58} outerRadius={78}
            startAngle={180} endAngle={0}
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill="#e5e7eb" />
          </Pie>
          {/* Filled arc */}
          <Pie
            data={filled}
            cx={100} cy={105}
            innerRadius={58} outerRadius={78}
            startAngle={180} endAngle={0}
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={color} />
            <Cell fill="transparent" />
          </Pie>
        </PieChart>
        {/* Centered label overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span className={`text-2xl font-bold ${textColor}`}>{label}</span>
          <span className="text-sm text-gray-500">{pct}% confidence</span>
        </div>
      </div>
    </div>
  )
}
