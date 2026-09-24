import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

type Props = {
  /** GeoJSON Polygon/MultiPolygon object or JSON string */
  value: string;
  onChange: (geoJsonText: string) => void;
};

const LAGOS: L.LatLngExpression = [6.5244, 3.3792];

function parseBoundary(value: string): GeoJSON.Polygon | GeoJSON.MultiPolygon | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const type = String(parsed.type ?? '');
    if (type === 'Polygon' || type === 'MultiPolygon') {
      return parsed as unknown as GeoJSON.Polygon | GeoJSON.MultiPolygon;
    }
    if (type === 'Feature' && parsed.geometry && typeof parsed.geometry === 'object') {
      const geometry = parsed.geometry as GeoJSON.Geometry;
      if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
        return geometry;
      }
    }
    if (type === 'FeatureCollection' && Array.isArray(parsed.features)) {
      const feature = parsed.features[0] as GeoJSON.Feature | undefined;
      const geometry = feature?.geometry;
      if (geometry && (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon')) {
        return geometry;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Click-to-draw service zone polygon. Exports GeoJSON Polygon for the API.
 */
export function ZoneBoundaryMap({ value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const drawnRef = useRef<L.FeatureGroup | null>(null);
  const onChangeRef = useRef(onChange);
  const lastEmittedRef = useRef(value);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: LAGOS,
      zoom: 11,
      zoomControl: true,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const drawn = new L.FeatureGroup();
    drawnRef.current = drawn;
    map.addLayer(drawn);

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: '#1A7A0A',
            fillColor: '#1A7A0A',
            fillOpacity: 0.2,
            weight: 2,
          },
        },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: {
        featureGroup: drawn,
        remove: true,
      },
    });
    map.addControl(drawControl);

    const emitFromLayer = () => {
      const layers = drawn.getLayers();
      if (layers.length === 0) {
        lastEmittedRef.current = '';
        onChangeRef.current('');
        return;
      }
      const layer = layers[0] as L.Polygon;
      const geo = layer.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>;
      const text = JSON.stringify(geo.geometry, null, 2);
      lastEmittedRef.current = text;
      onChangeRef.current(text);
    };

    map.on(L.Draw.Event.CREATED, (event: L.LeafletEvent) => {
      const e = event as L.DrawEvents.Created;
      drawn.clearLayers();
      drawn.addLayer(e.layer);
      emitFromLayer();
    });
    map.on(L.Draw.Event.EDITED, () => emitFromLayer());
    map.on(L.Draw.Event.DELETED, () => {
      lastEmittedRef.current = '';
      onChangeRef.current('');
    });

    const t = window.setTimeout(() => map.invalidateSize(), 200);

    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      drawnRef.current = null;
    };
  }, []);

  // Sync external value → map (edit existing zone / clear from advanced JSON).
  useEffect(() => {
    const map = mapRef.current;
    const drawn = drawnRef.current;
    if (!map || !drawn) return;
    if (value === lastEmittedRef.current) return;

    lastEmittedRef.current = value;
    const geometry = parseBoundary(value);
    drawn.clearLayers();

    if (!geometry) return;

    const layer = L.geoJSON(geometry as GeoJSON.GeoJsonObject, {
      style: {
        color: '#1A7A0A',
        fillColor: '#1A7A0A',
        fillOpacity: 0.2,
        weight: 2,
      },
    });

    layer.eachLayer((l) => {
      drawn.addLayer(l);
    });

    const bounds = drawn.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.15));
    }
  }, [value]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = window.setTimeout(() => map.invalidateSize(), 350);
    return () => window.clearTimeout(id);
  });

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-72 w-full rounded-xl border border-ink-200 overflow-hidden z-0"
      />
      <p className="text-xs text-ink-500 leading-relaxed">
        Use the polygon tool (top-right) to outline the coverage area. Click points around the
        neighborhood, then click the first point to close. Edit or trash from the toolbar.
      </p>
    </div>
  );
}
