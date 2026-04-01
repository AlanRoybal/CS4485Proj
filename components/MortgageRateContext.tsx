'use client'

import { useState } from 'react'

interface Props {
  rate: number          // current 30-year fixed rate in %
  dataDate?: string     // YYYY-MM-DD of the rate reading
}

function rateLabel(rate: number): { label: string; color: string; description: string } {
  if (rate <= 4.0) return {
    label: 'Historically Low',
    color: 'text-emerald-700',
    description: 'Rates this low dramatically increase buyer purchasing power and typically push prices up.',
  }
  if (rate <= 5.5) return {
    label: 'Below Average',
    color: 'text-emerald-600',
    description: 'Rates are favorable by historical standards, supporting healthy buyer demand.',
  }
  if (rate <= 6.5) return {
    label: 'Near Average',
    color: 'text-amber-600',
    description: 'Rates are near the long-run historical average, reflecting balanced market conditions.',
  }
  if (rate <= 7.5) return {
    label: 'Elevated',
    color: 'text-orange-600',
    description: 'Higher rates reduce affordability and typically moderate price growth or create downward pressure.',
  }
  return {
    label: 'High',
    color: 'text-red-600',
    description: 'Rates at this level significantly reduce buyer purchasing power and tend to cool price appreciation.',
  }
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(dateStr + 'T12:00:00'),
  )
}

// Historical reference points for context bar
const RATE_MIN = 2.6   // pandemic-era low (2021)
const RATE_MAX = 8.0   // 2023 peak

export default function MortgageRateContext({ rate, dataDate }: Props) {
  const [showDetails, setShowDetails] = useState(false)
  const { label, color, description } = rateLabel(rate)

  // Position on bar: clamp between 0–100%
  const pct = Math.min(Math.max(((rate - RATE_MIN) / (RATE_MAX - RATE_MIN)) * 100, 0), 100)

  return (
    <div className="bg-white rounded border border-gray-200/80 p-6 space-y-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">30-Year Fixed Mortgage Rate</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif text-gray-950">{rate.toFixed(2)}%</span>
            <span className={`text-xs font-medium ${color}`}>{label}</span>
          </div>
          {dataDate && (
            <p className="text-[11px] text-gray-400 mt-1">as of {formatDate(dataDate)}</p>
          )}
        </div>

        {/* Source badge */}
        <div className="shrink-0 text-right">
          <p className="text-[10px] text-gray-400 leading-snug">Source</p>
          <p className="text-[11px] font-medium text-gray-600 leading-snug">Freddie Mac</p>
          <p className="text-[10px] text-gray-400 leading-snug">via FRED</p>
        </div>
      </div>

      {/* Rate context bar */}
      <div>
        <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
          <span>{RATE_MIN}% — 2021 low</span>
          <span>Historical avg ~6.5%</span>
          <span>{RATE_MAX}% — 2023 peak</span>
        </div>
        <div className="relative h-2 bg-gray-100 rounded-full overflow-visible">
          {/* Gradient fill */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-200 via-amber-200 to-red-300" />
          {/* Marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-gray-700 shadow-sm z-10"
            style={{ left: `${pct}%` }}
          />
        </div>
      </div>

      {/* Impact description */}
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>

      {/* How it affects the model */}
      <div>
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1.5 text-xs text-teal-700 hover:text-teal-900 font-medium"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className={`transition-transform duration-200 ${showDetails ? 'rotate-90' : ''}`}
          >
            <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          How does this affect the prediction?
        </button>

        <div
          className="grid transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: showDetails ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="pt-3 space-y-3 text-xs text-gray-500 leading-relaxed">
              <p>
                The 30-year mortgage rate is one of the 15 features our XGBoost model uses when
                forecasting Dallas home prices. Higher rates reduce the pool of qualified buyers,
                which puts downward pressure on prices. Lower rates increase purchasing power,
                which drives competition and pushes prices up.
              </p>
              <p>
                Mortgage rates tend to have a larger influence on longer-horizon forecasts (3–6 months)
                than on the 1-month forecast, since rate changes take time to affect buyer behavior and
                closed sales prices.
              </p>
              <div className="rounded-lg bg-gray-50 p-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-gray-700">About this data source</p>
                <p>
                  Rate data comes from the <strong className="text-gray-700">Freddie Mac Primary Mortgage Market Survey</strong>,
                  the most widely cited weekly mortgage rate benchmark in the U.S. It is
                  published weekly and made freely available through the{' '}
                  <strong className="text-gray-700">Federal Reserve Bank of St. Louis (FRED)</strong>.
                </p>
                <p>
                  Weekly observations are averaged to a monthly figure and aligned with
                  the monthly Zillow home value data before being used in training and prediction.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
