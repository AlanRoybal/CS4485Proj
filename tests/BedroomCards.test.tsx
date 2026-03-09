import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BedroomCards from '../components/BedroomCards'
import { MOCK_BEDROOM_PRICES } from '../lib/mock-data'

describe('COMP-03: BedroomCards', () => {
  it('renders four cards', () => {
    const { getAllByRole } = render(
      <BedroomCards prices={MOCK_BEDROOM_PRICES} selectedBedrooms={3} />
    )
    expect(getAllByRole('listitem')).toHaveLength(4)
  })

  it('renders the selected bedroom tier with highlight class', () => {
    const { container } = render(
      <BedroomCards prices={MOCK_BEDROOM_PRICES} selectedBedrooms={3} />
    )
    expect(container.innerHTML).toContain('bg-teal-800')
  })

  it('renders 3 BR label', () => {
    render(<BedroomCards prices={MOCK_BEDROOM_PRICES} selectedBedrooms={3} />)
    expect(screen.getByText('3 BR')).toBeTruthy()
  })

  it('formats prices as dollar amounts', () => {
    render(<BedroomCards prices={MOCK_BEDROOM_PRICES} selectedBedrooms={3} />)
    // $412,000 formatted
    expect(screen.getByText('$412,000')).toBeTruthy()
  })
})
