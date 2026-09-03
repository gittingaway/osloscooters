import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocation } from './useLocation'

describe('useLocation', () => {
  const getCurrentPosition = vi.fn()

  beforeEach(() => {
    getCurrentPosition.mockReset()
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    })
  })

  it('starts by prompting instead of requesting location immediately', () => {
    const { result } = renderHook(() => useLocation())

    expect(result.current.state).toEqual({ status: 'prompt' })
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it('reports a successful current location once requested', async () => {
    getCurrentPosition.mockImplementationOnce((success) => {
      success({ coords: { latitude: 59.9139, longitude: 10.7522, accuracy: 8 } })
    })

    const { result } = renderHook(() => useLocation())
    act(() => result.current.request())

    await waitFor(() => expect(result.current.state.status).toBe('success'))
    expect(result.current.state).toEqual({
      status: 'success',
      location: {
        latitude: 59.9139,
        longitude: 10.7522,
        accuracyMeters: 8,
      },
    })
  })

  it('reports denial and allows requesting again', async () => {
    getCurrentPosition
      .mockImplementationOnce((_success, error) => {
        error({ code: 1, PERMISSION_DENIED: 1 })
      })
      .mockImplementationOnce((success) => {
        success({ coords: { latitude: 59.91, longitude: 10.75, accuracy: 12 } })
      })

    const { result } = renderHook(() => useLocation())
    act(() => result.current.request())
    await waitFor(() => expect(result.current.state.status).toBe('error'))

    act(() => result.current.request())

    await waitFor(() => expect(result.current.state.status).toBe('success'))
    expect(getCurrentPosition).toHaveBeenCalledTimes(2)
  })
})