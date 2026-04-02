'use client'

import { useState } from 'react'

interface Props {
  bedrooms: number
  bathrooms: number
  currentPrice: number
}

const BATHROOM_MULTIPLIER: Record<string, number> = {
  '2-1': 0.81, '2-2': 1.00, '2-3': 1.21, '2-4': 1.45,
  '3-1': 0.81, '3-2': 1.00, '3-3': 1.21, '3-4': 1.45,
  '4-1': 0.80, '4-2': 1.00, '4-3': 1.22, '4-4': 1.46,
  '5-1': 0.80, '5-2': 1.00, '5-3': 1.22, '5-4': 1.46,
}

function getMult(bedrooms: number, bathrooms: number): number {
  return BATHROOM_MULTIPLIER[`${bedrooms}-${bathrooms}`] ?? 1.0
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatPct(n: number): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(0)}%`
}

function bathLabel(b: number): string {
  return b === 4 ? '4+ bath' : `${b} bath`
}

function impactDescription(bathrooms: number, pctDiff: number): string {
  if (bathrooms === 2) {
    return 'Two bathrooms is the most common configuration in Dallas-area homes and serves as the baseline for our estimates.'
  }
  if (bathrooms === 1) {
    return `Homes with a single bathroom are typically smaller or older and carry an estimated ${Math.abs(pctDiff).toFixed(0)}% discount relative to 2-bath homes in this market segment.`
  }
  if (bathrooms === 3) {
    return `A third bathroom adds an estimated ${pctDiff.toFixed(0)}% premium, reflecting the added convenience and appeal to larger households.`
  }
  return `Four or more bathrooms place this home in the premium segment, adding an estimated ${pctDiff.toFixed(0)}% premium that reflects luxury-tier buyer expectations.`
}

export default function BathroomImpact({ bedrooms, bathrooms, currentPrice }: Props) {
  const [showDetails, setShowDetails] = useState(false)

  const activeMult = getMult(bedrooms, bathrooms)
  const pctDiff = (activeMult - 1) * 100
  const baselinePrice = currentPrice / activeMult
  const isBaseline = bathrooms === 2

  const tiers = [1, 2, 3, 4] as const

  return (
    <div className="bg-white rounded border border-gray-200/80 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
            Bathroom Adjustment
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-serif text-gray-950">
              {bathLabel(bathrooms)}
            </span>
            {isBaseline ? (
              <span className="text-xs font-medium text-gray-500">Baseline</span>
            ) : (
              <span className={`text-xs font-medium ${pctDiff > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {formatPct(pctDiff)} vs 2-bath
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] text-gray-400 leading-snug">Source</p>
          <p className="text-[11px] font-medium text-gray-600 leading-snug">NAHB</p>
          <p className="text-[10px] text-gray-400 leading-snug">House Price Estimator</p>
        </div>
      </div>

      {/* Comparison bar */}
      <div className="space-y-1.5">
        {tiers.map(b => {
          const mult = getMult(bedrooms, b)
          const estPrice = baselinePrice * mult
          const diff = (mult - 1) * 100
          const isActive = b === bathrooms
          const barWidth = Math.max((mult / 1.5) * 100, 8)

          return (
            <div key={b} className="flex items-center gap-3">
              <span className={`w-14 text-xs text-right tabular-nums shrink-0 ${isActive ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                {bathLabel(b)}
              </span>
              <div className="flex-1 relative h-6">
                <div
                  className={`absolute inset-y-0 left-0 rounded transition-all duration-300 ${
                    isActive ? 'bg-teal-700' : 'bg-gray-200'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
                <span className={`absolute inset-y-0 flex items-center text-[11px] tabular-nums ${
                  barWidth > 40
                    ? `left-2 ${isActive ? 'text-white' : 'text-gray-600'}`
                    : 'text-gray-600'
                }`} style={barWidth <= 40 ? { left: `calc(${barWidth}% + 8px)` } : undefined}>
                  {formatPrice(estPrice)}
                  {b !== 2 && (
                    <span className={`ml-1 ${isActive ? 'opacity-80' : 'text-gray-400'}`}>
                      ({formatPct(diff)})
                    </span>
                  )}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 leading-relaxed">
        {impactDescription(bathrooms, pctDiff)}
      </p>

      {/* Expandable methodology */}
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
          How is this calculated?
        </button>

        <div
          className="grid transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: showDetails ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="pt-3 space-y-3 text-xs text-gray-500 leading-relaxed">
              <p>
                Zillow does not publish home value indices by bathroom count — only by bedroom count.
                To estimate the effect of bathrooms, we apply a multiplier derived from the{' '}
                <strong className="text-gray-700">NAHB House Price Estimator</strong>, which is based
                on the American Housing Survey (U.S. Census Bureau / HUD).
              </p>
              <p>
                The multiplier represents how much more (or less) a home is worth relative to an
                otherwise identical 2-bathroom home. It is applied after the XGBoost model predicts
                overall home values and after bedroom-tier scaling, so it adjusts the final price
                without affecting the underlying trend or direction signal.
              </p>
              <div className="rounded-lg bg-gray-50 p-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-gray-700">
                  Multiplier for {bedrooms === 5 ? '5+' : bedrooms}-bedroom homes
                </p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {tiers.map(b => {
                    const mult = getMult(bedrooms, b)
                    return (
                      <div key={b} className={`rounded px-2 py-1.5 ${b === bathrooms ? 'bg-teal-50 ring-1 ring-teal-200' : ''}`}>
                        <p className="text-[10px] text-gray-400">{bathLabel(b)}</p>
                        <p className={`text-sm font-semibold tabular-nums ${b === bathrooms ? 'text-teal-800' : 'text-gray-700'}`}>
                          {mult.toFixed(2)}x
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
              <p>
                Because this is an estimate rather than observed market data, the actual price
                difference for a specific property may vary based on finishes, layout, and local
                comparable sales.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
