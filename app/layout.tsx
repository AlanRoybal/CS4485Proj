import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dallas Real Estate Market Analyzer',
  description: 'Data-backed home price forecasts for Dallas-area zipcodes using Zillow ZHVI data and machine learning.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        <NavBar />
        {children}
      </body>
    </html>
  )
}
