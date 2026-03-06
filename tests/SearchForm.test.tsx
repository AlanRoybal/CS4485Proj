import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// These imports will fail (RED) until Plan 03 creates the component
// import SearchForm from '../components/SearchForm'

describe('LAND-01: Zipcode input', () => {
  it.todo('renders a text input for zipcode with placeholder hint')
  it.todo('accepts 5-digit input')
})

describe('LAND-02: Bedroom toggle', () => {
  it.todo('renders four bedroom buttons: 2, 3, 4, 5+')
  it.todo('clicking a button selects it and deselects others')
  it.todo('default selection is 3')
})

describe('LAND-03: Zipcode validation', () => {
  it.todo('shows inline error text when invalid zipcode is submitted')
  it.todo('does not navigate on invalid submit')
  it.todo('applies animate-shake class on invalid submit')
})

describe('LAND-04: Navigation on valid submit', () => {
  it.todo('calls router.push with /dashboard/[zipcode]?bedrooms=[n] on valid submit')
})
