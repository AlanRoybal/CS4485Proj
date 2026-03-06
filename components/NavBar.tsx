import Link from 'next/link'
import { MapPin } from 'lucide-react'

export default function NavBar() {
  return (
    <nav className="sticky top-0 z-50 bg-teal-800 text-white shadow-md" role="navigation" aria-label="Main navigation">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg hover:text-teal-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-300 rounded"
          aria-label="Dallas Real Estate Market Analyzer — home"
        >
          <MapPin size={20} aria-hidden="true" />
          <span>Dallas RE Analyzer</span>
        </Link>
        <Link
          href="/about"
          className="text-sm font-medium text-teal-100 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-300 rounded px-2 py-1"
        >
          About
        </Link>
      </div>
    </nav>
  )
}
