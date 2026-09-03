import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { type PointerEvent, type UIEvent, useEffect, useRef } from 'react'
import type { Scooter } from '../types/scooter'
import { formatDistance, formatRange } from '../utils/distance'
import { providerInitial, providerName } from '../utils/provider'
import { rentalUriForScooter } from '../utils/rental'
import { RentalLink } from './RentalLink'

function batteryLabel(scooter: Scooter): string | undefined {
  return scooter.batteryPercent === undefined
    ? undefined
    : `${scooter.batteryPercent}% battery`
}

function rangeLabel(scooter: Scooter): string | undefined {
  return scooter.rangeMeters === undefined
    ? undefined
    : formatRange(scooter.rangeMeters)
}

interface ScooterDrawerProps {
  scooters: Scooter[]
  selectedIndex: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

const DRAG_CLOSE_THRESHOLD_PX = 90

export function ScooterDrawer({
  scooters,
  selectedIndex,
  onIndexChange,
  onClose,
}: ScooterDrawerProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const scrollEndTimer = useRef<number | undefined>(undefined)
  const selectedIndexRef = useRef(selectedIndex)
  const isOpen = selectedIndex >= 0 && selectedIndex < scooters.length
  const dragStartY = useRef<number | null>(null)
  const dragOffsetRef = useRef(0)

  useEffect(() => {
    selectedIndexRef.current = selectedIndex
  }, [selectedIndex])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen || !trackRef.current) {
      return
    }

    window.clearTimeout(scrollEndTimer.current)
    trackRef.current.scrollTo?.({
      left: selectedIndex * trackRef.current.clientWidth,
      behavior: 'auto',
    })
  }, [isOpen, selectedIndex])

  useEffect(
    () => () => window.clearTimeout(scrollEndTimer.current),
    [],
  )

  if (!isOpen) {
    return null
  }

  function setDrawerOffset(offsetPx: number, withTransition: boolean) {
    const node = drawerRef.current
    if (!node) {
      return
    }

    node.style.transition = withTransition ? '' : 'none'
    node.style.transform =
      offsetPx > 0 ? `translate(50%, ${offsetPx}px)` : ''
  }

  function handleDragStart(event: PointerEvent<HTMLElement>) {
    dragStartY.current = event.clientY
    dragOffsetRef.current = 0
  }

  function handleDragMove(event: PointerEvent<HTMLElement>) {
    if (dragStartY.current === null) {
      return
    }

    const offset = Math.max(0, event.clientY - dragStartY.current)
    dragOffsetRef.current = offset
    setDrawerOffset(offset, false)
  }

  function handleDragEnd() {
    if (dragStartY.current === null) {
      return
    }

    dragStartY.current = null
    if (dragOffsetRef.current > DRAG_CLOSE_THRESHOLD_PX) {
      onClose()
    } else {
      setDrawerOffset(0, true)
    }
    dragOffsetRef.current = 0
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const track = event.currentTarget
    window.clearTimeout(scrollEndTimer.current)
    scrollEndTimer.current = window.setTimeout(() => {
      const width = track.clientWidth
      if (width === 0) {
        return
      }

      const nextIndex = Math.round(track.scrollLeft / width)
      if (
        nextIndex !== selectedIndexRef.current &&
        nextIndex >= 0 &&
        nextIndex < scooters.length
      ) {
        onIndexChange(nextIndex)
      }
    }, 80)
  }

  return (
    <>
      <section
        ref={drawerRef}
        className="scooter-drawer"
        role="dialog"
        aria-labelledby="scooter-drawer-title"
      >
        <div
          className="scooter-drawer__grip"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <span className="scooter-drawer__handle" aria-hidden="true" />
        </div>
        <button
          className="scooter-drawer__close"
          type="button"
          aria-label="Close scooter details"
          onClick={onClose}
        >
          <X size={19} />
        </button>

        <div
          ref={trackRef}
          className="scooter-drawer__track"
          aria-label="Swipe between scooters"
          onScroll={handleScroll}
        >
          {scooters.map((scooter, index) => {
            const rentalUri = rentalUriForScooter(scooter)
            const battery = batteryLabel(scooter)
            const range = rangeLabel(scooter)
            return (
              <article
                className="scooter-drawer__slide"
                key={`${scooter.provider}-${scooter.id}`}
                aria-current={index === selectedIndex ? 'true' : undefined}
                aria-hidden={index !== selectedIndex}
                inert={index !== selectedIndex}
              >
                <div className="scooter-drawer__info">
                  <div
                    className={`drawer-provider drawer-provider--${scooter.provider}`}
                    aria-hidden="true"
                  >
                    {providerInitial(scooter.provider)}
                  </div>
                  <div className="scooter-drawer__copy">
                    <p>
                      Scooter {index + 1} of {scooters.length}
                    </p>
                    <h2 id={index === selectedIndex ? 'scooter-drawer-title' : undefined}>
                      {providerName(scooter.provider)}
                    </h2>
                    <strong>
                      {scooter.distanceMeters === undefined
                        ? 'Distance unavailable'
                        : `${formatDistance(scooter.distanceMeters)} away`}
                    </strong>
                    <span className="scooter-drawer__battery">
                      {battery && range
                        ? `${battery} · ${range}`
                        : battery ?? range ?? 'Battery unavailable'}
                    </span>
                  </div>
                </div>
                <div className="scooter-drawer__action">
                  {rentalUri ? (
                    <RentalLink
                      provider={scooter.provider}
                      uri={rentalUri}
                      iconSize={20}
                    />
                  ) : (
                    <span>Provider link unavailable</span>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <div className="scooter-drawer__navigation">
          <button
            type="button"
            aria-label="Previous scooter"
            disabled={selectedIndex === 0}
            onClick={() => onIndexChange(selectedIndex - 1)}
          >
            <ChevronLeft size={20} />
          </button>
          <span>
            {selectedIndex + 1} / {scooters.length}
          </span>
          <button
            type="button"
            aria-label="Next scooter"
            disabled={selectedIndex === scooters.length - 1}
            onClick={() => onIndexChange(selectedIndex + 1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </section>
    </>
  )
}