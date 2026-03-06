'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import zipcodes from '@/lib/dallas-zipcodes.json'

const BEDROOM_OPTIONS = [
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5+', value: 5 },
]

export default function SearchForm() {
  const router = useRouter()
  const [zipcode, setZipcode] = useState('')
  const [bedrooms, setBedrooms] = useState(3)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)

  function triggerShake() {
    setShake(true)
    setTimeout(() => setShake(false), 400)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = zipcode.trim()

    if (!/^\d{5}$/.test(trimmed)) {
      setError('Please enter a 5-digit zipcode.')
      triggerShake()
      return
    }

    if (!(zipcodes as string[]).includes(trimmed)) {
      setError('Please enter a valid Dallas-area zipcode.')
      triggerShake()
      return
    }

    setError('')
    setLoading(true)
    router.push(`/dashboard/${trimmed}?bedrooms=${bedrooms}`)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-md mx-auto">
      {/* Zipcode input */}
      <div className="mb-5">
        <label htmlFor="zipcode-input" className="block text-sm font-medium text-gray-700 mb-1">
          Dallas Zipcode
        </label>
        <input
          id="zipcode-input"
          type="text"
          inputMode="numeric"
          maxLength={5}
          placeholder="e.g., 75252"
          value={zipcode}
          onChange={e => { setZipcode(e.target.value); setError('') }}
          className={`w-full border rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors ${
            error ? 'border-red-400' : 'border-gray-300'
          } ${shake ? 'animate-shake' : ''}`}
          aria-describedby={error ? 'zipcode-error' : undefined}
          aria-invalid={!!error}
          disabled={loading}
        />
        {error && (
          <p id="zipcode-error" className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Bedroom toggle */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-2">Bedrooms</p>
        <div className="flex gap-2" role="group" aria-label="Select bedroom count">
          {BEDROOM_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBedrooms(opt.value)}
              disabled={loading}
              aria-pressed={bedrooms === opt.value}
              className={`flex-1 py-2 px-3 rounded-lg border-2 font-semibold text-sm transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 ${
                bedrooms === opt.value
                  ? 'border-teal-600 bg-teal-600 text-white'
                  : 'border-gray-300 text-gray-700 hover:border-teal-400 hover:text-teal-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-6 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
        {loading ? 'Loading...' : 'Analyze Market'}
      </button>
    </form>
  )
}
