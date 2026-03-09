import { describe, it, expect } from 'vitest'
import zipcodes from '../lib/dallas-zipcodes.json'

describe('DATA-01: dallas-zipcodes.json', () => {
  it('is an array', () => {
    expect(Array.isArray(zipcodes)).toBe(true)
  })

  it('contains exactly 113 entries', () => {
    expect(zipcodes).toHaveLength(113)
  })

  it('all entries are 5-digit strings', () => {
    for (const zip of zipcodes as string[]) {
      expect(zip).toMatch(/^\d{5}$/)
    }
  })

  it('contains known Dallas zipcodes', () => {
    expect(zipcodes).toContain('75252')
    expect(zipcodes).toContain('75201')
    expect(zipcodes).toContain('75287')
  })

  it('has no duplicates', () => {
    const unique = new Set(zipcodes as string[])
    expect(unique.size).toBe(113)
  })
})
