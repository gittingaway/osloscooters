import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const { useLocationMock, useScootersMock, useIsOutsideOperatingHoursMock } =
  vi.hoisted(() => ({
    useLocationMock: vi.fn(),
    useScootersMock: vi.fn(),
    useIsOutsideOperatingHoursMock: vi.fn().mockReturnValue(false),
  }))

vi.mock('./hooks/useLocation', () => ({ useLocation: useLocationMock }))
vi.mock('./hooks/useScooters', () => ({ useScooters: useScootersMock }))
vi.mock('./hooks/useOperatingHours', () => ({
  useIsOutsideOperatingHours: useIsOutsideOperatingHoursMock,
}))
vi.mock('./components/ScooterMap', () => ({
  ScooterMap: ({
    scooters,
    onSelectScooter,
  }: {
    scooters: Array<{ provider: string }>
    onSelectScooter: (scooter: { provider: string }) => void
  }) => (
    <>
      <div data-testid="map-providers">
        {scooters.map(({ provider }) => provider).join(',')}
      </div>
      <button type="button" onClick={() => onSelectScooter(scooters[0])}>
        Select map scooter
      </button>
    </>
  ),
}))

const scooters = [
  {
    id: 'bolt-1',
    provider: 'bolt' as const,
    latitude: 59.913,
    longitude: 10.752,
    distanceMeters: 90,
    batteryPercent: 72,
    rangeMeters: 12_500,
    rentalUris: { web: 'https://bolt.example/scooter/bolt-1' },
    isReserved: false,
    isDisabled: false,
  },
  {
    id: 'voi-1',
    provider: 'voi' as const,
    latitude: 59.912,
    longitude: 10.751,
    distanceMeters: 160,
    isReserved: false,
    isDisabled: false,
  },
  {
    id: 'ryde-1',
    provider: 'ryde' as const,
    latitude: 59.911,
    longitude: 10.75,
    distanceMeters: 210,
    batteryPercent: 81,
    isReserved: false,
    isDisabled: false,
  },
]

describe('App', () => {
  beforeEach(() => {
    useIsOutsideOperatingHoursMock.mockReturnValue(false)
    useLocationMock.mockReturnValue({
      state: {
        status: 'success',
        location: {
          latitude: 59.9139,
          longitude: 10.7522,
          accuracyMeters: 8,
        },
      },
      request: vi.fn(),
    })
    useScootersMock.mockReturnValue({
      scooters,
      failures: [],
      isLoading: false,
      isRefreshing: false,
      updatedAt: Date.now(),
      refresh: vi.fn(),
    })
  })

  it('shows all nearby scooters on the map without a separate list', () => {
    render(<App />)

    expect(screen.getByTestId('map-providers')).toHaveTextContent('bolt,voi,ryde')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByText('Updated just now')).toBeInTheDocument()
  })

  it('blurs the map and explains the overnight closure window', () => {
    useIsOutsideOperatingHoursMock.mockReturnValue(true)

    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Closed for the night' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('map-providers')).toBeInTheDocument()
  })

  it('shows a map-sized skeleton while scooters load', () => {
    useScootersMock.mockReturnValue({
      scooters: [],
      failures: [],
      isLoading: true,
      isRefreshing: false,
      updatedAt: undefined,
      refresh: vi.fn(),
    })

    render(<App />)

    expect(
      screen.getByRole('status', { name: 'Loading scooter map' }),
    ).toHaveClass('scooter-map', 'map-skeleton')
    expect(screen.queryByText('Finding nearby scooters...')).not.toBeInTheDocument()
  })

  it('filters the map by provider', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Voi' }))

    expect(screen.getByTestId('map-providers')).toHaveTextContent('voi')

    await user.click(screen.getByRole('button', { name: 'Ryde' }))
    expect(screen.getByTestId('map-providers')).toHaveTextContent('ryde')
  })

  it('opens scooter details from a map selection', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Select map scooter' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('90 m away')).toBeInTheDocument()
    expect(within(dialog).getByText('72% battery')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Open in Bolt' })).toBeInTheDocument()
  })

  it('keeps showing working provider data when another provider fails', () => {
    useScootersMock.mockReturnValue({
      scooters: [scooters[0]],
      failures: [{ provider: 'voi', message: 'Rate limited' }],
      isLoading: false,
      isRefreshing: false,
      updatedAt: Date.now(),
      refresh: vi.fn(),
    })

    render(<App />)

    expect(screen.getByTestId('map-providers')).toHaveTextContent('bolt')
    expect(screen.getByRole('alert')).toHaveTextContent('Voi unavailable')
    expect(screen.getByRole('alert')).toHaveTextContent('Rate limited')
  })

  it('dismisses a provider failure toast', async () => {
    useScootersMock.mockReturnValue({
      scooters: [scooters[0]],
      failures: [{ provider: 'ryde', message: 'Entur returned status 429' }],
      isLoading: false,
      isRefreshing: false,
      updatedAt: Date.now(),
      refresh: vi.fn(),
    })
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('alert')).toHaveTextContent('Ryde unavailable')
    await user.click(
      screen.getByRole('button', { name: 'Dismiss provider failure' }),
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a retry action when location access fails', async () => {
    const request = vi.fn()
    useLocationMock.mockReturnValue({
      state: {
        status: 'error',
        kind: 'denied',
        message: 'Location access is required to find nearby scooters.',
      },
      request,
    })
    const user = userEvent.setup()

    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Enable location' }))

    expect(request).toHaveBeenCalledOnce()
  })

  it('prompts before requesting location so the browser dialog is not a surprise', () => {
    const request = vi.fn()
    useLocationMock.mockReturnValue({
      state: { status: 'prompt' },
      request,
    })

    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Find scooters near you' }),
    ).toBeInTheDocument()
    expect(request).not.toHaveBeenCalled()
  })

  it('shows a full API error when neither provider has loaded', () => {
    useScootersMock.mockReturnValue({
      scooters: [],
      failures: [
        { provider: 'voi', message: 'Unavailable' },
        { provider: 'bolt', message: 'Unavailable' },
        { provider: 'ryde', message: 'Unavailable' },
      ],
      isLoading: false,
      isRefreshing: false,
      updatedAt: undefined,
      refresh: vi.fn(),
    })

    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Unable to load scooters' }),
    ).toBeInTheDocument()
  })
})