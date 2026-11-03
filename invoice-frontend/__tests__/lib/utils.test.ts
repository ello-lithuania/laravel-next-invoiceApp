import { ApiError, INVOICE_STATUSES } from '@/lib/api'
import {
  addOneMonth,
  formatCurrency,
  formatDate,
  getErrorMessage,
  statusColors,
  statusLabels,
} from '@/lib/utils'

describe('getErrorMessage', () => {
  it('returns the message of an Error', () => {
    expect(getErrorMessage(new Error('Boom'), 'fallback')).toBe('Boom')
  })

  it('returns the server message of an ApiError', () => {
    const err = new ApiError('Invoice not found', 404)
    expect(getErrorMessage(err, 'fallback')).toBe('Invoice not found')
  })

  it('returns a thrown string as is', () => {
    expect(getErrorMessage('plain text', 'fallback')).toBe('plain text')
  })

  it('uses the fallback for an Error with an empty message', () => {
    expect(getErrorMessage(new Error(''), 'fallback')).toBe('fallback')
  })

  it('uses the fallback for an empty string', () => {
    expect(getErrorMessage('', 'fallback')).toBe('fallback')
  })

  it.each([[null], [undefined], [42], [{ message: 'not an Error' }]])(
    'uses the fallback for unknown value %p',
    (value) => {
      expect(getErrorMessage(value, 'fallback')).toBe('fallback')
    },
  )
})

describe('formatCurrency', () => {
  // Intl uses non-breaking spaces before the € sign and in thousands groups;
  // normalise all whitespace so the assertions don't depend on which one.
  const normalise = (s: string) => s.replace(/\s/g, ' ')

  it('formats euros with two decimals and the € sign', () => {
    expect(normalise(formatCurrency(12.5))).toBe('12,50 €')
  })

  it('formats zero', () => {
    expect(normalise(formatCurrency(0))).toBe('0,00 €')
  })

  it('groups thousands', () => {
    expect(normalise(formatCurrency(1234.5))).toBe('1 234,50 €')
  })

  it('formats negative amounts with a minus sign', () => {
    expect(normalise(formatCurrency(-5))).toMatch(/^[-−]5,00 €$/)
  })
})

describe('formatDate', () => {
  it.each([[undefined], [null], ['']])('returns an em dash for %p', (value) => {
    expect(formatDate(value)).toBe('—')
  })

  it('formats an ISO datetime compactly', () => {
    expect(formatDate('2026-08-01T12:00:00')).toBe('1 Aug 2026')
  })

  it('formats a UTC midday timestamp', () => {
    expect(formatDate('2026-12-25T12:00:00Z')).toBe('25 Dec 2026')
  })

  it('falls back to the raw value when it cannot be parsed', () => {
    expect(formatDate('garbage')).toBe('garbage')
  })

  it('falls back to the part before "T" for an unparseable datetime', () => {
    expect(formatDate('not-a-dateTjunk')).toBe('not-a-date')
  })
})

describe('addOneMonth', () => {
  it('adds one calendar month', () => {
    expect(addOneMonth('2026-03-15')).toBe('2026-04-15')
  })

  it('rolls December over into January of the next year', () => {
    expect(addOneMonth('2026-12-10')).toBe('2027-01-10')
  })

  it('zero-pads month and day', () => {
    expect(addOneMonth('2026-01-05')).toBe('2026-02-05')
  })

  it.each([
    ['2026-01-31', '2026-02-28'], // no 31 Feb: last day of February, not 3 March
    ['2028-01-31', '2028-02-29'], // leap year
    ['2026-03-31', '2026-04-30'],
    ['2026-12-31', '2027-01-31'], // December rolls into the next year
  ])('clamps %s to the last day of the next month (%s)', (input, expected) => {
    expect(addOneMonth(input)).toBe(expected)
  })

  it.each([[''], ['abc'], ['2026-13'], ['2026-00-10']])('returns invalid input %p unchanged', (value) => {
    expect(addOneMonth(value)).toBe(value)
  })
})

describe('statusColors / statusLabels', () => {
  it.each(INVOICE_STATUSES)('define a non-empty colour and label for "%s"', (status) => {
    expect(statusColors[status]).toBeTruthy()
    expect(statusLabels[status]).toBeTruthy()
  })

  it('have no entries beyond the known statuses', () => {
    expect(Object.keys(statusColors).sort()).toEqual([...INVOICE_STATUSES].sort())
    expect(Object.keys(statusLabels).sort()).toEqual([...INVOICE_STATUSES].sort())
  })

  it('labels overdue as "Won\'t pay"', () => {
    expect(statusLabels.overdue).toBe("Won't pay")
  })
})
