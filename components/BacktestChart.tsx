'use client'

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import type { BacktestResult } from '@/lib/api'

interface Props {
  backtest: BacktestResult
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(
    new Date(dateStr + 'T12:00:00'),
  )
}

export default function BacktestChart({ backtest }: Props) {
  if (!backtest.data.length) return null

  return (
    <div className="bg-white rounded border border-gray-200/80 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-600">
            How our 1-month predictions compared to actual prices.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Avg. prediction error</p>
          <p className="text-sm font-semibold text-gray-700">
            {formatPrice(backtest.avg_error_dollars)} ({backtest.avg_error_pct.toFixed(1)}%)
          </p>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={backtest.data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatPrice(value),
                name === 'actual' ? 'Actual Price' : 'Predicted Price',
              ]}
              labelFormatter={(label: string) => formatDate(label)}
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#0d9488"
              strokeWidth={2}
              dot={{ r: 3, fill: '#0d9488' }}
              name="actual"
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ r: 3, fill: '#6366f1' }}
              name="predicted"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-teal-600 rounded" />
          <span className="text-[10px] text-gray-500">Actual Price</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-indigo-500 rounded" style={{ borderTop: '2px dashed #6366f1', height: 0 }} />
          <span className="text-[10px] text-gray-500">Predicted Price</span>
        </div>
      </div>
    </div>
  )
}
