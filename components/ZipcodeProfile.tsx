'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts'
import type { ZipcodeProfileResult } from '@/lib/api'

interface Props {
  profile: ZipcodeProfileResult
}

export default function ZipcodeProfile({ profile }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Predictability card */}
      <div className="bg-white rounded border border-gray-200/80 p-6">
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400 mb-3">
          Predictability
        </p>
        <div className="flex items-end gap-3 mb-3">
          <span className="font-serif text-3xl text-gray-950">
            {profile.predictability_label}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Prices in {profile.zipcode} are more stable than{' '}
          <span className="font-semibold text-gray-700">{profile.volatility_percentile}%</span>{' '}
          of Dallas-area zipcodes.
        </p>
        {/* Percentile bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-teal-600 transition-all duration-500"
            style={{ width: `${profile.volatility_percentile}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-gray-400">Less stable</span>
          <span className="text-[9px] text-gray-400">More stable</span>
        </div>
      </div>

      {/* Seasonal trends card */}
      <div className="bg-white rounded border border-gray-200/80 p-6">
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400 mb-3">
          Seasonal Patterns
        </p>
        <p className="text-sm text-gray-500 mb-3">
          Average monthly price change over the historical record.
        </p>
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={profile.seasonal} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 9, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                width={35}
                tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
              />
              <ReferenceLine y={0} stroke="#e5e7eb" />
              <Tooltip
                formatter={(value: number) => [`${value > 0 ? '+' : ''}${value.toFixed(2)}%`, 'Avg. Change']}
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 6,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              />
              <Bar dataKey="avg_change_pct" radius={[2, 2, 0, 0]}>
                {profile.seasonal.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.avg_change_pct >= 0 ? '#0d9488' : '#dc2626'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
