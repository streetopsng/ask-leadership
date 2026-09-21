import { describe, it, expect } from 'vitest'
import { toDate, timestampMillis, formatTimestamp } from '../timestamps'

describe('toDate', () => {
  it('passes Date instances through', () => {
    const d = new Date(1772047200000)
    expect(toDate(d)).toBe(d)
  })

  it('coerces epoch millis numbers', () => {
    expect(toDate(1772047200000)?.getTime()).toBe(1772047200000)
  })

  it('unwraps Firestore Timestamp-like objects', () => {
    const d = new Date(1772047200000)
    expect(toDate({ toDate: () => d })).toBe(d)
  })

  it('returns null for missing or invalid values', () => {
    expect(toDate(null)).toBeNull()
    expect(toDate(undefined)).toBeNull()
    expect(toDate('not-a-date')).toBeNull()
    expect(toDate({})).toBeNull()
    expect(toDate(new Date('invalid'))).toBeNull()
  })
})

describe('timestampMillis', () => {
  it('returns epoch millis for usable values and 0 otherwise', () => {
    expect(timestampMillis(1772047200000)).toBe(1772047200000)
    expect(timestampMillis({ toMillis: () => 1772047200000 })).toBe(1772047200000)
    expect(timestampMillis(null)).toBe(0)
  })
})

describe('formatTimestamp', () => {
  it('formats in local time and blanks out unusable values', () => {
    const d = new Date(1772047200000)
    const pad = (n: number) => String(n).padStart(2, '0')
    const expected = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    expect(formatTimestamp(1772047200000)).toBe(expected)
    expect(formatTimestamp(null)).toBe('')
  })
})