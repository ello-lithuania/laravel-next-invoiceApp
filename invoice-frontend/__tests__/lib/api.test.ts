import { api, ApiError, INVOICE_STATUSES, isInvoiceStatus, getToken, setToken } from '@/lib/api'

describe('isInvoiceStatus / INVOICE_STATUSES', () => {
  it('lists the four statuses', () => {
    expect([...INVOICE_STATUSES]).toEqual(['draft', 'sent', 'paid', 'overdue'])
  })

  it.each(INVOICE_STATUSES)('accepts "%s"', (s) => {
    expect(isInvoiceStatus(s)).toBe(true)
  })

  it.each([[''], ['Paid'], ['cancelled'], [' sent']])('rejects %p', (s) => {
    expect(isInvoiceStatus(s)).toBe(false)
  })
})

describe('ApiError', () => {
  it('keeps message, status and field errors', () => {
    const err = new ApiError('Invalid', 422, { email: ['Taken'] })
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('Invalid')
    expect(err.status).toBe(422)
    expect(err.errors).toEqual({ email: ['Taken'] })
  })

  it('has no field errors by default', () => {
    expect(new ApiError('x', 500).errors).toBeUndefined()
  })
})

describe('api()', () => {
  const fetchMock = jest.fn()
  let consoleError: jest.SpyInstance

  const jsonResponse = (body: unknown, status = 200): Response =>
    ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response

  const callConfig = (index = 0): RequestInit => fetchMock.mock.calls[index][1] as RequestInit

  beforeEach(() => {
    jest.useFakeTimers()
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    // jsdom logs "not implemented: navigation" when href is assigned (401 redirect).
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
    consoleError.mockRestore()
  })

  it('returns parsed JSON on success and sends JSON headers', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1 }))

    await expect(api<{ id: number }>('/invoices/1')).resolves.toEqual({ id: 1 })

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/invoices\/1$/)
    expect(callConfig().headers).toMatchObject({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    })
  })

  it('sends the stored token as a Bearer header', async () => {
    setToken('abc123')
    fetchMock.mockResolvedValue(jsonResponse({}))

    await api('/me')

    expect(callConfig().headers).toMatchObject({ Authorization: 'Bearer abc123' })
  })

  it('throws ApiError with status, message and field errors on a 422', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Invalid', errors: { name: ['Required'] } }, 422))

    const err: unknown = await api('/clients', { method: 'POST', body: '{}' }).catch((e: unknown) => e)

    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ message: 'Invalid', status: 422, errors: { name: ['Required'] } })
  })

  it('uses a generic message when the error body has none', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 403))

    await expect(api('/x', { method: 'DELETE' })).rejects.toMatchObject({
      message: 'Something went wrong',
      status: 403,
    })
  })

  it('on 401 clears the token, throws Unauthorized and does not retry', async () => {
    setToken('stale')
    fetchMock.mockResolvedValue(jsonResponse({}, 401))

    await expect(api('/invoices')).rejects.toMatchObject({ message: 'Unauthorized', status: 401 })

    expect(getToken()).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries a GET after a network failure and returns the later success', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    const promise = api<{ ok: boolean }>('/stats')
    await jest.advanceTimersByTimeAsync(800)

    await expect(promise).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries a GET on a 500 and gives up after 3 attempts', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Server exploded' }, 500))

    const assertion = expect(api('/stats')).rejects.toMatchObject({ status: 500, message: 'Server exploded' })
    await jest.advanceTimersByTimeAsync(800 + 1600)

    await assertion
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('does not retry a POST after a network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('network down'))

    await expect(api('/invoices', { method: 'POST', body: '{}' })).rejects.toThrow('network down')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not retry a POST on a 500', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Server error' }, 500))

    await expect(api('/invoices', { method: 'POST', body: '{}' })).rejects.toMatchObject({ status: 500 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
