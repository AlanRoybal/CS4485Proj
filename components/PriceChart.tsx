'use client'
import {
  AreaChart,
  Area,
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

/* ── Formatters ── */

const fmtY = (value: number) =>
  `$${(value / 1000).toFixed(0)}k`

const fmtX = (date: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(
    new Date(date + 'T12:00:00'),
  )

const fmtTooltipDate = (date: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(date + 'T12:00:00'),
  )

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const fmtCompact = (value: number) => {
  const abs = Math.abs(value)
  if (abs >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

/* ── Custom tooltip ── */

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ dataKey: string; value?: number }>
  label?: string
}) {
  if (!active || !payload?.length || !label) return null

  const zhvi = payload.find(p => p.dataKey === 'zhvi')?.value
  const forecast = payload.find(p => p.dataKey === 'forecast')?.value
  const value = zhvi ?? forecast
  const isForecast = !zhvi && !!forecast

  if (value == null) return null

  return (
    <div className="bg-gray-950/90 backdrop-blur-sm text-white px-3.5 py-2.5 rounded-lg shadow-lg border border-white/10">
      <p className="text-[11px] text-gray-400 mb-1">
        {fmtTooltipDate(label)}
        {isForecast && (
          <span className="ml-1.5 text-teal-400 font-medium">Forecast</span>
        )}
      </p>
      <p className="text-[15px] font-semibold tracking-tight">
        {fmtCurrency(value)}
      </p>
    </div>
  )
}

/* ── Custom active dot ── */

function ActiveDot(props: { cx?: number; cy?: number }) {
  const { cx, cy } = props
  if (cx == null || cy == null) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill="#0f766e"
      stroke="#fff"
      strokeWidth={2.5}
      style={{ filter: 'drop-shadow(0 1px 3px rgba(15,118,110,0.35))' }}
    />
  )
}

/* ── Forecast endpoint — shows price + delta from current ── */

function ForecastDot(props: {
  cx?: number; cy?: number; payload?: ChartDataPoint
  index?: number; width?: number; height?: number
  bridgePrice?: number
}) {
  const { cx, cy, payload, bridgePrice } = props
  if (cx == null || cy == null || !payload?.forecast) return null

  // Bridge point: subtle dot only, no label — the solid line communicates it
  if (payload.zhvi != null) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={4} fill="#475569" stroke="#fff" strokeWidth={2} />
      </g>
    )
  }

  // Forecast endpoint: the hero annotation
  const price = payload.forecast
  const priceLabel = fmtCurrency(price)
  const month = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(
    new Date(payload.date + 'T12:00:00'),
  )

  // Compute delta from bridge (current) price
  const delta = bridgePrice != null ? price - bridgePrice : 0
  const deltaPct = bridgePrice != null && bridgePrice > 0
    ? (delta / bridgePrice) * 100
    : 0
  const isUp = delta >= 0
  const arrow = isUp ? '▲' : '▼'
  const deltaLabel = `${arrow} ${fmtCompact(Math.abs(delta))} (${Math.abs(deltaPct).toFixed(1)}%)`
  const deltaColor = isUp ? '#059669' : '#dc2626'  // emerald-600 / red-600

  // Card dimensions — taller to fit price + delta
  const cardW = 110
  const cardH = 42
  const cardX = cx - cardW / 2
  const cardY = cy - cardH - 20

  return (
    <g>
      {/* Glow ring */}
      <circle cx={cx} cy={cy} r={12} fill="#0f766e" fillOpacity={0.06} />
      <circle cx={cx} cy={cy} r={7} fill="#0f766e" fillOpacity={0.10} />
      {/* Main dot */}
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="#0f766e"
        stroke="#fff"
        strokeWidth={2}
        style={{ filter: 'drop-shadow(0 2px 6px rgba(15,118,110,0.4))' }}
      />

      {/* Annotation card */}
      <rect
        x={cardX}
        y={cardY}
        width={cardW}
        height={cardH}
        rx={6}
        fill="#fff"
        stroke="#0f766e"
        strokeWidth={1}
        strokeOpacity={0.15}
        style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.08))' }}
      />

      {/* Price — top line of card */}
      <text
        x={cx}
        y={cardY + 17}
        textAnchor="middle"
        fill="#0f766e"
        fontSize={12}
        fontWeight={700}
        fontFamily="var(--font-dm-sans)"
      >
        {priceLabel}
      </text>

      {/* Delta — bottom line of card */}
      <text
        x={cx}
        y={cardY + 33}
        textAnchor="middle"
        fill={deltaColor}
        fontSize={10}
        fontWeight={600}
        fontFamily="var(--font-dm-sans)"
      >
        {deltaLabel}
      </text>

      {/* Month + "Forecast" tag below the dot */}
      <text
        x={cx}
        y={cy + 17}
        textAnchor="middle"
        fill="#0f766e"
        fontSize={9}
        fontWeight={600}
        fontFamily="var(--font-dm-sans)"
        opacity={0.55}
      >
        {month} Forecast
      </text>
    </g>
  )
}

/* ── Chart ── */

export default function PriceChart({ data, height }: Props) {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  // Find key points
  const forecastPoints = data.filter(d => d.forecast != null && d.zhvi == null)
  const forecastPoint = forecastPoints[forecastPoints.length - 1]
  const lastHistorical = [...data].reverse().find(d => d.zhvi != null)

  // Bridge price (last solid point) — passed to ForecastDot for delta calculation
  const bridgePrice = lastHistorical?.zhvi

  return (
    <ResponsiveContainer width="100%" height={height ?? 360}>
      <AreaChart data={data} margin={{ top: 52, right: 56, left: -8, bottom: 4 }}>
        <defs>
          <linearGradient id="zhviFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="none"
          stroke="#f1f5f9"
          vertical={false}
        />

        {/* Shaded forecast zone */}
        {lastHistorical && forecastPoint && (
          <ReferenceArea
            x1={lastHistorical.date}
            x2={forecastPoint.date}
            fill="#0f766e"
            fillOpacity={0.04}
            strokeOpacity={0}
          />
        )}

        <XAxis
          dataKey="date"
          tickFormatter={fmtX}
          minTickGap={50}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'var(--font-dm-sans)' }}
          dy={8}
        />

        <YAxis
          tickFormatter={fmtY}
          width={52}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'var(--font-dm-sans)' }}
          dx={-4}
          domain={['auto', 'auto']}
          padding={{ top: 20 }}
        />

        <Tooltip
          content={<ChartTooltip />}
          cursor={{
            stroke: '#0f766e',
            strokeWidth: 1,
            strokeDasharray: '4 3',
            strokeOpacity: 0.3,
          }}
        />

        {/* "Now" marker */}
        <ReferenceLine
          x={today}
          stroke="#0f766e"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          strokeOpacity={0.5}
          label={{
            value: 'Now',
            position: 'insideTopRight',
            fontSize: 10,
            fill: '#0f766e',
            fontWeight: 600,
            dx: 2,
            dy: -4,
          }}
        />

        {/* Historical area + line */}
        <Area
          dataKey="zhvi"
          stroke="#0f766e"
          strokeWidth={2}
          fill="url(#zhviFill)"
          dot={false}
          activeDot={<ActiveDot />}
          connectNulls={false}
        />

        {/* Forecast dashed line with annotated endpoint */}
        <Line
          dataKey="forecast"
          stroke="#0f766e"
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={<ForecastDot bridgePrice={bridgePrice} />}
          activeDot={<ActiveDot />}
          connectNulls={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
