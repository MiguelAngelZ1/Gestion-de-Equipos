import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiRequest } from '../services/api'

Object.defineProperty(navigator, 'onLine', {
  value: true,
  configurable: true,
  writable: true,
})

describe('apiRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true })
  })

  it('throws timeout error when request exceeds timeout', async () => {
    vi.useFakeTimers()

    globalThis.fetch = vi.fn((_url: any, options: any) => {
      return new Promise<any>((_resolve, reject) => {
        const signal = options.signal
        if (signal?.aborted) {
          const err = new Error('Aborted')
          err.name = 'AbortError'
          reject(err)
          return
        }
        signal?.addEventListener('abort', () => {
          const err = new Error('Aborted')
          err.name = 'AbortError'
          reject(err)
        })
      })
    })

    const promise = apiRequest('/test')
    const errorHandler = vi.fn()
    promise.catch(errorHandler)

    await vi.advanceTimersByTimeAsync(15000)
    await vi.waitFor(() => {
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('tardó demasiado'),
        })
      )
    })

    vi.useRealTimers()
  })

  it('throws network error when offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    })
    await expect(apiRequest('/test')).rejects.toThrow(
      'Sin conexión a internet'
    )
  })

  it('handles successful GET request', async () => {
    const mockData = { id: 1, name: 'Test' }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve(mockData),
    })

    const result = await apiRequest('/test')
    expect(result).toEqual(mockData)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('handles successful POST with body', async () => {
    const mockData = { success: true }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve(mockData),
    })

    const result = await apiRequest('/test', {
      method: 'POST',
      body: { name: 'test' },
    })
    expect(result).toEqual(mockData)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      })
    )
  })

  it('throws error on 401 response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    })

    await expect(apiRequest('/test')).rejects.toThrow('No autorizado')
  })

  it('throws error on 403 response', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Map([['content-type', 'application/json']]),
      json: () =>
        Promise.resolve({
          error:
            'No tiene los permisos necesarios para realizar esta acción.',
        }),
    })

    await expect(apiRequest('/test')).rejects.toThrow('Acceso denegado')
  })
})
