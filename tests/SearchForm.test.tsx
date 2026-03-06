import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next/navigation before importing SearchForm
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import SearchForm from '../components/SearchForm'

beforeEach(() => {
  mockPush.mockClear()
})

describe('LAND-01: Zipcode input', () => {
  it('renders a text input with placeholder hint', () => {
    render(<SearchForm />)
    const input = screen.getByPlaceholderText(/75252/i)
    expect(input).toBeTruthy()
  })

  it('accepts typed text', async () => {
    const user = userEvent.setup()
    render(<SearchForm />)
    const input = screen.getByPlaceholderText(/75252/i) as HTMLInputElement
    await user.type(input, '75252')
    expect(input.value).toBe('75252')
  })
})

describe('LAND-02: Bedroom toggle', () => {
  it('renders four bedroom buttons', () => {
    render(<SearchForm />)
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()
    expect(screen.getByText('5+')).toBeTruthy()
  })

  it('default selection is 3 (aria-pressed)', () => {
    render(<SearchForm />)
    const btn3 = screen.getByText('3').closest('button')
    expect(btn3?.getAttribute('aria-pressed')).toBe('true')
  })

  it('clicking a button changes selection', async () => {
    const user = userEvent.setup()
    render(<SearchForm />)
    const btn4 = screen.getByText('4').closest('button')!
    await user.click(btn4)
    expect(btn4.getAttribute('aria-pressed')).toBe('true')
  })
})

describe('LAND-03: Zipcode validation', () => {
  it('shows inline error when invalid zipcode is submitted', async () => {
    const user = userEvent.setup()
    render(<SearchForm />)
    const input = screen.getByPlaceholderText(/75252/i)
    await user.type(input, '99999')
    const submitBtn = screen.getByRole('button', { name: /analyze market/i })
    await user.click(submitBtn)
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('does not call router.push on invalid submit', async () => {
    const user = userEvent.setup()
    render(<SearchForm />)
    const input = screen.getByPlaceholderText(/75252/i)
    await user.type(input, '99999')
    const submitBtn = screen.getByRole('button', { name: /analyze market/i })
    await user.click(submitBtn)
    expect(mockPush).not.toHaveBeenCalled()
  })
})

describe('LAND-04: Navigation on valid submit', () => {
  it('calls router.push with correct URL on valid Dallas zipcode', async () => {
    const user = userEvent.setup()
    render(<SearchForm />)
    const input = screen.getByPlaceholderText(/75252/i)
    await user.type(input, '75252')
    const submitBtn = screen.getByRole('button', { name: /analyze market/i })
    await user.click(submitBtn)
    expect(mockPush).toHaveBeenCalledWith('/dashboard/75252?bedrooms=3')
  })
})
