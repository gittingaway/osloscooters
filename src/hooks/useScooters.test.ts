import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ScooterFetchResult } from '../types/scooter'
import { useScooters } from './useScooters'

const location = { latitude: 59.9139, longitude: 10.7522 }

function result(): ScooterFetchResult {
  return {
    scooters: [
      {
        id: 'near',
        provider: 'bolt',
        latitude: 59.913,
        longitude: 10.7522,
        isReserved: false,
        isDisabled: false,
      },
      {
        id: 'far',
        provider: 'voi',
        latitude: 59.9,
        longitude: 10.7522,
        isReserved: false,
        isDisabled: false,
      },
    ],
    failures: [],
  }
}

describe('useScooters', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads, filters, and sorts scooters around a location', async () => {
    const fetcher = vi.fn().mockResolvedValue(result())
    const { result: hook } = renderHook(() =>
      useScooters(location, fetcher),
    )

    await waitFor(() => expect(hook.current.isLoading).toBe(false))

    expect(hook.current.scooters.map(({ id }) => id)).toEqual(['near'])
    expect(hook.current.updatedAt).toEqual(expect.any(Number))
  })

  it('keeps successful data when a later refresh fully fails', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(result())
      .mockResolvedValueOnce({
        scooters: [],
        failures: [
          { provider: 'voi', message: 'Unavailable' },
          { provider: 'bolt', message: 'Unavailable' },
          { provider: 'ryde', message: 'Unavailable' },
        ],
      })
    const { result: hook } = renderHook(() =>
      useScooters(location, fetcher),
    )
    await waitFor(() => expect(hook.current.isLoading).toBe(false))

    await act(async () => hook.current.refresh())

    expect(hook.current.scooters.map(({ id }) => id)).toEqual(['near'])
    expect(hook.current.failures).toHaveLength(3)
  })

  it('deduplicates refreshes while a request is in flight', async () => {
    let resolveRequest: (value: ScooterFetchResult) => void = () => undefined
    const pendingRequest = new Promise<ScooterFetchResult>((resolve) => {
      resolveRequest = resolve
    })
    const fetcher = vi.fn(() => pendingRequest)
    const { result: hook } = renderHook(() => useScooters(location, fetcher))

    await act(async () => {
      void hook.current.refresh()
      void hook.current.refresh()
    })
    expect(fetcher).toHaveBeenCalledTimes(1)

    await act(async () => resolveRequest(result()))
    expect(hook.current.isLoading).toBe(false)
  })

  it('pauses refreshes until an Entur rate limit expires', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-09-03T18:00:00Z')
    vi.setSystemTime(now)
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    const fetcher = vi.fn().mockResolvedValue({
      ...result(),
      failures: [
        {
          provider: 'voi',
          message: 'Entur request failed with status 429',
          retryAt: now.getTime() + 120_000,
        },
      ],
    })
    const { result: hook } = renderHook(() =>
      useScooters(location, fetcher),
    )
    await act(async () => {})

    await act(async () => hook.current.refresh())
    await act(async () => vi.advanceTimersByTimeAsync(119_999))
    expect(fetcher).toHaveBeenCalledTimes(1)

    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('polls while visible and pauses while hidden', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-03T18:00:00Z'))
    const fetcher = vi.fn().mockResolvedValue(result())
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })

    renderHook(() => useScooters(location, fetcher))
    await act(async () => {})
    expect(fetcher).toHaveBeenCalledTimes(1)

    await act(async () => vi.advanceTimersByTimeAsync(60_000))
    expect(fetcher).toHaveBeenCalledTimes(2)

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    await act(async () => vi.advanceTimersByTimeAsync(60_000))

    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('refreshes stale data immediately when the page becomes visible', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-03T18:00:00Z'))
    const fetcher = vi.fn().mockResolvedValue(result())
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })

    renderHook(() => useScooters(location, fetcher))
    await act(async () => {})
    expect(fetcher).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-09-03T18:02:00Z'))
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})