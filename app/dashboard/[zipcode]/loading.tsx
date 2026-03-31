/**
 * Dashboard loading skeleton — mirrors the exact layout of page.tsx
 * so content appears to "fill in" without layout shift.
 */

function Bone({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded bg-teal-800/[0.04] relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  )
}

function SectionLabel({ width = 'w-28' }: { width?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-px w-5 bg-teal-800/15" />
      <Bone className={`h-[11px] ${width}`} />
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <main className="min-h-[calc(100dvh-56px)]">
      <div className="flex flex-col lg:flex-row">
        {/* ── Left content ── */}
        <div className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-6 lg:px-10 py-8 space-y-8">

            {/* Header — matches DashboardHeader layout */}
            <div className="flex items-end justify-between flex-wrap gap-4 pb-6 border-b border-gray-200/80">
              <div className="space-y-2.5">
                <Bone className="h-[11px] w-28" />
                <Bone className="h-8 w-52" />
              </div>
              <div className="flex flex-col items-end gap-2.5">
                <Bone className="h-8 w-36" />
                <Bone className="h-[14px] w-32" />
              </div>
            </div>

            {/* Chart — matches PriceChart container */}
            <section>
              <SectionLabel width="w-[106px]" />
              <div className="bg-white rounded border border-gray-200/80 p-6">
                <div className="h-[360px] relative">
                  {/* Faint grid lines */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-dashed border-teal-800/[0.04]"
                      style={{ top: `${i * 25}%` }}
                    />
                  ))}
                  {/* SVG line that hints at a price trend */}
                  <svg
                    viewBox="0 0 400 140"
                    preserveAspectRatio="none"
                    className="absolute inset-x-0 bottom-0 h-[85%] w-full"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="sk-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(15 118 110)" stopOpacity="0.06" />
                        <stop offset="100%" stopColor="rgb(15 118 110)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Area fill */}
                    <path
                      d="M0,95 C30,90 60,85 100,78 C140,71 170,55 200,42 C230,29 250,18 280,22 C310,26 340,35 370,30 C385,28 395,26 400,25 L400,140 L0,140 Z"
                      fill="url(#sk-fill)"
                    />
                    {/* Stroke line */}
                    <path
                      d="M0,95 C30,90 60,85 100,78 C140,71 170,55 200,42 C230,29 250,18 280,22 C310,26 340,35 370,30 C385,28 395,26 400,25"
                      fill="none"
                      stroke="rgb(15 118 110)"
                      strokeOpacity="0.1"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </section>

            {/* Forecast + Direction Signal — matches 2-col grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Forecast card */}
              <section>
                <SectionLabel width="w-[98px]" />
                <div className="rounded border border-gray-200/80 p-6 h-[calc(100%-2rem)] space-y-4">
                  <Bone className="h-10 w-40" />
                  <Bone className="h-[15px] w-48" />
                  <Bone className="h-3 w-44" />
                </div>
              </section>

              {/* Gauge card */}
              <section>
                <SectionLabel width="w-[98px]" />
                <div className="bg-white rounded border border-gray-200/80 p-6 flex flex-col items-center justify-center h-[calc(100%-2rem)] gap-1">
                  {/* Half-circle matching ConfidenceGauge's SVG arc */}
                  <svg viewBox="0 0 200 105" className="w-[180px]" aria-hidden="true">
                    <path
                      d="M 30 90 A 70 70 0 0 1 170 90"
                      fill="none"
                      stroke="rgb(15 118 110)"
                      strokeOpacity="0.06"
                      strokeWidth="14"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="flex flex-col items-center -mt-12">
                    <Bone className="h-7 w-10" />
                    <Bone className="h-[13px] w-24 mt-1" />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <aside className="w-full lg:w-[380px] xl:w-[420px] shrink-0 lg:sticky lg:top-14 lg:h-[calc(100dvh-56px)] bg-white border-t lg:border-t-0 lg:border-l border-gray-200/60">
          <div className="flex flex-col h-full">
            {/* Map placeholder */}
            <div className="h-[280px] lg:h-[320px] w-full bg-teal-800/[0.03] relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </div>

            {/* Location info */}
            <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto">
              {/* Location header */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-px w-5 bg-teal-800/15" />
                  <Bone className="h-[10px] w-14" />
                </div>
                <Bone className="h-7 w-32 mt-2" />
                <Bone className="h-[14px] w-14 mt-1.5" />
              </div>

              {/* Quick stats */}
              <div className="space-y-4">
                <div>
                  <Bone className="h-[10px] w-24 mb-2" />
                  <Bone className="h-7 w-28" />
                </div>
                <div>
                  <Bone className="h-[10px] w-24 mb-2" />
                  <Bone className="h-[18px] w-14" />
                </div>
              </div>

              {/* Bedroom cards — vertical list matching BedroomCards */}
              <div>
                <Bone className="h-[10px] w-28 mb-3" />
                <div className="space-y-2">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`flex items-center justify-between rounded px-4 py-3 ${
                        i === 1 ? 'bg-teal-800/[0.06]' : 'bg-teal-800/[0.02]'
                      }`}
                    >
                      <Bone className="h-[14px] w-8" />
                      <Bone className="h-[14px] w-20" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
