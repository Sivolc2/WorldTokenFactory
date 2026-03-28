import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type BusinessMapType = 'lemming' | 'oil' | 'general';

const MAP_CONFIGS: Record<BusinessMapType, { center: [number, number]; zoom: number }> = {
  lemming: { center: [70.2, 25.5], zoom: 3 },
  oil:     { center: [28.8, -89.5], zoom: 3 },
  general: { center: [30.0, 10.0], zoom: 1 },
};

// Tile source: Mapbox satellite if token available, CartoDB Voyager otherwise
const MAPBOX_TOKEN = (import.meta as unknown as { env: Record<string, string | undefined> }).env?.VITE_MAPBOX_TOKEN;

const TILE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

const TILE_ATTR = MAPBOX_TOKEN
  ? '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** A coloured rectangle overlaid on the map. */
export interface MapOverlay {
  /** [[south, west], [north, east]] in decimal degrees */
  bounds: [[number, number], [number, number]];
  /** Hex colour, e.g. '#ff4444' */
  color: string;
  /** Tooltip shown on hover */
  label?: string;
  fillOpacity?: number;
}

export interface MapFocus {
  center: [number, number];
  zoom: number;
  overlays?: MapOverlay[];
}

interface MapViewProps {
  mapType: BusinessMapType;
  focusLocation?: MapFocus | null;
  onViewChange?: (center: [number, number]) => void;
  children?: React.ReactNode;
}

export function detectMapType(description: string): BusinessMapType {
  const lower = description.toLowerCase();
  if (lower.includes('lemming') || lower.includes('arctic') || lower.includes('norway') || lower.includes('svalbard')) return 'lemming';
  if (lower.includes('oil') || lower.includes('gulf') || lower.includes('pipeline') || lower.includes('drilling') || lower.includes('offshore')) return 'oil';
  return 'general';
}

export default function MapView({ mapType, focusLocation, onViewChange, children }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayLayersRef = useRef<L.Rectangle[]>([]);

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

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fly to new location when mapType changes
  useEffect(() => {
    if (!mapRef.current) return;
    const config = MAP_CONFIGS[mapType];
    mapRef.current.flyTo(config.center, config.zoom, { duration: 1.5 });
  }, [mapType]);

  // Fly + swap overlay rectangles when step focus changes
  useEffect(() => {
    if (!mapRef.current) return;

    if (focusLocation) {
      mapRef.current.flyTo(focusLocation.center, focusLocation.zoom, { duration: 1.2 });
    }

    // Remove previous rectangles
    overlayLayersRef.current.forEach((r) => r.remove());
    overlayLayersRef.current = [];

    if (!focusLocation?.overlays?.length) return;

    for (const ov of focusLocation.overlays) {
      const rect = L.rectangle(ov.bounds, {
        color: ov.color,
        weight: 2,
        opacity: 0.9,
        fillColor: ov.color,
        fillOpacity: ov.fillOpacity ?? 0.25,
      });
      if (ov.label) rect.bindTooltip(ov.label, { sticky: true, className: 'map-overlay-tooltip' });
      rect.addTo(mapRef.current!);
      overlayLayersRef.current.push(rect);
    }
  }, [focusLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Emit centre on map move
  useEffect(() => {
    if (!mapRef.current || !onViewChange) return;
    const handler = () => {
      const c = mapRef.current!.getCenter();
      onViewChange([c.lat, c.lng]);
    };
    mapRef.current.on('moveend', handler);
    return () => { mapRef.current?.off('moveend', handler); };
  }, [onViewChange]);

  const recenter = () => {
    if (!mapRef.current) return;
    const config = MAP_CONFIGS[mapType];
    mapRef.current.flyTo(config.center, config.zoom, { duration: 1.2 });
  };

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map-canvas" />
      <div className="map-overlays">{children}</div>
      <button className="map-recenter-btn" onClick={recenter} title="Re-centre map">⊕</button>
    </div>
  );
}
