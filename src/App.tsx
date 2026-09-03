import { AlertCircle, Clock, LocateFixed, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import './App.css'
import { AddressSearch } from './components/AddressSearch'
import { ProviderFilter } from './components/ProviderFilter'
import { ProviderFailureToast } from './components/ProviderFailureToast'
import { ScooterDrawer } from './components/ScooterDrawer'
import { ScooterMap } from './components/ScooterMap'
import { StatusBar } from './components/StatusBar'
import { useIsOutsideOperatingHours } from './hooks/useOperatingHours'
import { useLocation } from './hooks/useLocation'
import { useScooters } from './hooks/useScooters'
import type { GeocodedAddress } from './services/geocoding'
import { SCOOTER_PROVIDERS, type ScooterProvider } from './types/scooter'
import type { Scooter } from './types/scooter'

export type ProviderSelection = 'all' | ScooterProvider

function App() {
  const [provider, setProvider] = useState<ProviderSelection>('all')
  const [selectedScooterKey, setSelectedScooterKey] = useState<string>()
  const [selectedAddress, setSelectedAddress] = useState<
    GeocodedAddress | undefined
  >(undefined)
  const usingAddress = selectedAddress !== undefined
  const { state: locationState, request: requestLocation } = useLocation(
    !usingAddress,
  )
  const location = selectedAddress ??
    (locationState.status === 'success' ? locationState.location : undefined)
  const scooterState = useScooters(location)
  const isClosed = useIsOutsideOperatingHours()

  function useCurrentLocation() {
    setSelectedAddress(undefined)
    requestLocation()
  }

  const visibleScooters = scooterState.scooters.filter(
    (scooter) => provider === 'all' || scooter.provider === provider,
  )
  const selectedScooterIndex = visibleScooters.findIndex(
    (scooter) => `${scooter.provider}-${scooter.id}` === selectedScooterKey,
  )
  const selectedScooter = visibleScooters[selectedScooterIndex]
  const allProvidersFailed =
    scooterState.failures.length === SCOOTER_PROVIDERS.length &&
    scooterState.updatedAt === undefined

  function selectScooter(scooter: Scooter) {
    setSelectedScooterKey(`${scooter.provider}-${scooter.id}`)
  }

  function changeProvider(nextProvider: ProviderSelection) {
    setProvider(nextProvider)
    setSelectedScooterKey(undefined)
  }

  return (
    <main className="app-shell">
      <div className="map-layer">
        {!location && locationState.status === 'prompt' ? (
          <section className="map-panel map-panel--prompt" aria-label="Scooter map">
            <div className="map-prompt">
              <div className="location-pulse" aria-hidden="true">
                <LocateFixed size={26} />
              </div>
              <h2>Find scooters near you</h2>
              <p className="state-copy">
                Enable location to see the nearest Voi, Bolt, and Ryde
                scooters. Your location stays on this device and is only
                used to calculate distances.
              </p>
              <button
                className="primary-button"
                type="button"
                onClick={requestLocation}
              >
                <LocateFixed size={18} />
                Enable location
              </button>
            </div>
          </section>
        ) : !location && locationState.status === 'error' ? (
          <section className="map-panel map-panel--prompt" aria-label="Scooter map">
            <div className="map-prompt">
              <AlertCircle className="state-icon state-icon--error" size={26} />
              <h2>We cannot find you yet</h2>
              <p className="state-copy">
                {locationState.kind === 'denied'
                  ? 'Location access was declined. Turn it on later in your browser settings, or search for an address above.'
                  : locationState.message}
              </p>
              <button
                className="primary-button"
                type="button"
                onClick={requestLocation}
              >
                <LocateFixed size={18} />
                Enable location
              </button>
            </div>
          </section>
        ) : !location || scooterState.isLoading ? (
          <section className="map-panel" aria-label="Scooter map" aria-busy="true">
            <div
              className="scooter-map map-skeleton"
              role="status"
              aria-label="Loading scooter map"
            >
              <span className="sr-only">Finding nearby scooters</span>
              <span className="map-skeleton__controls" aria-hidden="true">
                <span />
                <span />
              </span>
            </div>
          </section>
        ) : allProvidersFailed ? (
          <section className="map-panel map-panel--prompt" aria-label="Scooter map">
            <div className="map-prompt" role="alert">
              <AlertCircle className="state-icon state-icon--error" size={26} />
              <h2>Unable to load scooters</h2>
              <p className="state-copy">
                All scooter providers are unavailable right now.
              </p>
              <button
                className="primary-button"
                type="button"
                onClick={() => void scooterState.refresh()}
              >
                <RefreshCw size={18} />
                Try again
              </button>
            </div>
          </section>
        ) : (
          <section
            className={
              isClosed ? 'map-panel map-panel--closed' : 'map-panel'
            }
            aria-label="Scooter map"
            aria-busy={scooterState.isRefreshing}
          >
            <ScooterMap
              location={location}
              scooters={visibleScooters}
              selectedScooter={selectedScooter}
              onSelectScooter={selectScooter}
            />
            {scooterState.isRefreshing && (
              <div
                className="map-refresh-shimmer"
                aria-hidden="true"
              />
            )}
            {isClosed && (
              <div className="map-closed-overlay" role="status">
                <Clock size={26} aria-hidden="true" />
                <h2>Closed for the night</h2>
                <p>Voi, Bolt, and Ryde scooters are off the streets between 23:00 and 05:00.</p>
              </div>
            )}
          </section>
        )}
      </div>

      <div className="hud">
        <div className="control-stack">
          <AddressSearch
            usingAddress={usingAddress}
            onSelect={setSelectedAddress}
            onUseCurrentLocation={useCurrentLocation}
          />
          <ProviderFilter selected={provider} onChange={changeProvider} />
        </div>
      </div>

      <div className="refresh-hud">
        <StatusBar updatedAt={scooterState.updatedAt} />
        <button
          className="icon-button hud-glass"
          type="button"
          onClick={() => void scooterState.refresh()}
          disabled={scooterState.isLoading || scooterState.isRefreshing}
          aria-label="Refresh scooter availability"
          title="Refresh scooter availability"
        >
          <RefreshCw
            size={20}
            className={scooterState.isRefreshing ? 'is-spinning' : undefined}
          />
        </button>
      </div>

      {scooterState.failures.length > 0 && (
        <ProviderFailureToast
          key={scooterState.failures
            .map(({ provider, message }) => `${provider}:${message}`)
            .join('|')}
          failures={scooterState.failures}
        />
      )}

      {location && !scooterState.isLoading && !allProvidersFailed && (
        <ScooterDrawer
          scooters={visibleScooters}
          selectedIndex={selectedScooterIndex}
          onIndexChange={(index) => selectScooter(visibleScooters[index])}
          onClose={() => setSelectedScooterKey(undefined)}
        />
      )}
    </main>
  )
}

export default App