import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ConfidenceGauge from '../components/ConfidenceGauge'

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver

describe('COMP-02: ConfidenceGauge', () => {
  it('renders UP label when direction is "up"', () => {
    render(<ConfidenceGauge direction="up" confidence={0.73} />)
    expect(screen.getByText('UP')).toBeTruthy()
  })

  it('renders DOWN label when direction is "down"', () => {
    render(<ConfidenceGauge direction="down" confidence={0.42} />)
    expect(screen.getByText('DOWN')).toBeTruthy()
  })

  it('displays the correct confidence percentage', () => {
    render(<ConfidenceGauge direction="up" confidence={0.73} />)
    expect(screen.getByText('73% confidence')).toBeTruthy()
  })

  it('applies green color class when direction is "up"', () => {
    const { container } = render(<ConfidenceGauge direction="up" confidence={0.73} />)
    expect(container.innerHTML).toContain('text-green-600')
  })

  it('applies red color class when direction is "down"', () => {
    const { container } = render(<ConfidenceGauge direction="down" confidence={0.42} />)
    expect(container.innerHTML).toContain('text-red-600')
  })
})
