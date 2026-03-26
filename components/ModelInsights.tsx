'use client'

import { useState } from 'react'
import type { ModelInfo } from '@/lib/api'

interface Props {
  info: ModelInfo
}

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  'Recent Price Trend':
    'The median home value from last month. This is the single strongest predictor — where prices were most recently is the best starting point for where they\'re headed.',
  '3-Month Price History':
    'The median home value from 3 months ago. Comparing this to the current price reveals short-term momentum — whether prices are accelerating, decelerating, or holding steady.',
  '6-Month Price History':
    'The median home value from 6 months ago. This captures medium-term trends and helps the model distinguish a temporary dip from a sustained shift.',
  'Annual Price Baseline':
    'The median home value from 12 months ago. This provides a year-over-year reference point that filters out seasonal fluctuations.',
  '12-Month Momentum':
    'The percentage change in home values over the past year. A positive value means prices have been rising; negative means they\'ve been falling. This captures the overall market direction.',
  '2-Bedroom Market':
    'Current median price for 2-bedroom homes in this zipcode. Reflects the entry-level and rental-investor segment of the market.',
  '3-Bedroom Market':
    'Current median price for 3-bedroom homes. This is the core family home segment and typically the most liquid part of the Dallas market.',
  '4-Bedroom Market':
    'Current median price for 4-bedroom homes. Represents the move-up buyer segment — families upgrading from starter homes.',
  'Luxury Home Tier':
    'Current median price for 5+ bedroom homes. This luxury segment often leads broader market shifts because high-end buyers react first to economic changes.',
  'Premium Segment':
    'Median price of homes in the top 35th percentile for this area. When premium homes gain or lose value, the rest of the market often follows.',
  'Affordability Floor':
    'Median price of homes in the bottom 35th percentile. This tracks the most affordable homes and signals whether entry-level buyers are being priced in or out.',
  'Seasonal Patterns':
    'The month of the year. Dallas real estate has consistent seasonal patterns — spring and summer typically see higher prices and more activity than fall and winter.',
  'Long-Term Trend':
    'The calendar year, which captures macro-level trends like post-pandemic price surges, interest rate shifts, and long-term appreciation.',
  'Market Size':
    'A ranking of this zipcode by number of homes. Larger markets tend to be more stable and predictable; smaller ones can be more volatile.',
}

export default function ModelInsights({ info }: Props) {
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null)
  const maxImp = info.top_drivers[0]?.importance ?? 1
  const startYear = new Date(info.dataset.date_range_start + 'T12:00:00').getFullYear()
  const endDate = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(info.dataset.date_range_end + 'T12:00:00'),
  )

  return (
    <div className="bg-white rounded border border-gray-200/80 p-6 space-y-5">
      {/* Top drivers */}
      <div>
        <p className="text-sm text-gray-600 mb-4">
          The model weighs these factors when generating forecasts. Tap any factor to learn more.
        </p>
        <div className="space-y-1">
          {info.top_drivers.map((d) => {
            const pct = (d.importance / maxImp) * 100
            const description = FEATURE_DESCRIPTIONS[d.feature]
            const isExpanded = expandedFeature === d.feature

            return (
              <div key={d.feature}>
                <button
                  type="button"
                  onClick={() => setExpandedFeature(isExpanded ? null : d.feature)}
                  className={`
                    w-full text-left px-3 py-2.5 rounded-lg transition-colors duration-150
                    ${isExpanded
                      ? 'bg-teal-50/80'
                      : 'hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium transition-colors duration-150 ${
                        isExpanded ? 'text-teal-800' : 'text-gray-700'
                      }`}>
                        {d.feature}
                      </span>
                      {description && (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          className={`transition-colors duration-150 shrink-0 ${
                            isExpanded ? 'text-teal-600' : 'text-gray-300'
                          }`}
                        >
                          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                          <path d="M7 6.2V10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          <circle cx="7" cy="4.4" r="0.7" fill="currentColor" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-[10px] tabular-nums transition-colors duration-150 ${
                      isExpanded ? 'text-teal-600' : 'text-gray-400'
                    }`}>
                      {(d.importance * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-colors duration-150 ${
                        isExpanded ? 'bg-teal-600' : 'bg-teal-700'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>

                {/* Expandable description */}
                <div
                  className="grid transition-[grid-template-rows] duration-200 ease-out"
                  style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    {description && (
                      <p className="text-xs text-gray-500 leading-relaxed px-3 pt-1 pb-3">
                        {description}
                      </p>
                    )}
                  </div>
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
