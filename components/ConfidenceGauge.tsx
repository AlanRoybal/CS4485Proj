'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import type { DirectionExplanation } from '@/lib/types'

interface MomentumPeriod {
  label: string
  pct: number
}

interface Props {
  direction: 'up' | 'down'
  confidence: number // 0–1
  explanation?: DirectionExplanation
  momentumPeriods?: MomentumPeriod[]
}

/*
 * Pure-SVG half-arc gauge — no Recharts dependency.
 *
 * Geometry: 180° arc from 9-o'clock → 3-o'clock (left → right).
 * The arc center sits at (100, 90) inside a 200×120 viewBox so the
 * text labels have room below the arc without overlapping.
 */

const CX = 100
const CY = 90
const R = 70 // radius to stroke center
const STROKE = 14
const CIRCUMFERENCE = Math.PI * R // half-circle arc length

function getConfidenceColor(direction: 'up' | 'down', confidence: number): string {
  if (direction === 'up') {
    if (confidence >= 0.80) return '#065f46' // emerald-800
    if (confidence >= 0.70) return '#0f766e' // teal-700
    if (confidence >= 0.60) return '#0d9488' // teal-600
    return '#5eead4' // teal-300
  }
  if (confidence >= 0.80) return '#991b1b' // red-800
  if (confidence >= 0.70) return '#dc2626' // red-600
  if (confidence >= 0.60) return '#ef4444' // red-500
  return '#fca5a5' // red-300
}

export default function ConfidenceGauge({ direction, confidence, explanation, momentumPeriods }: Props) {
  const [showMethod, setShowMethod] = useState(false)
  const isUp = direction === 'up'
  const pct = Math.round(confidence * 100)
  const label = isUp ? 'Up' : 'Down'
  const fillLength = CIRCUMFERENCE * confidence
  const fillColor = getConfidenceColor(direction, confidence)

  // Arc path: half circle from left to right
  const arcPath = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`

  const confidenceLabel = explanation?.confidence_label ?? (
    confidence >= 0.80 ? 'Very strong' :
    confidence >= 0.70 ? 'Strong' :
    confidence >= 0.60 ? 'Moderate' : 'Slight lean'
  )

  const hasMomentum = momentumPeriods && momentumPeriods.length > 0
  const directionWord = isUp ? 'increase' : 'decrease'

  return (
    <div className="bg-white rounded border border-gray-200/80 p-6 space-y-5">
      {/* Gauge + primary labels */}
      <div
        className="flex flex-col items-center gap-1"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Price direction: ${label}, ${pct}% confidence`}
      >
        {/* Gauge arc */}
        <svg
          viewBox="0 0 200 105"
          className="w-[180px]"
          aria-hidden="true"
        >
          {/* Track */}
          <path
            d={arcPath}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          {/* Fill */}
          <path
            d={arcPath}
            fill="none"
            stroke={fillColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${fillLength} ${CIRCUMFERENCE}`}
            className="transition-[stroke-dasharray] duration-700 ease-out"
          />
        </svg>

        {/* Labels — positioned below the arc with clear spacing */}
        <div className="flex flex-col items-center -mt-12">
          <span className={`font-serif text-2xl tracking-tight ${
            isUp ? 'text-teal-800' : 'text-red-600'
          }`}>
            {label}
          </span>
          <span className="text-[13px] tabular-nums text-gray-400 mt-0.5">
            {pct}% confidence
          </span>
          <span className={`text-xs font-semibold mt-1 px-2 py-0.5 rounded-full ${
            isUp ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-600'
          }`}>
            {confidenceLabel} signal
          </span>
        </div>
      </div>

      {/* Plain-English summary */}
      {explanation && (
        <p className="text-sm text-gray-600 text-center leading-relaxed">
          {explanation.summary}
        </p>
      )}

      {/* Recent market context */}
      {hasMomentum && momentumPeriods && (
        <div className="border-t border-gray-100 pt-4">
          <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400">
            Recent Market Activity
          </span>
          <p className="text-xs text-gray-500 mt-1.5 mb-3">
            Here&apos;s how prices in this area have moved recently. Our model factors in these trends
            along with seasonal patterns and market data to predict a price {directionWord} next month.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {momentumPeriods.map(p => {
              const mUp = p.pct > 0.5
              const mDown = p.pct < -0.5
              return (
                <div key={p.label} className="text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">{p.label}</p>
                  <div className={`flex items-center justify-center gap-0.5 text-sm font-semibold ${
                    mUp ? 'text-emerald-700' : mDown ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {mUp && <TrendingUp size={12} />}
                    {mDown && <TrendingDown size={12} />}
                    {!mUp && !mDown && <Minus size={12} />}
                    <span>{p.pct >= 0 ? '+' : ''}{p.pct.toFixed(1)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* How it works — collapsible */}
      {explanation && (
        <div className="border-t border-gray-100 pt-3">
          <button
            onClick={() => setShowMethod(!showMethod)}
            className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 transition-colors w-full"
          >
            <Info size={12} />
            <span>How is this calculated?</span>
            {showMethod ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
          </button>
          {showMethod && (
            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
              {explanation.method}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
