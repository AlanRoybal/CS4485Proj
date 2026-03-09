import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AboutPage() {
  return (
    <main className="h-[calc(100dvh-56px)] bg-white overflow-hidden">
      <div className="relative max-w-2xl mx-auto px-6 lg:px-6 h-full flex flex-col py-10">
        {/* Back arrow — on small screens sits in its own row, on lg floats outside the column near "How It Works" */}
        <div className="lg:absolute lg:-left-20 lg:top-[5.75rem] mb-4 lg:mb-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-teal-800 hover:text-teal-900 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600/40 rounded-sm"
            aria-label="Back to home"
          >
            <ArrowLeft size={16} />
            <span className="lg:hidden">Back</span>
          </Link>
        </div>

        {/* Eyebrow */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-px w-5 bg-teal-800" />
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-teal-800">
            About
          </span>
        </div>

        {/* Title */}
        <h1 className="font-serif text-3xl text-gray-950 mb-1">How It Works</h1>
        <p className="text-sm text-gray-400 mb-8">
          UT Dallas UTDesign Capstone &mdash; Spring 2026 &mdash; Advisor: Muhammad Ikram
        </p>

        {/* Content — single column */}
        <div className="space-y-6">
          <p className="text-lg text-gray-700 leading-relaxed">
            Homecast helps homebuyers and sellers understand where Dallas-area home prices are heading
            by combining historical Zillow data with machine learning forecasts.
          </p>

          <div>
            <h2 className="text-sm font-serif text-gray-950 mb-3 pb-2 border-b border-gray-100">
              Process
            </h2>
            <div className="space-y-2">
              {[
                'Enter a Dallas zipcode and bedroom count.',
                'See 5 years of historical ZHVI data.',
                'Receive a 1-month price prediction (XGBoost).',
                'Get a directional confidence signal (Logistic Regression).',
              ].map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="text-sm font-semibold text-teal-800 mt-0.5 tabular-nums w-4 shrink-0">
                    {i + 1}.
                  </span>
                  <span className="text-base text-gray-600">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-serif text-gray-950 mb-3 pb-2 border-b border-gray-100">
              Data
            </h2>
            <p className="text-base text-gray-600 leading-relaxed">
              Zillow ZHVI CSV files only — no external APIs. Trained on{' '}
              <span className="font-semibold text-gray-900">63,477 rows</span> across{' '}
              <span className="font-semibold text-gray-900">255 zipcodes</span>.
              This tool covers{' '}
              <span className="font-semibold text-gray-900">113 curated core Dallas zipcodes</span>.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-serif text-gray-950 mb-3 pb-2 border-b border-gray-100">
              Limitations
            </h2>
            <p className="text-base text-gray-600 leading-relaxed">
              Predictions are{' '}
              <span className="font-semibold text-gray-900">1 month ahead only</span>.
              Past performance does not guarantee future results.
              This is{' '}
              <span className="font-semibold text-gray-900">not financial advice</span>.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
