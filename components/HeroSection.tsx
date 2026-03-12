"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Map,
  MapMarker,
  MarkerContent,
  MapControls,
  useMap,
} from "@/components/ui/map";
import {
  getZipcodeCoords,
  DALLAS_CENTER,
  DALLAS_ZOOM,
  ZIPCODE_ZOOM,
} from "@/lib/zipcode-coords";
import SearchForm from "@/components/SearchForm";

function MapFlyer({ targetCoords }: { targetCoords: [number, number] | null }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    if (targetCoords) {
      map.flyTo({
        center: targetCoords,
        zoom: ZIPCODE_ZOOM,
        duration: 1800,
        essential: true,
      });
    } else {
      map.flyTo({
        center: DALLAS_CENTER,
        zoom: DALLAS_ZOOM,
        duration: 1200,
        essential: true,
      });
    }
  }, [map, isLoaded, targetCoords]);

  return null;
}

export default function HeroSection() {
  const [confirmedZip, setConfirmedZip] = useState<string | null>(null);
  const [markerCoords, setMarkerCoords] = useState<[number, number] | null>(
    null,
  );
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  const handleZipcodeChange = useCallback((zipcode: string | null) => {
    if (zipcode) {
      const coords = getZipcodeCoords(zipcode);
      if (coords) {
        setMarkerCoords(coords);
        setFlyTarget(coords);
        setConfirmedZip(zipcode);
      }
    } else {
      setMarkerCoords(null);
      setFlyTarget(null);
      setConfirmedZip(null);
    }
  }, []);

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100dvh-56px)]">
      {/* Left panel — Form */}
      <div className="relative z-10 flex flex-col justify-center w-full lg:w-[480px] xl:w-[520px] shrink-0 px-8 sm:px-12 lg:px-16 py-12 lg:py-0 bg-white">
        {/* Decorative vertical line */}
        <div className="hidden lg:block absolute right-0 top-8 bottom-8 w-px bg-linear-to-b from-transparent via-teal-800/20 to-transparent" />

        <div className="max-w-sm mx-auto lg:mx-0 w-full">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px w-8 bg-teal-800" />
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-800">
              Real Estate Intelligence
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-[2.25rem] sm:text-[2.75rem] leading-[1.1] text-gray-950 mb-4">
            Dallas Home
            <br />
            Price Forecast
          </h1>

          {/* Subtitle */}
          <p className="text-[15px] text-gray-500 leading-relaxed mb-10 max-w-xs">
            ML-powered price predictions for 113 Dallas-area zipcodes.
            Data-backed insights in seconds.
          </p>

          {/* Form */}
          <SearchForm onZipcodeChange={handleZipcodeChange} />

          {/* Footer note */}
          <div className="mt-10 pt-6 border-t border-gray-100">
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Zillow ZHVI data · XGBoost predictions · 113 Dallas zipcodes
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — Map */}
      <div className="relative flex-1 min-h-[400px] lg:min-h-0 bg-gray-100" style={{ viewTransitionName: "hero-map" }}>
        {/* Map label overlay */}
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded px-3 py-2 shadow-sm border border-gray-200/60">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-500">
              {confirmedZip
                ? `Zipcode ${confirmedZip}`
                : "Dallas\u2013Fort Worth"}
            </p>
          </div>
        </div>

        <Map
          center={DALLAS_CENTER}
          zoom={DALLAS_ZOOM}
          theme="light"
          styles={{
            light:
              "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
          }}
        >
          <MapFlyer targetCoords={flyTarget} />
          <MapControls position="bottom-right" showZoom />

          {markerCoords && (
            <MapMarker longitude={markerCoords[0]} latitude={markerCoords[1]}>
              <MarkerContent>
                <div className="relative">
                  {/* Pulse ring */}
                  <div className="absolute inset-0 rounded-full bg-teal-500/30 animate-ping" />
                  {/* Marker dot */}
                  <div className="relative size-4 rounded-full bg-teal-700 border-2 border-white shadow-lg" />
                </div>
              </MarkerContent>
            </MapMarker>
          )}
        </Map>
      </div>
    </div>
  );
}
