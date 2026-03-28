import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type BusinessMapType = 'lemming' | 'oil' | 'general';

const MAP_CONFIGS: Record<BusinessMapType, { center: [number, number]; zoom: number }> = {
  lemming: { center: [70.2, 25.5], zoom: 3 },
  oil:     { center: [28.8, -89.5], zoom: 3 },
  general: { center: [30.0, 10.0], zoom: 1 },
};

// CartoDB Voyager — clean, readable, good for overlays
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

interface MapViewProps {
  mapType: BusinessMapType;
  children?: React.ReactNode;
}

export function detectMapType(description: string): BusinessMapType {
  const lower = description.toLowerCase();
  if (lower.includes('lemming') || lower.includes('arctic') || lower.includes('norway') || lower.includes('svalbard')) return 'lemming';
  if (lower.includes('oil') || lower.includes('gulf') || lower.includes('pipeline') || lower.includes('drilling') || lower.includes('offshore')) return 'oil';
  return 'general';
}

export default function MapView({ mapType, children }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const config = MAP_CONFIGS[mapType];
    mapRef.current = L.map(containerRef.current, {
      center: config.center,
      zoom: config.zoom,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      maxZoom: 18,
    }).addTo(mapRef.current);

    // Subtle zoom control in bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fly to new location when mapType changes (after mount)
  useEffect(() => {
    if (!mapRef.current) return;
    const config = MAP_CONFIGS[mapType];
    mapRef.current.flyTo(config.center, config.zoom, { duration: 1.5 });
  }, [mapType]);

  const recenter = () => {
    if (!mapRef.current) return;
    const config = MAP_CONFIGS[mapType];
    mapRef.current.flyTo(config.center, config.zoom, { duration: 1.2 });
  };

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map-canvas" />
      <div className="map-overlays">{children}</div>
      <button className="map-recenter-btn" onClick={recenter} title="Re-centre map">
        ⊕
      </button>
    </div>
  );
}
