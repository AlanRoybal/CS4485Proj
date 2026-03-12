'use client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts'
import type { ChartDataPoint } from '@/lib/types'

interface Props {
  data: ChartDataPoint[]
  height?: number
}

export default function PriceChart({ data, height }: Props) {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const yFormatter = (value: number) => `$${(value / 1000).toFixed(0)}k`

  const xFormatter = (date: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(
      new Date(date + 'T12:00:00'),
    )

  const tooltipFormatter = (value: number | undefined) =>
    value != null ? [`$${(value / 1000).toFixed(0)}k`, 'Price'] : ['', 'Price']

  return (
    <ResponsiveContainer width="100%" height={height ?? 350}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" tickFormatter={xFormatter} minTickGap={50} />
        <YAxis tickFormatter={yFormatter} width={60} />
        <Tooltip formatter={tooltipFormatter} />
        <ReferenceArea x1={today} fill="#d1fae5" fillOpacity={0.35} />
        <ReferenceLine
          x={today}
          stroke="#6b7280"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          label={{ value: 'Today', position: 'insideTopRight', fontSize: 11, fill: '#6b7280' }}
        />
        <Line
          dataKey="zhvi"
          stroke="#0f766e"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
        <Line
          dataKey="forecast"
          stroke="#0f766e"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={{ r: 5, fill: '#0f766e', stroke: '#fff', strokeWidth: 2 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
