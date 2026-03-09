"use client"

import { useEffect } from "react"
import { Map, MapMarker, MarkerContent, MapControls, useMap } from "@/components/ui/map"
import { getZipcodeCoords, DALLAS_CENTER, ZIPCODE_ZOOM } from "@/lib/zipcode-coords"

function FlyToZipcode({ coords }: { coords: [number, number] }) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded) return
    map.jumpTo({ center: coords, zoom: ZIPCODE_ZOOM })
  }, [map, isLoaded, coords])

  return null
}

interface DashboardMapProps {
  zipcode: string
  className?: string
}

export default function DashboardMap({ zipcode, className }: DashboardMapProps) {
  const coords = getZipcodeCoords(zipcode) ?? DALLAS_CENTER

  return (
    <div className={className} style={{ viewTransitionName: "hero-map" }}>
      <Map
        center={coords}
        zoom={ZIPCODE_ZOOM}
        theme="light"
        styles={{
          light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        }}
      >
        <FlyToZipcode coords={coords} />
        <MapControls position="bottom-right" showZoom />

        <MapMarker longitude={coords[0]} latitude={coords[1]}>
          <MarkerContent>
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-teal-500/30 animate-ping" />
              <div className="relative size-4 rounded-full bg-teal-700 border-2 border-white shadow-lg" />
            </div>
          </MarkerContent>
        </MapMarker>
      </Map>
    </div>
  )
}
