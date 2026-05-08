import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setToken, api } from '../api/client'

describe('api client', () => {
  beforeEach(() => {
    // Reset token state before each test
    setToken(null)
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('includes Authorization header after setToken is called', async () => {
    setToken('my-test-token')

    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )

    await api.get('/some-path')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer my-test-token')
  })

  it('dispatches auth:expired event and throws on 401 response', async () => {
    setToken('expired-token')

    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(null, { status: 401 })
    )

    const eventSpy = vi.fn()
    window.addEventListener('auth:expired', eventSpy)

    await expect(api.get('/protected')).rejects.toThrow('Unauthorized')
    expect(eventSpy).toHaveBeenCalledOnce()

    window.removeEventListener('auth:expired', eventSpy)
  })

  it('clears token when setToken(null) is called', async () => {
    setToken('some-token')
    setToken(null)

    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    )

    await api.get('/any-path')

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const headers = (init.headers as Record<string, string>) ?? {}
    expect(headers['Authorization']).toBeUndefined()
  })
})
