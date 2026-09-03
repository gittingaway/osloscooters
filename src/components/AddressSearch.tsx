import { MapPin, Navigation } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  searchAddresses,
  type GeocodedAddress,
} from '../services/geocoding'

interface AddressSearchProps {
  usingAddress: boolean
  onSelect: (address: GeocodedAddress) => void
  onUseCurrentLocation: () => void
}

const SEARCH_DEBOUNCE_MS = 250

export function AddressSearch({
  usingAddress,
  onSelect,
  onUseCurrentLocation,
}: AddressSearchProps) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<GeocodedAddress[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string>()
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const trimmedQuery = query.trim()
  const isQueryTooShort = trimmedQuery.length < 3
  const isOpen = isFocused && trimmedQuery.length > 0

  useEffect(() => {
    if (!isOpen || isQueryTooShort) {
      return
    }

    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return
      setIsSearching(true)
      searchAddresses(trimmedQuery)
        .then((results) => {
          if (cancelled) return
          setSuggestions(results)
          setHighlightedIndex(-1)
          setError(
            results.length === 0 ? 'No matching addresses found.' : undefined,
          )
        })
        .catch(() => {
          if (cancelled) return
          setError('Address search failed. Try again.')
          setSuggestions([])
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false)
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [trimmedQuery, isQueryTooShort, isOpen])

  const visibleSuggestions = isQueryTooShort ? [] : suggestions
  const visibleError = isQueryTooShort ? undefined : error
  const visibleIsSearching = !isQueryTooShort && isSearching

  useEffect(() => {
    if (!isFocused) {
      return
    }

    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isFocused])

  function selectAddress(address: GeocodedAddress) {
    onSelect(address)
    setQuery('')
    setSuggestions([])
    setIsFocused(false)
  }

  function useCurrentLocation() {
    onUseCurrentLocation()
    setQuery('')
    setSuggestions([])
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsFocused(false)
      return
    }

    if (visibleSuggestions.length === 0) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((index) => (index + 1) % visibleSuggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex(
        (index) =>
          (index - 1 + visibleSuggestions.length) % visibleSuggestions.length,
      )
    } else if (event.key === 'Enter' && highlightedIndex >= 0) {
      event.preventDefault()
      selectAddress(visibleSuggestions[highlightedIndex])
    }
  }

  return (
    <div className="address-search" ref={containerRef}>
      <div className="address-search__bar hud-glass">
        <label className="sr-only" htmlFor="address-query">
          Search an address in Oslo
        </label>
        <input
          id="address-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search an address in Oslo"
          autoComplete="off"
          role="combobox"
          aria-expanded={visibleSuggestions.length > 0}
          aria-controls="address-suggestions"
          aria-activedescendant={
            highlightedIndex >= 0
              ? `address-suggestion-${highlightedIndex}`
              : undefined
          }
        />
        <button
          type="button"
          className={
            usingAddress
              ? 'address-search__gps'
              : 'address-search__gps is-active'
          }
          onClick={useCurrentLocation}
          aria-pressed={!usingAddress}
          aria-label="Use current location"
          title="Use current location"
        >
          <Navigation
            size={17}
            fill={usingAddress ? 'none' : 'currentColor'}
            aria-hidden="true"
          />
        </button>
      </div>

      {isOpen &&
        (visibleSuggestions.length > 0 || visibleIsSearching || visibleError) && (
          <ul
            className="address-search__suggestions"
            id="address-suggestions"
            role="listbox"
          >
            {visibleIsSearching && visibleSuggestions.length === 0 && (
              <li className="address-search__status">Searching…</li>
            )}
            {!visibleIsSearching && visibleError && (
              <li className="address-search__status" role="alert">
                {visibleError}
              </li>
            )}
            {visibleSuggestions.map((address, index) => (
              <li key={`${address.latitude}-${address.longitude}`}>
                <button
                  id={`address-suggestion-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === highlightedIndex}
                  className={
                    index === highlightedIndex
                      ? 'address-search__suggestion is-highlighted'
                      : 'address-search__suggestion'
                  }
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectAddress(address)}
                >
                  <MapPin size={14} aria-hidden="true" />
                  {address.label}
                </button>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}
