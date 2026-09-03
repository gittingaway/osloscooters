import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AddressSearch } from './AddressSearch'

const { searchAddressesMock } = vi.hoisted(() => ({
  searchAddressesMock: vi.fn(),
}))

vi.mock('../services/geocoding', async (importOriginal) => ({
  ...(await importOriginal()),
  searchAddresses: searchAddressesMock,
}))

describe('AddressSearch', () => {
  it('shows suggestions as the user types and selects one', async () => {
    const match = {
      latitude: 59.923,
      longitude: 10.739,
      label: 'Waldemar Thranes gate 1A, 0171 OSLO',
    }
    searchAddressesMock.mockResolvedValue([match])
    const onSelect = vi.fn()
    const user = userEvent.setup()

    render(
      <AddressSearch
        usingAddress={false}
        onSelect={onSelect}
        onUseCurrentLocation={vi.fn()}
      />,
    )
    await user.type(
      screen.getByLabelText('Search an address in Oslo'),
      'Waldemar Thranes',
    )

    await waitFor(() =>
      expect(searchAddressesMock).toHaveBeenCalledWith('Waldemar Thranes'),
    )
    const option = await screen.findByRole('option', {
      name: /Waldemar Thranes gate 1A/,
    })
    await user.click(option)

    expect(onSelect).toHaveBeenCalledWith(match)
  })

  it('does not search until at least three characters are entered', async () => {
    const user = userEvent.setup()

    render(
      <AddressSearch
        usingAddress={false}
        onSelect={vi.fn()}
        onUseCurrentLocation={vi.fn()}
      />,
    )
    await user.type(screen.getByLabelText('Search an address in Oslo'), 'Wa')

    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(searchAddressesMock).not.toHaveBeenCalled()
  })

  it('shows a message when no address matches', async () => {
    searchAddressesMock.mockResolvedValue([])
    const user = userEvent.setup()

    render(
      <AddressSearch
        usingAddress={false}
        onSelect={vi.fn()}
        onUseCurrentLocation={vi.fn()}
      />,
    )
    await user.type(
      screen.getByLabelText('Search an address in Oslo'),
      'Nonexistent street',
    )

    expect(
      await screen.findByText('No matching addresses found.'),
    ).toBeInTheDocument()
  })

  it('requests current location from the embedded GPS button', async () => {
    const onUseCurrentLocation = vi.fn()
    const user = userEvent.setup()

    render(
      <AddressSearch
        usingAddress
        onSelect={vi.fn()}
        onUseCurrentLocation={onUseCurrentLocation}
      />,
    )
    await user.click(
      screen.getByRole('button', { name: 'Use current location' }),
    )

    expect(onUseCurrentLocation).toHaveBeenCalledOnce()
  })

  it('shows the GPS button as active while using current location', () => {
    const { rerender } = render(
      <AddressSearch
        usingAddress={false}
        onSelect={vi.fn()}
        onUseCurrentLocation={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Use current location' }),
    ).toHaveClass('is-active')

    rerender(
      <AddressSearch
        usingAddress
        onSelect={vi.fn()}
        onUseCurrentLocation={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Use current location' }),
    ).not.toHaveClass('is-active')
  })
})
