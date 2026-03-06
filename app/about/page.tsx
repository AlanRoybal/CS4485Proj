import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AboutPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-800 mb-8 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 rounded"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Search
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-4">About This Tool</h1>

      <div className="prose prose-gray max-w-none space-y-4 text-gray-700 leading-relaxed">
        <p>
          The Dallas Real Estate Market Analyzer is a UT Dallas UTDesign Capstone project (Spring 2026,
          Advisor: Muhammad Ikram). It helps homebuyers and sellers understand where Dallas-area home
          prices are heading by combining historical Zillow data with machine learning forecasts.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-6">How it works</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Enter a Dallas zipcode and bedroom count</li>
          <li>See 5 years of historical Zillow Home Value Index (ZHVI) data for that market segment</li>
          <li>Receive a 1-month-ahead price prediction from an XGBoost regression model</li>
          <li>Get a directional confidence signal (will prices go up or down?) from a Logistic Regression model</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-6">Data</h2>
        <p>
          Data comes exclusively from Zillow ZHVI CSV files — no external APIs, no real-time feeds.
          The model was trained on 63,477 rows of monthly data for 255 Dallas-area zipcodes through
          December 2022. This tool covers 113 curated core Dallas zipcodes.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-6">Limitations</h2>
        <p>
          Predictions are 1 month ahead only. Past performance does not guarantee future results.
          This tool is for informational purposes and is not financial advice.
        </p>
      </div>
    </main>
  )
}
