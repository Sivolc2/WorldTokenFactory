import { useEffect, useRef, useState } from 'react';
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

export interface MapFocus {
  center: [number, number];
  zoom: number;
  tiffUrl?: string; // optional GeoTIFF DEM overlay
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

// ── Terrain colour scale for DEM elevation ─────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function terrainColor(t: number): string {
  const stops: Array<[number, [number, number, number]]> = [
    [0.00, [50,  110, 50]],   // dark green (low elevation)
    [0.30, [165, 135, 80]],   // tan/ochre
    [0.65, [115, 95,  75]],   // warm brown
    [1.00, [215, 215, 210]],  // near-white (high elevation)
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t <= t1) {
      const s = (t - t0) / (t1 - t0);
      return `rgb(${Math.round(lerp(c0[0], c1[0], s))},${Math.round(lerp(c0[1], c1[1], s))},${Math.round(lerp(c0[2], c1[2], s))})`;
    }
  }
  return 'rgb(215,215,210)';
}

// Process-level cache: URL → parsed georaster (avoids re-fetching on re-click)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const georasterCache = new Map<string, any>();

export default function MapView({ mapType, focusLocation, onViewChange, children }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tiffLayerRef = useRef<any>(null);
  const [tiffLoading, setTiffLoading] = useState(false);

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

  // Fly to new location when mapType changes (after mount)
  useEffect(() => {
    if (!mapRef.current) return;
    const config = MAP_CONFIGS[mapType];
    mapRef.current.flyTo(config.center, config.zoom, { duration: 1.5 });
  }, [mapType]);

  // Fly to focused location and swap GeoTIFF overlay
  useEffect(() => {
    if (!mapRef.current) return;

    if (focusLocation) {
      mapRef.current.flyTo(focusLocation.center, focusLocation.zoom, { duration: 1.2 });
    }

    const tiffUrl = focusLocation?.tiffUrl ?? null;

    // Remove old layer
    if (tiffLayerRef.current) {
      tiffLayerRef.current.remove();
      tiffLayerRef.current = null;
    }

    if (!tiffUrl) return;

    let cancelled = false;

    async function loadTiff() {
      setTiffLoading(true);
      try {
        // Dynamic imports for CJS/ESM compatibility
        const [{ default: parseGeoraster }, { default: GeoRasterLayer }] = await Promise.all([
          import('georaster'),
          import('georaster-layer-for-leaflet'),
        ]);

        let georaster = georasterCache.get(tiffUrl!);
        if (!georaster) {
          const response = await fetch(tiffUrl!);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const buffer = await response.arrayBuffer();
          georaster = await parseGeoraster(buffer);
          georasterCache.set(tiffUrl!, georaster);
        }

        if (cancelled || !mapRef.current) return;

        const min: number = georaster.mins[0];
        const max: number = georaster.maxs[0];
        const noData: number = georaster.noDataValue;
        const range = max - min || 1;

        const layer = new GeoRasterLayer({
          georaster,
          opacity: 0.65,
          resolution: 256,
          pixelValuesToColorFn: (values: number[]) => {
            const v = values[0];
            if (v === noData || v == null || isNaN(v) || v < min) return null;
            return terrainColor(Math.max(0, Math.min(1, (v - min) / range)));
          },
        });

        if (cancelled || !mapRef.current) return;

        layer.addTo(mapRef.current);
        tiffLayerRef.current = layer;
      } catch (err) {
        console.error('[MapView] GeoTIFF load failed:', err);
      } finally {
        if (!cancelled) setTiffLoading(false);
      }
    }

    loadTiff();
    return () => { cancelled = true; };
  }, [focusLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Emit center on map move
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
      {tiffLoading && (
        <div style={{
          position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(10,10,20,0.85)', color: 'var(--color-accent)',
          padding: '4px 12px', borderRadius: 6, fontSize: 12, pointerEvents: 'none', zIndex: 1000,
        }}>
          Loading DEM…
        </div>
      )}
    </div>
  );
}
