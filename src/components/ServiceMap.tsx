"use client";

import { useEffect, useRef } from "react";

export type ServiceMarker = {
  lat: number;
  lng: number;
  name: string;
  type: "naloxone" | "treatment" | "syringe";
  address: string;
  phone: string | null;
};

const MARKER_COLORS: Record<ServiceMarker["type"], string> = {
  naloxone: "#22c55e",
  treatment: "#60a5fa",
  syringe: "#f59e0b",
};

export function ServiceMap({ markers, token }: { markers: ServiceMarker[]; token: string | null }) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let map: import("mapbox-gl").Map | null = null;

    async function init() {
      if (!token || !mapRef.current || markers.length === 0) return;
      const mapboxgl = (await import("mapbox-gl")).default;
      mapboxgl.accessToken = token;

      const center = [markers[0].lng, markers[0].lat] as [number, number];
      map = new mapboxgl.Map({
        container: mapRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center,
        zoom: 9,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      for (const marker of markers) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "service-map-marker";
        button.style.background = MARKER_COLORS[marker.type];
        button.setAttribute("aria-label", `${marker.name}, ${marker.type}`);

        const popup = new mapboxgl.Popup({ offset: 18 }).setHTML(
          `<strong>${marker.name}</strong><p>${marker.address}</p>${marker.phone ? `<p>${marker.phone}</p>` : ""}<p><a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(marker.address)}" target="_blank" rel="noreferrer">Get Directions</a></p>`
        );

        new mapboxgl.Marker({ element: button })
          .setLngLat([marker.lng, marker.lat])
          .setPopup(popup)
          .addTo(map);
      }
    }

    void init();
    return () => {
      map?.remove();
    };
  }, [markers, token]);

  if (!token || markers.length === 0) {
    return null;
  }

  return <div ref={mapRef} className="service-map" aria-label="Map of nearby harm reduction services" />;
}
