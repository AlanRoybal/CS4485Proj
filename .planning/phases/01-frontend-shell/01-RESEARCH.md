# Phase 1: Frontend Shell - Research

**Researched:** 2026-03-05
**Domain:** Next.js 15 App Router, Recharts 3.x, Tailwind CSS, TypeScript
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Landing page layout:** Hero + form layout with headline, tagline, then zipcode/bedroom form below. Title + explanation paragraph for homebuyer audience.
- **Landing page background:** Subtle gradient or light color wash background (not plain white, not dark mode).
- **Bedroom selector:** Toggle button group — four clickable buttons (2, 3, 4, 5+), one selected at a time.
- **Zipcode input:** Placeholder hint ("e.g., 75252") inside the field; no example chips.
- **Zipcode validation:** Shake animation on the input + inline error text below — no toasts.
- **Submit button:** Shows a spinner while navigating to the dashboard.
- **Navigation:** Top nav bar on both pages. App name/logo on left links back to landing. "About" link included.
- **Dashboard layout:** Card grid — each section is its own elevated card, responsive grid.
- **Dashboard header card:** Zipcode, city name, current median price, YoY % change, AND bedroom count context ("3-bedroom homes").
- **Historical chart size:** Approximately 300–400px tall — prominent but not dominating.
- **Responsive:** Desktop-first. Mobile is v2 scope.
- **Color scheme:** Green/teal primary accent. Green for "up", red for "down". Neutral grays for card backgrounds.
- **PriceChart:** Recharts LineChart. Shaded background zone for future region. Distinct forecast dot at end of dotted extension line. Solid vertical line at today's date.
- **ConfidenceGauge:** Semicircular arc gauge (half-circle). Arc fills to confidence percentage. Direction label (UP/DOWN) inside the arc. Green = up, red = down.
- **BedroomCards:** Four small stat cards in a horizontal row: 2BR, 3BR, 4BR, 5BR+. Selected tier is visually highlighted.
- **Mocked data:** Single hardcoded fixture for zipcode 75252, 3-bedroom. Lives in `lib/mock-data.ts` as typed objects. Matches exact shape real API routes will return.
- **Stack:** Next.js 14+ / TypeScript / Tailwind CSS / Recharts. File structure: `app/`, `components/`, `lib/`.
- **Dashboard route:** `/dashboard/[zipcode]?bedrooms=[n]`

### Claude's Discretion
- About page vs. modal implementation
- Exact gradient/color wash for landing background
- Specific Tailwind classes, spacing, and typography details
- Card grid breakpoints (how many columns on different screen sizes)
- Exact mock price values (use realistic Dallas 3BR range ~$380k–$420k trend)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LAND-01 | User can enter a 5-digit Dallas zipcode in a text input field | Next.js controlled input pattern; HTML input type="text" with maxLength=5 |
| LAND-02 | User can select bedroom count from 2, 3, 4, 5+ options | Toggle button group pattern; managed with useState |
| LAND-03 | User sees a validation error if zipcode is not in the 113-zipcode Dallas list before any API call | Client-side validation against `lib/dallas-zipcodes.json`; shake animation via Tailwind keyframes |
| COMP-01 | `PriceChart.tsx` renders a Recharts LineChart accepting `data: { date: string, zhvi: number }[]` | Recharts 3.x LineChart + ResponsiveContainer + ReferenceLine + ReferenceArea; XAxis tickFormatter for date display |
| COMP-02 | `ConfidenceGauge.tsx` renders a directional confidence indicator | Recharts PieChart with two overlapping Pies (startAngle=180, endAngle=0) produces semicircle; custom SVG arc alternative also viable |
| COMP-03 | `BedroomCards.tsx` renders a row of stat cards | Flexbox/grid row of four cards; selected tier highlighted via conditional Tailwind class |
| LAND-04 | Submitting valid input navigates to `/dashboard/[zipcode]?bedrooms=[n]` | Next.js `useRouter().push()` from 'next/navigation'; must be 'use client' component |
| DATA-01 | `lib/dallas-zipcodes.json` contains the 113 curated core Dallas zipcodes as a static JSON array | Static JSON import in TypeScript; typed as `string[]` |
</phase_requirements>

---

## Summary

Phase 1 builds a complete, visually-credible Next.js frontend shell using mocked data. The project is greenfield — no existing Next.js structure, package.json, or test infrastructure exists. The stack is fully locked: Next.js (install latest stable, currently 15.x), TypeScript, Tailwind CSS, and Recharts 3.x.

The most technically involved components are PriceChart (Recharts LineChart with ReferenceLine for today's date, ReferenceArea for the future zone, and a dotted line segment extending to a forecast dot) and ConfidenceGauge (semicircular arc, best implemented using two overlapping Recharts Pie components with `startAngle={180}` and `endAngle={0}`, or as a plain SVG arc for simpler control). Navigation uses Next.js App Router: `useRouter().push()` for form submission and `params`/`searchParams` (now async Promises in Next.js 15) for the dashboard page.

**Primary recommendation:** Bootstrap with `npx create-next-app@latest` (TypeScript + Tailwind + App Router + `src/` off), install Recharts 3.x, build components bottom-up (mock data → leaf components → pages), and use the `lib/mock-data.ts` fixture as the single source of typed data that Phase 3 will replace with real API calls.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.x (latest stable) | App Router, file-based routing, API proxy routes | Project spec; Next.js 15 is current stable as of early 2026 |
| react / react-dom | 19.x (bundled with Next 15) | UI framework | Peer dependency of Next.js 15 |
| typescript | 5.x | Type safety | Project spec; required for `PageProps` helper and typed component props |
| tailwindcss | 3.x or 4.x | Utility-first styling | Project spec; `create-next-app` sets this up automatically |
| recharts | 3.x (3.7.0 latest) | Data charts — LineChart, PieChart | Project spec; 3.x adds accessibility by default, TypeScript 5 required |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | latest | SVG icon set | For nav icons, bedroom icons, up/down arrows — no emoji icons |
| @types/node | latest | Node type defs | Required for Next.js environment |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts PieChart for gauge | Custom SVG arc with `path` | Custom SVG is simpler and more precise for a fixed semicircle; Recharts Pie approach works but requires two overlapping Pie components |
| Recharts ReferenceLine for today marker | CSS overlay div | ReferenceLine is cleaner, stays aligned with chart data coordinates |
| lucide-react | heroicons, react-icons | All equivalent; lucide-react is most widely used in Next.js/shadcn ecosystem |

**Installation:**
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
npm install recharts lucide-react
```

---

## Architecture Patterns

### Recommended Project Structure
```
/                          (Next.js project root — repo root)
├── app/
│   ├── layout.tsx         # Root layout: HTML shell, nav bar, font import
│   ├── page.tsx           # Landing page (server component, renders client form)
│   ├── dashboard/
│   │   └── [zipcode]/
│   │       └── page.tsx   # Dashboard page (server component, reads params/searchParams)
│   └── api/
│       ├── predict/
│       │   └── route.ts   # Stub API proxy (Phase 1: returns mock; Phase 3: calls Modal)
│       └── history/
│           └── route.ts   # Stub API proxy
├── components/
│   ├── NavBar.tsx         # Top nav, shared across pages
│   ├── SearchForm.tsx     # Zipcode input + bedroom toggle + submit — 'use client'
│   ├── PriceChart.tsx     # Recharts LineChart — 'use client'
│   ├── ConfidenceGauge.tsx # Semicircle gauge — 'use client'
│   ├── BedroomCards.tsx   # Four stat cards
│   ├── DashboardHeader.tsx # Header card with zipcode/city/price/YoY
│   └── ForecastCallout.tsx # Predicted price callout card
├── lib/
│   ├── dallas-zipcodes.json  # 113 valid zipcodes (static JSON)
│   ├── mock-data.ts          # Typed mock fixture for 75252, 3BR
│   └── types.ts              # Shared TypeScript interfaces
├── .env.local                # Modal URLs (not committed)
├── .env.local.example        # Template for teammates
└── tailwind.config.ts        # Tailwind config (add custom keyframes here)
```

### Pattern 1: Server Component Page + Client Component Form
**What:** The landing `page.tsx` is a Server Component (no 'use client'). It imports `SearchForm`, which is a Client Component ('use client') that handles all state and navigation.

**When to use:** Always — keep the page shell as server component, push interactivity down to leaf components.

```typescript
// app/page.tsx — Server Component
import SearchForm from '@/components/SearchForm'

export default function HomePage() {
  return (
    <main>
      <section>
        <h1>Dallas Real Estate Market Analyzer</h1>
        <p>Enter a Dallas zipcode and bedroom count...</p>
        <SearchForm />
      </section>
    </main>
  )
}
```

```typescript
// components/SearchForm.tsx — Client Component
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import zipcodes from '@/lib/dallas-zipcodes.json'

export default function SearchForm() {
  const router = useRouter()
  const [zipcode, setZipcode] = useState('')
  const [bedrooms, setBedrooms] = useState(3)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!(zipcodes as string[]).includes(zipcode)) {
      setError('Please enter a valid Dallas zipcode.')
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }
    setLoading(true)
    router.push(`/dashboard/${zipcode}?bedrooms=${bedrooms}`)
  }
  // ...
}
```

### Pattern 2: Dashboard Page with Async Params (Next.js 15)
**What:** The dashboard page receives `params` and `searchParams` as async Promises in Next.js 15. The page must await them.

**When to use:** Any dynamic route page in Next.js 15+.

```typescript
// app/dashboard/[zipcode]/page.tsx — Server Component
import { mockData } from '@/lib/mock-data'
import PriceChart from '@/components/PriceChart'
import ConfidenceGauge from '@/components/ConfidenceGauge'
import BedroomCards from '@/components/BedroomCards'

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ zipcode: string }>
  searchParams: Promise<{ bedrooms?: string }>
}) {
  const { zipcode } = await params
  const { bedrooms: bedroomsStr } = await searchParams
  const bedrooms = parseInt(bedroomsStr ?? '3', 10)

  // Phase 1: use mock data. Phase 3: fetch from API routes.
  const data = mockData

  return (
    <div className="grid ...">
      {/* DashboardHeader, PriceChart, ForecastCallout, ConfidenceGauge, BedroomCards */}
    </div>
  )
}
```

### Pattern 3: Recharts LineChart with Forecast Annotation
**What:** Historical line (solid) + future region (ReferenceArea shaded) + today marker (ReferenceLine vertical) + forecast point (ReferenceDot or custom dot at end of dashed Line segment).

```typescript
// components/PriceChart.tsx
'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer
} from 'recharts'

type DataPoint = { date: string; zhvi: number; isForecast?: boolean }

export default function PriceChart({ data }: { data: DataPoint[] }) {
  const today = new Date().toISOString().slice(0, 7) // 'YYYY-MM'

  const formatY = (value: number) => `$${(value / 1000).toFixed(0)}k`
  const formatX = (tick: string) => {
    const d = new Date(tick)
    return d.toLocaleString('default', { month: 'short', year: '2-digit' })
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" tickFormatter={formatX} minTickGap={40} />
        <YAxis tickFormatter={formatY} width={60} />
        <Tooltip formatter={(v: number) => formatY(v)} />

        {/* Shaded future zone */}
        <ReferenceArea x1={today} fill="#d1fae5" fillOpacity={0.4} />

        {/* Today vertical line */}
        <ReferenceLine x={today} stroke="#6b7280" strokeDasharray="4 2" label={{ value: 'Today', position: 'top', fontSize: 11 }} />

        {/* Historical solid line */}
        <Line
          type="monotone"
          dataKey="zhvi"
          stroke="#0f766e"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />

        {/* Forecast dashed extension — filter to forecast points only or use separate data */}
        <Line
          type="monotone"
          dataKey="forecast"
          stroke="#0f766e"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={{ r: 5, fill: '#0f766e', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

### Pattern 4: Semicircle Gauge with Recharts PieChart
**What:** Two overlapping Pie components with `startAngle={180}` and `endAngle={0}`. The background ring is a full half-circle. The foreground arc fills to `confidence * 180` degrees.

```typescript
// components/ConfidenceGauge.tsx
'use client'
import { PieChart, Pie, Cell } from 'recharts'

type Props = { direction: 'up' | 'down'; confidence: number }

export default function ConfidenceGauge({ direction, confidence }: Props) {
  const color = direction === 'up' ? '#16a34a' : '#dc2626'
  const filled = confidence        // fraction 0-1
  const unfilled = 1 - confidence

  const data = [
    { value: filled },
    { value: unfilled },
  ]

  const bg = [{ value: 1 }]

  return (
    <div className="relative flex flex-col items-center">
      <PieChart width={200} height={110}>
        {/* Background ring */}
        <Pie
          data={bg}
          cx={100} cy={100}
          innerRadius={60} outerRadius={80}
          startAngle={180} endAngle={0}
          stroke="none"
        >
          <Cell fill="#e5e7eb" />
        </Pie>
        {/* Filled arc */}
        <Pie
          data={data}
          cx={100} cy={100}
          innerRadius={60} outerRadius={80}
          startAngle={180} endAngle={0}
          stroke="none"
        >
          <Cell fill={color} />
          <Cell fill="transparent" />
        </Pie>
      </PieChart>
      <div className="absolute bottom-2 flex flex-col items-center">
        <span className={`text-2xl font-bold ${direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {direction === 'up' ? 'UP' : 'DOWN'}
        </span>
        <span className="text-sm text-gray-500">{Math.round(confidence * 100)}% confidence</span>
      </div>
    </div>
  )
}
```

### Pattern 5: Shake Animation via Tailwind Custom Keyframes
**What:** Add shake keyframes in `tailwind.config.ts`, apply class conditionally when validation fails.

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%':      { transform: 'translateX(-6px)' },
          '40%':      { transform: 'translateX(6px)' },
          '60%':      { transform: 'translateX(-4px)' },
          '80%':      { transform: 'translateX(4px)' },
        },
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
      },
    },
  },
  plugins: [],
}
export default config
```

```tsx
<input
  className={`border rounded px-4 py-2 ${shake ? 'animate-shake' : ''}`}
  ...
/>
```

### Anti-Patterns to Avoid
- **Putting 'use client' on page.tsx:** Breaks Server Component data fetching. Push 'use client' down to interactive leaves only.
- **Accessing params/searchParams synchronously in Next.js 15:** `params.zipcode` without `await` produces a deprecation warning. Always `const { zipcode } = await params`.
- **Using emoji as icons:** Use lucide-react SVG icons. Per UI skill: "No emoji icons" rule is CRITICAL.
- **Validation only on submit:** Validate on blur for the zipcode input in addition to submit (per UI skill UX guidelines).
- **Single source data key for historical + forecast:** Keep them as separate `dataKey`s on separate `<Line>` components, or include a `forecast` field that is `undefined` for historical points and a number for the forecast point. This avoids `connectNulls` issues.
- **Skipping Suspense around useSearchParams:** If any Client Component uses `useSearchParams`, it must be wrapped in `<Suspense>` during production builds or the build fails.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Line chart with tooltips, axes, responsive sizing | Custom SVG/canvas chart | Recharts 3.x LineChart + ResponsiveContainer | Recharts handles tick math, responsive resizing, tooltip positioning, accessibility |
| SVG arc path math for gauge | Custom arc calculation with trigonometry | Recharts PieChart (startAngle/endAngle) or simple SVG `<path>` with precomputed arc | Getting arc end coordinates from angles is error-prone; Recharts handles it |
| Responsive container width detection | ResizeObserver + state | Recharts ResponsiveContainer | Already does this correctly with proper cleanup |
| Zipcode validation list | API call or regex | Static `lib/dallas-zipcodes.json` import | The list is fixed 113 entries; a JSON array import is instant and requires no network |
| Date formatting for chart axis | Custom date parsing | `tickFormatter` prop on XAxis with `toLocaleString` or `Intl.DateTimeFormat` | No extra library needed |

**Key insight:** Recharts 3.x handles all the SVG layout, D3 scale math, and tooltip positioning. The only custom SVG needed is the ConfidenceGauge, which can be done with two overlapping Pie components — no trigonometry required.

---

## Common Pitfalls

### Pitfall 1: Next.js 15 Async Params Breaking the Dashboard Page
**What goes wrong:** The dashboard page reads `params.zipcode` or `searchParams.bedrooms` synchronously. In Next.js 15, these are Promises. The page gets `undefined` for both values, and the dashboard renders empty or crashes.
**Why it happens:** Next.js 15 made `params` and `searchParams` async to support streaming and partial rendering.
**How to avoid:** Declare the page `async`, type `params` as `Promise<{ zipcode: string }>`, and `await params` before destructuring.
**Warning signs:** `params.zipcode` is `undefined`; TypeScript shows type `Promise<...>` not assignable to `string`.

### Pitfall 2: Recharts 3.x Breaking Changes from 2.x
**What goes wrong:** Code copied from Recharts 2.x tutorials uses `<Customized>` for internal state, or accesses `activeIndex` / `points` props on custom components. These are removed in 3.x.
**Why it happens:** Recharts 3.0 replaced the internal `CategoricalChartState` with hooks.
**How to avoid:** Use only documented 3.x props. For any chart state access, use the new hooks (`useActiveTooltipLabel`). For basic LineChart + ReferenceLine usage, the 2.x API is compatible.
**Warning signs:** TypeScript errors on props that previously existed; runtime errors in custom `<Customized>` components.

### Pitfall 3: Recharts Client-Side Only
**What goes wrong:** Recharts components are imported in a Server Component. Build fails with "window is not defined" or similar.
**Why it happens:** Recharts uses browser APIs (ResizeObserver, SVG measurement).
**How to avoid:** Always add `'use client'` to any component that imports from `recharts`. Never import Recharts in `page.tsx` directly — only in leaf components.
**Warning signs:** "ReferenceError: window is not defined" during `next build`.

### Pitfall 4: PriceChart Data Shape Mismatch Between Mock and Real API
**What goes wrong:** The mock data shape doesn't match the real API response shape. In Phase 3, swapping mock for real data breaks the chart.
**Why it happens:** Mock data was typed loosely or fields were named differently.
**How to avoid:** Define shared TypeScript interfaces in `lib/types.ts` for both the history response (`{ date: string; zhvi: number }[]`) and prediction response. Both mock-data.ts and the API route must return these exact types.
**Warning signs:** TypeScript errors when replacing mock with API call in Phase 3.

### Pitfall 5: Shake Animation Not Resetting
**What goes wrong:** The shake animation fires once, then the `animate-shake` class stays on the element. Subsequent invalid submits don't trigger the animation again.
**Why it happens:** React doesn't re-trigger a CSS animation if the class is already present.
**How to avoid:** Use a `shake` state boolean. On validation failure: set `shake(true)`, then `setTimeout(() => setShake(false), 500)`. The class is removed then re-added on the next failure.

### Pitfall 6: useSearchParams Causing Build Failure Without Suspense
**What goes wrong:** `next build` fails with "Missing Suspense boundary with useSearchParams" in production.
**Why it happens:** Next.js requires Client Components using `useSearchParams` to be wrapped in `<Suspense>` for static pages.
**How to avoid:** Prefer reading `searchParams` from the Server Component page prop (async, await). Only use `useSearchParams` hook in deeply nested Client Components, and wrap those in `<Suspense fallback={...}>`.

---

## Code Examples

Verified patterns from official sources:

### Mock Data Structure (lib/mock-data.ts)
```typescript
// Source: defined by team, shaped to match CLAUDE.md API contracts
export interface HistoryPoint {
  date: string   // 'YYYY-MM-DD'
  zhvi: number
}

export interface PredictionResult {
  zipcode: string
  bedrooms: number
  predicted_price: number
  direction: 'up' | 'down'
  confidence: number
  current_price: number
  predicted_change_dollars: number
  predicted_change_pct: number
}

export interface BedroomPrices {
  '2br': number
  '3br': number
  '4br': number
  '5br': number
}

export const MOCK_HISTORY: HistoryPoint[] = [
  { date: '2019-01-01', zhvi: 298000 },
  { date: '2019-07-01', zhvi: 310000 },
  { date: '2020-01-01', zhvi: 318000 },
  { date: '2020-07-01', zhvi: 335000 },
  { date: '2021-01-01', zhvi: 360000 },
  { date: '2021-07-01', zhvi: 390000 },
  { date: '2022-01-01', zhvi: 418000 },
  { date: '2022-07-01', zhvi: 430000 },
  { date: '2023-01-01', zhvi: 410000 },
  { date: '2023-07-01', zhvi: 398000 },
  { date: '2024-01-01', zhvi: 388000 },
  { date: '2024-07-01', zhvi: 395000 },
  { date: '2025-01-01', zhvi: 403000 },
  { date: '2025-07-01', zhvi: 409000 },
  { date: '2026-01-01', zhvi: 412000 },
]

export const MOCK_PREDICTION: PredictionResult = {
  zipcode: '75252',
  bedrooms: 3,
  predicted_price: 419500,
  direction: 'up',
  confidence: 0.73,
  current_price: 412000,
  predicted_change_dollars: 7500,
  predicted_change_pct: 1.82,
}

export const MOCK_BEDROOM_PRICES: BedroomPrices = {
  '2br': 298000,
  '3br': 412000,
  '4br': 538000,
  '5br': 695000,
}

export const MOCK_CITY = 'Farmers Branch'
```

### Dallas Zipcodes JSON (lib/dallas-zipcodes.json)
```json
["75001", "75006", "75007", "75019", "75038", "75039", "75040",
 "75041", "75042", "75043", "75044", "75048", "75051", "75052",
 "75054", "75060", "75061", "75062", "75063", "75067", "75075",
 "75080", "75081", "75082", "75083", "75087", "75088", "75089",
 "75093", "75094", "75098", "75104", "75115", "75116", "75119",
 "75125", "75126", "75132", "75134", "75135", "75141", "75142",
 "75146", "75149", "75150", "75154", "75157", "75159", "75160",
 "75161", "75165", "75166", "75172", "75173", "75180", "75181",
 "75182", "75189", "75201", "75202", "75203", "75204", "75205",
 "75206", "75207", "75208", "75209", "75210", "75211", "75212",
 "75214", "75215", "75216", "75217", "75218", "75219", "75220",
 "75223", "75224", "75225", "75226", "75227", "75228", "75229",
 "75230", "75231", "75232", "75233", "75234", "75235", "75236",
 "75237", "75238", "75240", "75241", "75243", "75244", "75246",
 "75247", "75248", "75249", "75251", "75252", "75253", "75254",
 "75287"]
```
Note: Planner should verify the exact 113 zipcodes against `dallas_zipcodes_reference.xlsx` when creating the DATA-01 task. The above is a placeholder approximation; the actual file must come from the authoritative source.

### Navigation Pattern (useRouter in 'use client')
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/use-router
'use client'
import { useRouter } from 'next/navigation'

const router = useRouter()
// Navigate to dashboard
router.push(`/dashboard/${zipcode}?bedrooms=${bedrooms}`)
```

### API Route Stub (app/api/history/route.ts)
```typescript
// Phase 1: returns mock data. Phase 3: proxies to Modal.
import { MOCK_HISTORY } from '@/lib/mock-data'

export async function POST(_req: Request) {
  // Phase 3: const body = await req.json()
  // const res = await fetch(process.env.MODAL_HISTORY_URL!, { method: 'POST', ... })
  return Response.json(MOCK_HISTORY)
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js Pages Router (`pages/`) | App Router (`app/`) with Server Components | Next.js 13 (stable 14) | Server Components by default; 'use client' only where needed |
| Synchronous `params` and `searchParams` | Async `Promise<params>` — must `await` | Next.js 15 | Dashboard page must be `async` and `await params` |
| Recharts 2.x internal state via `<Customized>` | Recharts 3.x hooks (`useActiveTooltipLabel`) | Recharts 3.0 (2024) | Custom components using internal state must migrate to hooks |
| Turbopack beta (Next 14) | Turbopack stable (Next 15) | Next.js 15 | Faster dev builds; no config change needed |
| `accessibilityLayer` prop required | Accessibility enabled by default | Recharts 3.0 | One less prop to add |

**Deprecated/outdated:**
- Recharts 2.x `<Customized>` with internal props: removed in 3.x
- `params.zipcode` synchronous access in Next.js 15: still works but deprecated, will be removed in a future version
- `create-next-app` with `--no-turbopack`: Turbopack is now default and recommended

---

## Open Questions

1. **Exact 113 Dallas zipcodes list**
   - What we know: CLAUDE.md references `dallas_zipcodes_reference.xlsx` with 113 curated core Dallas zipcodes
   - What's unclear: The file is not in the repo. The DATA-01 task must convert it to `lib/dallas-zipcodes.json`. The list above in the code examples is approximate.
   - Recommendation: First task should be locating/obtaining this file, or deriving the 113 zipcodes from the 255-zipcode training set programmatically.

2. **About page vs. modal**
   - What we know: User said "About link is included (page or modal TBD — Claude's discretion)"
   - What's unclear: A simple `/about` page (an `app/about/page.tsx`) requires less state management than a modal and works as a direct URL. A modal keeps the user on the current page.
   - Recommendation: Use a `/about` page — simpler to implement, shareable URL, zero additional state management.

3. **Next.js version: 14 vs 15**
   - What we know: CLAUDE.md says "Next.js 14+" but Next.js 15 is current stable (March 2026). Next.js 15 changes params to async.
   - What's unclear: Whether the team explicitly wants 14 or just meant "at least 14."
   - Recommendation: Use Next.js 15 (latest stable). The async params pattern is a small code change; starting on 15 avoids a future migration. The planner should make this explicit in the bootstrap task.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library (recommended) or Jest + React Testing Library |
| Config file | `vitest.config.ts` — Wave 0 gap (does not exist) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

**Rationale for Vitest over Jest:** Vitest is faster, natively supports ESM (required for Recharts 3.x), and has identical Jest-compatible API. Next.js 15 projects work well with either, but Vitest avoids the Babel/SWC transform configuration overhead for ESM packages like Recharts.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAND-01 | Zipcode input renders and accepts text | unit | `npx vitest run tests/SearchForm.test.tsx` | Wave 0 |
| LAND-02 | Bedroom toggle buttons render; clicking changes selection | unit | `npx vitest run tests/SearchForm.test.tsx` | Wave 0 |
| LAND-03 | Invalid zipcode shows error + shake class; valid zipcode passes | unit | `npx vitest run tests/SearchForm.test.tsx` | Wave 0 |
| LAND-04 | Valid submit calls `router.push` with correct URL | unit (mock router) | `npx vitest run tests/SearchForm.test.tsx` | Wave 0 |
| COMP-01 | PriceChart renders without crash when given data array | unit | `npx vitest run tests/PriceChart.test.tsx` | Wave 0 |
| COMP-02 | ConfidenceGauge renders UP/DOWN label and confidence % | unit | `npx vitest run tests/ConfidenceGauge.test.tsx` | Wave 0 |
| COMP-03 | BedroomCards renders four cards; selected tier has highlight class | unit | `npx vitest run tests/BedroomCards.test.tsx` | Wave 0 |
| DATA-01 | dallas-zipcodes.json is importable and is a string array with 113 entries | unit | `npx vitest run tests/zipcodes.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/<component>.test.tsx` (relevant file only)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/SearchForm.test.tsx` — covers LAND-01, LAND-02, LAND-03, LAND-04
- [ ] `tests/PriceChart.test.tsx` — covers COMP-01
- [ ] `tests/ConfidenceGauge.test.tsx` — covers COMP-02
- [ ] `tests/BedroomCards.test.tsx` — covers COMP-03
- [ ] `tests/zipcodes.test.ts` — covers DATA-01
- [ ] `vitest.config.ts` — framework config
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom`

---

## Sources

### Primary (HIGH confidence)
- [Next.js official docs — page.js API reference](https://nextjs.org/docs/app/api-reference/file-conventions/page) — params/searchParams async pattern, TypeScript types (retrieved 2026-03-05, last updated 2026-02-27)
- [Next.js official docs — useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router) — client-side navigation
- [Next.js official docs — useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params) — Suspense requirement
- [Recharts 3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide) — breaking changes from 2.x
- [Recharts Line component API](https://recharts.github.io/en-US/api/Line) — strokeDasharray, dot, type props
- [Tailwind CSS animation docs](https://tailwindcss.com/docs/animation) — custom keyframes pattern
- UI/UX Pro Max skill (project skill) — design system, accessibility guidelines, icon rules

### Secondary (MEDIUM confidence)
- [npm recharts page](https://www.npmjs.com/package/recharts) — confirmed 3.7.0 latest version, ~3,671 dependents
- [Recharts gauge chart gist](https://gist.github.com/emiloberg/ee549049ea0f6b83e25f1a1110947086) — PieChart semicircle pattern (community source, verified Recharts Pie accepts startAngle/endAngle)
- Next.js 15 vs 14 comparison — confirmed async params change; Next.js 15 is current stable

### Tertiary (LOW confidence)
- None — all key claims verified against official docs or Context7

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed via npm and official Next.js docs
- Architecture: HIGH — patterns from official Next.js docs; Recharts API from official docs
- Pitfalls: HIGH — Next.js 15 async params verified in official docs; Recharts 3.x breaking changes from official migration guide
- Validation architecture: MEDIUM — Vitest recommendation based on ESM compatibility reasoning; no existing test infra to reference

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable ecosystem; Next.js releases roughly quarterly, Recharts less frequently)
