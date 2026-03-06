import SearchForm from '@/components/SearchForm'

export default function HomePage() {
  return (
    <main>
      {/* Hero section with gradient background */}
      <section className="min-h-[calc(100vh-56px)] bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex flex-col items-center justify-center px-4 py-16">
        {/* Headline block */}
        <div className="text-center mb-10 max-w-2xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-3 leading-tight">
            Dallas Home Price Forecast
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Enter a zipcode and bedroom count. Get a data-backed forecast for next month.
          </p>
          <p className="text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
            Powered by 5 years of Zillow Home Value Index (ZHVI) data for 113 Dallas-area zipcodes.
            Our XGBoost model predicts next month&apos;s median home price and directional confidence.
          </p>
        </div>

        {/* Search form card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <SearchForm />
        </div>

        {/* Footnote */}
        <p className="mt-6 text-xs text-gray-400 text-center">
          Data source: Zillow ZHVI · Covers 113 curated core Dallas zipcodes
        </p>
      </section>
    </main>
  )
}
