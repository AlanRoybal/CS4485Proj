import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import PriceChart from '../components/PriceChart'
import { buildChartData, MOCK_HISTORY, MOCK_PREDICTION } from '../lib/mock-data'

// Mock ResizeObserver (not available in jsdom)
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver

beforeAll(() => {
  // Recharts ResponsiveContainer uses getBoundingClientRect to determine size.
  // In jsdom there is no layout engine, so we mock it to return a real size.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 800,
    height: 350,
    top: 0,
    left: 0,
    bottom: 350,
    right: 800,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
})

const sampleData = buildChartData(MOCK_HISTORY, MOCK_PREDICTION)

describe('COMP-01: PriceChart', () => {
  it('renders without crashing when given a valid data array', () => {
    expect(() => render(<PriceChart data={sampleData} />)).not.toThrow()
  })

  it('renders an SVG element (Recharts output)', () => {
    const { container } = render(<PriceChart data={sampleData} />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders with empty data array without crashing', () => {
    expect(() => render(<PriceChart data={[]} />)).not.toThrow()
  })
})
