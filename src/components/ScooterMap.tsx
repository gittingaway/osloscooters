import L from 'leaflet'
import 'leaflet.markercluster'
import { useEffect } from 'react'
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from 'react-leaflet'
import type { Scooter } from '../types/scooter'
import type { Coordinates } from '../utils/distance'
import { providerName } from '../utils/provider'

interface ScooterMapProps {
  location: Coordinates
  scooters: Scooter[]
  selectedScooter?: Scooter
  onSelectScooter: (scooter: Scooter) => void
}

const userIcon = L.divIcon({
  className: 'map-marker-shell',
  html: '<span class="map-marker map-marker--user"><span></span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

const SCOOTER_GLYPH_PATHS = `
  <path d="M21 4h-3.5l2 11.05" />
  <path d="M6.95 17h5.142c.523 0 .95-.406 1.063-.916a6.5 6.5 0 0 1 5.345-5.009" />
  <circle cx="19.5" cy="17.5" r="2.5" />
  <circle cx="4.5" cy="17.5" r="2.5" />
`

function scooterIcon(scooter: Scooter, isSelected: boolean): L.DivIcon {
  // Ryde does not report battery percentage, so its marker fills fully
  // rather than implying a gauge reading that does not exist.
  const fillPercent = scooter.batteryPercent ?? 100
  return L.divIcon({
    className: 'map-marker-shell',
    html: `
      <span class="map-marker map-marker--${scooter.provider}${isSelected ? ' map-marker--selected' : ''}">
        <span class="map-marker__gauge" style="height:${fillPercent}%"></span>
        <svg class="map-marker__glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SCOOTER_GLYPH_PATHS}</svg>
      </span>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -16],
  })
}

function ClusteredScooterMarkers({
  scooters,
  selectedScooter,
  onSelectScooter,
}: Pick<
  ScooterMapProps,
  'scooters' | 'selectedScooter' | 'onSelectScooter'
>) {
  const map = useMap()

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      animate: true,
      disableClusteringAtZoom: 18,
      maxClusterRadius: 48,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount()
        return L.divIcon({
          className: 'map-cluster-shell',
          html: `<span class="map-cluster">${count}</span>`,
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        })
      },
    })

    scooters.forEach((scooter) => {
      const name = providerName(scooter.provider)
      const battery =
        scooter.batteryPercent === undefined
          ? 'battery unavailable'
          : `${scooter.batteryPercent}% battery`
      const marker = L.marker([scooter.latitude, scooter.longitude], {
        alt: `${name}, ${battery}`,
        icon: scooterIcon(scooter, scooter === selectedScooter),
        title: `${name}, ${battery}`,
      })
      marker.on('click', () => onSelectScooter(scooter))
      clusterGroup.addLayer(marker)
    })

    map.addLayer(clusterGroup)
    return () => {
      map.removeLayer(clusterGroup)
    }
  }, [map, onSelectScooter, scooters, selectedScooter])

  return null
}

function MapSizeSync() {
  const map = useMap()

  // Mobile browsers finalize the dynamic viewport height (dvh) after the
  // toolbar/chrome settles, which can leave Leaflet sized against a stale
  // container measurement and push tiles wider than the screen. Re-check
  // once after mount and on resize/orientation change.
  useEffect(() => {
    const frameId = requestAnimationFrame(() => map.invalidateSize())

    function handleResize() {
      map.invalidateSize()
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [map])

  return null
}

function ViewportController({
  location,
}: Pick<ScooterMapProps, 'location'>) {
  const map = useMap()

  // Recenter only when the location itself moves to a new place (initial
  // fix, switching address, or "use current location"). Refreshing
  // scooter data or changing the provider filter must never move the map.
  useEffect(() => {
    map.setView([location.latitude, location.longitude], 18, {
      animate: false,
    })
  }, [location.latitude, location.longitude, map])

  return null
}

function SelectedScooterFocus({
  selectedScooter,
}: Pick<ScooterMapProps, 'selectedScooter'>) {
  const map = useMap()

  // Recenter when a scooter is explicitly selected, but not when a filter
  // change merely clears the selection back to undefined.
  useEffect(() => {
    if (!selectedScooter) {
      return
    }

    map.setView(
      [selectedScooter.latitude, selectedScooter.longitude],
      18,
      { animate: false },
    )
  }, [map, selectedScooter])

  return null
}

export function ScooterMap({
  location,
  scooters,
  selectedScooter,
  onSelectScooter,
}: ScooterMapProps) {
  return (
    <MapContainer
      center={[location.latitude, location.longitude]}
      zoom={18}
      minZoom={12}
      maxZoom={18}
      touchZoom={true}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      zoomControl={false}
      className="scooter-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={18}
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <ZoomControl position="bottomleft" />
      <MapSizeSync />
      <ViewportController location={location} />
      <SelectedScooterFocus selectedScooter={selectedScooter} />
      <Marker position={[location.latitude, location.longitude]} icon={userIcon}>
        <Popup>You are here</Popup>
      </Marker>
      <ClusteredScooterMarkers
        scooters={scooters}
        selectedScooter={selectedScooter}
        onSelectScooter={onSelectScooter}
      />
    </MapContainer>
  )
}