import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Scooter } from '../types/scooter'
import { ScooterDrawer } from './ScooterDrawer'

const scooters: Scooter[] = [
  {
    id: 'voi-1',
    provider: 'voi',
    latitude: 59.92,
    longitude: 10.74,
    distanceMeters: 42,
    batteryPercent: 64,
    isReserved: false,
    isDisabled: false,
    rentalUris: { web: 'https://voi.example/voi-1' },
  },
  {
    id: 'bolt-1',
    provider: 'bolt',
    latitude: 59.921,
    longitude: 10.741,
    distanceMeters: 86,
    isReserved: false,
    isDisabled: false,
    rentalUris: { web: 'https://bolt.example/bolt-1' },
  },
]

function DrawerHarness() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  return (
    <ScooterDrawer
      scooters={scooters}
      selectedIndex={selectedIndex}
      onIndexChange={setSelectedIndex}
      onClose={vi.fn()}
    />
  )
}

describe('ScooterDrawer', () => {
  it('shows provider, distance, and app action for the selected scooter', () => {
    render(<DrawerHarness />)
    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByRole('heading', { name: 'Voi' })).toBeInTheDocument()
    expect(within(dialog).getByText('42 m away')).toBeInTheDocument()
    expect(within(dialog).getByText('64% battery')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Open in Voi' })).toHaveAttribute(
      'href',
      'https://voi.example/voi-1',
    )
  })

  it('moves to the next scooter using the accessible control', async () => {
    const user = userEvent.setup()
    render(<DrawerHarness />)

    await user.click(screen.getByRole('button', { name: 'Next scooter' }))

    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bolt' })).toBeInTheDocument()
  })

  it('changes selection after a horizontal swipe scroll settles', async () => {
    render(<DrawerHarness />)
    const track = screen.getByLabelText('Swipe between scooters')
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 320 })
    Object.defineProperty(track, 'scrollLeft', { configurable: true, value: 320 })

    fireEvent.scroll(track)

    await waitFor(() => expect(screen.getByText('2 / 2')).toBeInTheDocument())
  })

  it('does not revert an external selection while the drawer aligns', async () => {
    const onIndexChange = vi.fn()
    const { rerender } = render(
      <ScooterDrawer
        scooters={scooters}
        selectedIndex={0}
        onIndexChange={onIndexChange}
        onClose={vi.fn()}
      />,
    )
    const track = screen.getByLabelText('Swipe between scooters')
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 320 })
    Object.defineProperty(track, 'scrollLeft', {
      configurable: true,
      value: 0,
      writable: true,
    })

    rerender(
      <ScooterDrawer
        scooters={scooters}
        selectedIndex={1}
        onIndexChange={onIndexChange}
        onClose={vi.fn()}
      />,
    )
    fireEvent.scroll(track)
    track.scrollLeft = 320
    fireEvent.scroll(track)

    await new Promise((resolve) => window.setTimeout(resolve, 100))
    expect(onIndexChange).not.toHaveBeenCalled()

    track.scrollLeft = 0
    fireEvent.scroll(track)
    await waitFor(() => expect(onIndexChange).toHaveBeenCalledWith(0))
  })
})