import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BIOMES, getBiomeById } from '@/data/biomes';
import { SPECIES } from '@/data/species';
import { REGIONS } from '@/data/regions';
import { getBiomeWeather } from '@/data/weather';
import {
  getBiomeHealth,
  getHealthStatus,
  HEALTH_STATUS_INFO,
} from '@/lib/ecosystem';
import type { GameState, RegionId } from '@/types/game';

interface FieldMapHeroProps {
  state: GameState;
  onNavigate: (page: string) => void;
  /**
   * If provided, collection-point dots become tappable and this fires
   * with the biome + point ids. Intended to jump straight into a site
   * from HQ (skipping biome/point selection inside Expedition).
   */
  onSelectSamplePoint?: (biomeId: string, pointId: string) => void;
  /**
   * If provided, tapping a biome pin fires this instead of navigating
   * away. Intended for Expedition's biome-select phase where the parent
   * drives local phase transitions.
   */
  onSelectBiome?: (biomeId: string) => void;
  /**
   * When rendered in a shorter context (e.g. Expedition), hide the ornate
   * top ribbon so the map occupies less vertical space.
   */
  compact?: boolean;
  /**
   * When provided, the map flies to the selected region's bounds and
   * highlights its biomes. Driven by CaliforniaHero region switcher.
   */
  selectedRegion?: RegionId;
}

// Compute dynamic center/zoom from unlocked biomes
function getMapView(unlockedBiomes: string[]): { center: [number, number]; zoom: number } {
  const unlocked = BIOMES.filter(
    b => unlockedBiomes.includes(b.id) || b.unlocked
  );
  if (unlocked.length === 0) return { center: [38.02, -122.76], zoom: 10 };

  const lats = unlocked.map(b => b.lat);
  const lngs = unlocked.map(b => b.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;
  const span = Math.max(latRange, lngRange);

  const center: [number, number] = [(minLat + maxLat) / 2, (minLng + maxLng) / 2];

  // Approximate zoom from geographic span — tighter framing for taller map
  let zoom = 11;
  if (span > 6) zoom = 7;
  else if (span > 3) zoom = 8;
  else if (span > 1.5) zoom = 9;
  else if (span > 0.6) zoom = 10;
  else zoom = 11;

  return { center, zoom };
}

// Esri World Imagery (satellite) — free, no key required.
const ESRI_SATELLITE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics';

// OpenStreetMap street layer
const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors';

// Stadia Alidade Smooth Dark (free for non-commercial / attribution)
const DARK_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const DARK_ATTRIBUTION = '&copy; OpenStreetMap &copy; CARTO';

// When the container resizes (e.g. entering/leaving fullscreen), tell leaflet
// to recalculate its layout so tiles don't end up mis-positioned.
function InvalidateOnResize({ trigger }: { trigger: unknown }) {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 150);
    return () => window.clearTimeout(id);
  }, [trigger, map]);
  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(container);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

// Fly the map to a region's geographic bounds when the selectedRegion changes.
function FlyToRegion({ regionId }: { regionId: RegionId | undefined }) {
  const map = useMap();
  const initialRef = useRef(true);
  useEffect(() => {
    if (!regionId) return;
    const region = REGIONS.find(r => r.id === regionId);
    if (!region) return;
    const { south, west, north, east } = region.bounds;
    const bounds: L.LatLngBoundsExpression = [[south, west], [north, east]];
    if (initialRef.current) {
      initialRef.current = false;
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 12 });
    } else {
      map.flyToBounds(bounds, { padding: [20, 20], maxZoom: 12, duration: 1.2 });
    }
  }, [regionId, map]);
  return null;
}

function RepelLabels({ selectedRegion }: { selectedRegion?: string }) {
  const map = useMap();
  useEffect(() => {
    let raf = 0;
    const repel = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const container = map.getContainer();
        const els = Array.from(
          container.querySelectorAll('.fmh-label'),
        ) as HTMLElement[];
        if (els.length < 2) return;

        els.forEach(el => { el.style.marginLeft = ''; el.style.marginTop = ''; el.style.opacity = ''; });

        const visible: HTMLElement[] = [];
        els.forEach(el => {
          const span = el.querySelector('span[data-region]') as HTMLElement | null;
          if (!span) return;
          if (selectedRegion && span.dataset.region !== selectedRegion) {
            el.style.opacity = '0';
          } else {
            visible.push(el);
          }
        });
        if (visible.length < 2) return;

        const boxes = visible.map(el => {
          const r = el.getBoundingClientRect();
          return { el, cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2, w: r.width, h: r.height, dx: 0, dy: 0 };
        });

        const pad = 12;
        for (let iter = 0; iter < 60; iter++) {
          let moved = false;
          for (let i = 0; i < boxes.length; i++) {
            for (let j = i + 1; j < boxes.length; j++) {
              const a = boxes[i], b = boxes[j];
              const ax = a.cx + a.dx, bx = b.cx + b.dx;
              const ay = a.cy + a.dy, by = b.cy + b.dy;
              const ox = (a.w + b.w) / 2 + pad - Math.abs(ax - bx);
              const oy = (a.h + b.h) / 2 + pad - Math.abs(ay - by);
              if (ox > 0 && oy > 0) {
                moved = true;
                if (oy < ox) {
                  const push = oy * 0.6 + 2;
                  if (ay <= by) { a.dy -= push; b.dy += push; }
                  else { a.dy += push; b.dy -= push; }
                } else {
                  const push = ox * 0.6 + 2;
                  if (ax <= bx) { a.dx -= push; b.dx += push; }
                  else { a.dx += push; b.dx -= push; }
                }
              }
            }
          }
          if (!moved) break;
        }

        boxes.forEach(b => {
          if (b.dx !== 0 || b.dy !== 0) {
            b.el.style.marginLeft = `${Math.round(b.dx)}px`;
            b.el.style.marginTop = `${Math.round(b.dy)}px`;
          }
        });
      });
    };

    map.on('moveend', repel);
    map.on('zoomend', repel);
    const t1 = setTimeout(repel, 400);
    const t2 = setTimeout(repel, 1200);
    const t3 = setTimeout(repel, 2500);
    return () => { map.off('moveend', repel); map.off('zoomend', repel); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); cancelAnimationFrame(raf); };
  }, [map, selectedRegion]);
  return null;
}

// SVG arc path helper for pie-ring segments
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = { x: cx + r * Math.cos(startAngle), y: cy + r * Math.sin(startAngle) };
  const end = { x: cx + r * Math.cos(endAngle), y: cy + r * Math.sin(endAngle) };
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

// Build a biome pin with a 3-segment radial ring (discovery, health, weather)
function buildBiomePinIcon(opts: {
  emoji: string;
  pulsing: boolean;
  size: number;
  locked?: boolean;
  discoveryPct: number;
  healthColor: string;
  healthPct: number;
  weatherColor: string;
  weatherIcon: string;
}) {
  const { emoji, pulsing, size, locked, discoveryPct, healthColor, healthPct, weatherColor, weatherIcon } = opts;
  const r = size / 2 - 3;
  const c = size / 2;
  const sw = 3.5; // stroke width
  const gap = 0.06; // radians gap between segments (~3.4°)

  // 3 segments, each ~120° (2π/3) with small gaps
  // Segment 1: Discovery (gold, fill proportional to discoveryPct) — top-left
  // Segment 2: Health (colored by status) — top-right
  // Segment 3: Weather (weather accent) — bottom
  const segAngle = (2 * Math.PI - gap * 3) / 3;
  const startBase = -Math.PI / 2 - segAngle / 2; // center segment 1 at top

  const segments = [
    { color: '#c9a84c', fillPct: discoveryPct, label: 'discovery' },
    { color: healthColor, fillPct: healthPct, label: 'health' },
    { color: weatherColor, fillPct: 1, label: 'weather' },
  ];

  let svgArcs = '';
  for (let i = 0; i < 3; i++) {
    const segStart = startBase + i * (segAngle + gap);
    const segEnd = segStart + segAngle;
    // Background track
    svgArcs += `<path d="${describeArc(c, c, r, segStart, segEnd)}" fill="none" stroke="#1a2e20" stroke-width="${sw}" stroke-linecap="round"/>`;
    // Filled portion with sweep-in animation
    const fillPct = Math.max(0.05, segments[i].fillPct);
    const fillEnd = segStart + segAngle * fillPct;
    if (segments[i].fillPct > 0) {
      const arcLen = r * segAngle * fillPct;
      const delay = i * 0.2;
      svgArcs += `<path d="${describeArc(c, c, r, segStart, fillEnd)}" fill="none" stroke="${locked ? '#3a5040' : segments[i].color}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${arcLen}" stroke-dashoffset="${arcLen}" style="animation:fmhRingSweep 0.8s ease-out ${delay}s forwards"/>`;
    }
  }

  const pulseColor = locked ? '#3a5040' : '#c9a84c';
  const pulseAnim = pulsing
    ? `<div style="
        position:absolute; inset:-4px;
        border-radius:50%;
        border:2px solid ${pulseColor};
        opacity:0.6;
        animation: fmhPinPulse 2s ease-out infinite;
      "></div>`
    : '';

  // Weather icon badge (tiny, top-right)
  const weatherBadge = !locked
    ? `<div style="
        position:absolute; top:-4px; right:-6px;
        font-size:11px; line-height:1;
        filter:drop-shadow(0 1px 3px rgba(0,0,0,0.8));
      ">${weatherIcon}</div>`
    : '';

  return L.divIcon({
    html: `
      <div style="position:relative; width:${size}px; height:${size}px;">
        ${pulseAnim}
        <svg width="${size}" height="${size}" style="position:absolute; inset:0;">
          ${svgArcs}
        </svg>
        <div style="
          position:absolute; inset:3px;
          background: ${locked
            ? 'linear-gradient(135deg,#1a2a20,#0f1814)'
            : 'linear-gradient(135deg,#1e3a24,#12201a)'};
          border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:${size * 0.42}px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.55), inset 0 0 10px rgba(201,168,76,0.15);
          ${locked ? 'filter:grayscale(0.8) brightness(0.55);' : ''}
        ">${emoji}</div>
        ${weatherBadge}
      </div>
    `,
    className: 'fmh-biome-pin',
    iconSize: [size, size],
    iconAnchor: [c, c],
  });
}

// Tiny collection-point dots — subtle so they don't compete with biome pins
function buildPointIcon(color: string, active: boolean) {
  const size = active ? 8 : 5;
  return L.divIcon({
    html: `
      <div style="
        width:${size}px; height:${size}px;
        border-radius:50%;
        background:${color};
        opacity:${active ? 0.9 : 0.55};
        border:${active ? '1px solid #0a1610' : 'none'};
        box-shadow:0 1px 3px rgba(0,0,0,0.4);
      "></div>
    `,
    className: 'fmh-point-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function FieldMapHero({
  state,
  onNavigate,
  onSelectSamplePoint,
  onSelectBiome,
  compact = false,
  selectedRegion: selectedRegionProp,
}: FieldMapHeroProps) {

  const mapView = useMemo(() => {
    if (selectedRegionProp) {
      const region = REGIONS.find(r => r.id === selectedRegionProp);
      if (region) {
        const { south, west, north, east } = region.bounds;
        return {
          center: [(south + north) / 2, (west + east) / 2] as [number, number],
          zoom: 11,
        };
      }
    }
    return getMapView(state.unlockedBiomes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Determine active regions for ribbon label
  const activeRegionNames = useMemo(() => {
    const regionIds = new Set(
      BIOMES
        .filter(b => state.unlockedBiomes.includes(b.id) || b.unlocked)
        .map(b => b.regionId)
    );
    return REGIONS
      .filter(r => regionIds.has(r.id))
      .map(r => r.name);
  }, [state.unlockedBiomes]);

  const discoveredSet = useMemo(
    () => new Set(state.discoveredSpecies),
    [state.discoveredSpecies],
  );

  // Today's route: ordered unique visits from specimens collected since
  // local midnight. Each entry is the lat/lng of the sampling point.
  const todayRoute = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const visits: { biomeId: string; pointId: string; lat: number; lng: number; t: number; name: string; biomeName: string }[] = [];
    const seen = new Set<string>();
    const sorted = [...state.specimens].sort(
      (a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime(),
    );
    for (const sp of sorted) {
      const t = new Date(sp.collectedAt).getTime();
      if (t < todayMs) continue;
      const key = `${sp.biomeId}:${sp.collectionPointId}`;
      if (seen.has(key)) continue;
      const biome = getBiomeById(sp.biomeId);
      if (!biome) continue;
      const point = biome.collectionPoints.find(p => p.id === sp.collectionPointId);
      if (!point) continue;
      seen.add(key);
      visits.push({
        biomeId: sp.biomeId,
        pointId: sp.collectionPointId,
        lat: point.lat,
        lng: point.lng,
        t,
        name: point.name,
        biomeName: biome.name,
      });
    }
    return visits;
  }, [state.specimens]);

  const pins = useMemo(
    () => {
      const biomes = selectedRegionProp
        ? BIOMES.filter(b => b.regionId === selectedRegionProp)
        : BIOMES;
      return biomes.map(biome => {
        const biomeSpecies = SPECIES.filter(s => s.biomeIds.includes(biome.id));
        const discovered = biomeSpecies.filter(s => discoveredSet.has(s.id)).length;
        const total = biomeSpecies.length;
        const pct = total > 0 ? discovered / total : 0;
        const isUnlocked = state.unlockedBiomes.includes(biome.id);
        const isCurrent = state.currentBiomeId === biome.id;
        const health = getBiomeHealth(state, biome.id);
        const healthStatus = getHealthStatus(health);
        const weather = getBiomeWeather(biome.id);
        return {
          biome,
          pct,
          discovered,
          total,
          isUnlocked,
          isCurrent,
          health,
          healthStatus,
          weather,
        };
      });
    },
    [state, discoveredSet, selectedRegionProp],
  );

  const totalSites = BIOMES.reduce((sum, b) => sum + b.collectionPoints.length, 0);
  const unlockedSites = BIOMES.filter(b => state.unlockedBiomes.includes(b.id)).reduce(
    (sum, b) => sum + b.collectionPoints.length,
    0,
  );

  return (
    <div
      className={`rounded-2xl overflow-hidden relative${compact ? ' flex flex-col flex-1 min-h-0 w-full md:max-w-[50%]' : ''}`}
      style={{
        background: 'linear-gradient(180deg, #0c1a12 0%, #0a1610 100%)',
        border: '1.5px solid #c9a84c40',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 0 40px rgba(201,168,76,0.04)',
      }}
    >
      {/* Ornate top ribbon */}
      {!compact && (
        <div
          className="px-4 py-2.5 flex items-center justify-between border-b relative"
          style={{
            borderColor: '#c9a84c30',
            background: 'linear-gradient(90deg, #14231a 0%, #1a2e20 50%, #14231a 100%)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🧭</span>
            <div>
              <div
                className="text-[9px] font-bold tracking-[0.2em]"
                style={{ color: '#c9a84c' }}
              >
                FIELD OPERATIONS
              </div>
              <div
                className="text-[11px] font-bold italic leading-tight"
                style={{ color: '#e8e4d8', fontFamily: "'Cinzel', Georgia, serif" }}
              >
                California · {selectedRegionProp
                  ? REGIONS.find(r => r.id === selectedRegionProp)?.name ?? activeRegionNames[0]
                  : activeRegionNames.length <= 2
                    ? activeRegionNames.join(' & ')
                    : `${activeRegionNames.length} Regions`}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] tracking-wider" style={{ color: '#5a7a5a' }}>
              SITES ACTIVE
            </div>
            <div
              className="text-sm font-bold leading-none"
              style={{ color: '#c9a84c', fontFamily: "'Cinzel', Georgia, serif" }}
            >
              {unlockedSites}
              <span style={{ color: '#5a7a5a', fontSize: '0.75em' }}> / {totalSites}</span>
            </div>
          </div>
          <div className="absolute top-1 left-1 text-[8px]" style={{ color: '#c9a84c' }}>
            ◆
          </div>
          <div className="absolute top-1 right-1 text-[8px]" style={{ color: '#c9a84c' }}>
            ◆
          </div>
        </div>
      )}

      {/* Leaflet map body */}
      <div
        className={`relative${compact ? ' flex-1 min-h-0' : ''}`}
        style={{
          height: compact ? '100%' : 300,
          background: '#0a1610',
        }}
      >
        <MapContainer
          center={mapView.center}
          zoom={mapView.zoom}
          minZoom={5}
          maxZoom={16}
          scrollWheelZoom={false}
          zoomControl={true}
          attributionControl={true}
          style={{ height: '100%', width: '100%', background: '#0a1610' }}
        >
          <InvalidateOnResize trigger={compact} />
          <FlyToRegion regionId={selectedRegionProp} />
          <RepelLabels selectedRegion={selectedRegionProp} />

          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Satellite">
              <TileLayer url={ESRI_SATELLITE_URL} attribution={ESRI_ATTRIBUTION} updateWhenZooming={false} updateWhenIdle={true} />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Streets">
              <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} updateWhenZooming={false} updateWhenIdle={true} />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Dark">
              <TileLayer url={DARK_URL} attribution={DARK_ATTRIBUTION} updateWhenZooming={false} updateWhenIdle={true} />
            </LayersControl.BaseLayer>
          </LayersControl>

          {/* Today's route — polyline between today's visits in chronological order */}
          {todayRoute.length >= 2 && (
            <Polyline
              positions={todayRoute.map(v => [v.lat, v.lng] as [number, number])}
              pathOptions={{
                color: '#c9a84c',
                weight: 3,
                opacity: 0.9,
                dashArray: '6, 8',
              }}
            />
          )}

          {/* Numbered waypoint markers for today's route */}
          {todayRoute.map((v, idx) => (
              <Marker
                key={`route-${idx}-${v.pointId}`}
                position={[v.lat, v.lng]}
                icon={L.divIcon({
                  html: `
                    <div style="
                      width:20px; height:20px;
                      border-radius:50%;
                      background:#c9a84c;
                      color:#14231a;
                      border:2px solid #e8e4d8;
                      box-shadow:0 2px 6px rgba(0,0,0,0.6);
                      font-family:'Cinzel',Georgia,serif;
                      font-weight:700;
                      font-size:11px;
                      display:flex; align-items:center; justify-content:center;
                    ">${idx + 1}</div>
                  `,
                  className: 'fmh-route-pin',
                  iconSize: [20, 20],
                  iconAnchor: [10, 10],
                })}
                zIndexOffset={500}
              >
                <Popup>
                  <div style={{ fontFamily: "'Outfit', sans-serif", minWidth: 140 }}>
                    <div style={{ fontSize: 9, letterSpacing: '0.15em', color: '#5a7a5a', fontWeight: 700 }}>
                      STOP #{idx + 1} TODAY
                    </div>
                    <div style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 13, fontWeight: 700, color: '#14231a' }}>
                      {v.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#2a4030' }}>{v.biomeName}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* Collection point markers — only for unlocked biomes */}
          {pins.filter(pin => pin.isUnlocked).map(pin =>
            pin.biome.collectionPoints.map(cp => {
              const isActive =
                state.currentBiomeId === pin.biome.id && state.currentPointId === cp.id;
              return (
                <Marker
                  key={`${pin.biome.id}-${cp.id}`}
                  position={[cp.lat, cp.lng]}
                  icon={buildPointIcon('#c9a84c', isActive)}
                  eventHandlers={{
                    click: () => {
                      if (onSelectSamplePoint) {
                        onSelectSamplePoint(pin.biome.id, cp.id);
                      } else {
                        onNavigate('expedition');
                      }
                    },
                  }}
                >
                  <Popup>
                    <div style={{ fontFamily: "'Outfit', sans-serif", minWidth: 160 }}>
                      <div
                        style={{
                          fontSize: 9,
                          letterSpacing: '0.15em',
                          color: '#5a7a5a',
                          fontWeight: 700,
                        }}
                      >
                        SAMPLING SITE
                      </div>
                      <div
                        style={{
                          fontFamily: "'Cinzel', Georgia, serif",
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#14231a',
                          marginBottom: 2,
                        }}
                      >
                        {cp.name}
                      </div>
                      <div style={{ fontSize: 10, color: '#2a4030', lineHeight: 1.35 }}>
                        {pin.biome.name}
                      </div>
                      <button
                          onClick={e => {
                            e.stopPropagation();
                            if (onSelectSamplePoint) {
                              onSelectSamplePoint(pin.biome.id, cp.id);
                            } else {
                              onNavigate('expedition');
                            }
                          }}
                          style={{
                            marginTop: 6,
                            width: '100%',
                            background: '#14231a',
                            color: '#c9a84c',
                            border: '1px solid #c9a84c',
                            borderRadius: 4,
                            padding: '4px 8px',
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            cursor: 'pointer',
                          }}
                        >
                          SAMPLE HERE →
                        </button>
                    </div>
                  </Popup>
                </Marker>
              );
            }),
          )}

          {/* Biome pins */}
          {pins.map((pin, _idx, allPins) => {
            // Pick label direction to avoid overlapping neighbors
            const others = allPins.filter(p => p.biome.id !== pin.biome.id);
            let bestDir: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
            if (others.length > 0) {
              let avgDLat = 0, avgDLng = 0;
              for (const o of others) {
                const dLat = o.biome.lat - pin.biome.lat;
                const dLng = o.biome.lng - pin.biome.lng;
                const dist = Math.sqrt(dLat * dLat + dLng * dLng) || 0.001;
                const weight = 1 / (dist * dist);
                avgDLat += dLat * weight;
                avgDLng += dLng * weight;
              }
              // Place label away from the weighted center of neighbors
              if (Math.abs(avgDLat) > Math.abs(avgDLng)) {
                bestDir = avgDLat > 0 ? 'bottom' : 'top';
              } else {
                bestDir = avgDLng > 0 ? 'left' : 'right';
              }
            }
            const labelOffset: [number, number] =
              bestDir === 'top' ? [0, -18] :
              bestDir === 'bottom' ? [0, 18] :
              bestDir === 'left' ? [-18, 0] : [18, 0];
            const pinIcon = buildBiomePinIcon({
              emoji: pin.biome.emoji,
              pulsing: pin.isCurrent,
              size: pin.isCurrent ? 56 : 46,
              locked: !pin.isUnlocked,
              discoveryPct: pin.isUnlocked ? pin.pct : 0,
              healthColor: HEALTH_STATUS_INFO[pin.healthStatus].color,
              healthPct: pin.isUnlocked ? pin.health / 100 : 0,
              weatherColor: pin.weather.accent,
              weatherIcon: pin.weather.icon,
            });

            if (!pin.isUnlocked) {
              return (
                <Marker
                  key={pin.biome.id}
                  position={[pin.biome.lat, pin.biome.lng]}
                  icon={pinIcon}
                  interactive={false}
                >
                  <Tooltip
                    permanent
                    direction={bestDir}
                    offset={labelOffset}
                    className="fmh-label"
                  >
                    <span data-region={pin.biome.regionId}>🔒 {pin.biome.name}</span>
                  </Tooltip>
                </Marker>
              );
            }

            return (
              <Marker
                key={pin.biome.id}
                position={[pin.biome.lat, pin.biome.lng]}
                icon={pinIcon}
              >
                <Popup>
                  <div
                    ref={el => { if (el) L.DomEvent.disableClickPropagation(el); }}
                    style={{ fontFamily: "'Outfit', sans-serif", minWidth: 190, padding: '2px 0' }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: '0.15em',
                        color: '#5a7a5a',
                        fontWeight: 700,
                        marginBottom: 2,
                      }}
                    >
                      {pin.isCurrent ? 'YOU ARE HERE' : 'FIELD SITE'}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontSize: 19 }}>{pin.biome.emoji}</span>
                      <strong style={{ fontSize: 14, color: '#1a2e20' }}>{pin.biome.name}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: '#2a4030', marginBottom: 3 }}>
                      {pin.discovered}/{pin.total} species · {pin.biome.collectionPoints.length} sites
                    </div>
                    <div style={{ fontSize: 10, color: '#2a4030', marginBottom: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: HEALTH_STATUS_INFO[pin.healthStatus].color, fontWeight: 700 }}>
                        {HEALTH_STATUS_INFO[pin.healthStatus].label}
                      </span>
                      <span>{pin.weather.icon} {pin.weather.name}</span>
                    </div>
                    <button
                      ref={el => {
                        if (!el || el.dataset.bound) return;
                        el.dataset.bound = '1';
                        L.DomEvent.disableClickPropagation(el);
                        el.addEventListener('click', (e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (onSelectBiome) {
                            onSelectBiome(pin.biome.id);
                          } else {
                            onNavigate('expedition');
                          }
                        });
                      }}
                      style={{
                        marginTop: 4,
                        width: '100%',
                        background: 'linear-gradient(135deg, #1a3520, #14231a)',
                        color: '#c9a84c',
                        border: '1px solid #4a8a4a',
                        borderRadius: 6,
                        padding: '7px 8px',
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
                      }}
                    >
                      Explore →
                    </button>
                  </div>
                </Popup>
                <Tooltip
                  permanent
                  direction={bestDir}
                  offset={labelOffset}
                  className="fmh-label"
                >
                  <span data-region={pin.biome.regionId}>{pin.biome.name}</span>
                </Tooltip>
              </Marker>
            );
          })}

        </MapContainer>

        {/* Back-to-HQ button (only in compact / Expedition mode) */}
        {compact && (
          <button
            onClick={() => onNavigate('hq')}
            className="absolute top-3 left-3 z-[500] flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'rgba(10, 22, 16, 0.88)',
              backdropFilter: 'blur(12px)',
              border: '1px solid #c9a84c60',
              color: '#c9a84c',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          >
            ← {selectedRegionProp ? (REGIONS.find(r => r.id === selectedRegionProp)?.name ?? 'Back') : 'Back'}
          </button>
        )}

        {/* Floating legend — bottom-left of map */}
        <div
          className="absolute bottom-2 left-2 z-[400] pointer-events-none rounded-lg px-2.5 py-2"
          style={{
            background: 'rgba(10, 22, 16, 0.88)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #2a4030',
            maxWidth: 165,
          }}
        >
          <div className="text-[8px] font-bold tracking-[0.15em] mb-1.5" style={{ color: '#5a7a5a' }}>
            PIN RING
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#c9a84c' }} />
            <span className="text-[9px] font-semibold" style={{ color: '#c9a84c' }}>Discovery</span>
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#4a8a4a' }} />
            <span className="text-[9px] font-semibold" style={{ color: '#8ab88a' }}>Health</span>
            <span className="text-[8px]" style={{ color: '#5a7a5a' }}>
              <span style={{ color: '#4a8a4a' }}>●</span>
              <span style={{ color: '#c9a84c' }}>●</span>
              <span style={{ color: '#d97757' }}>●</span>
              <span style={{ color: '#c94343' }}>●</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#6a8aaa' }} />
            <span className="text-[9px] font-semibold" style={{ color: '#8ab8d0' }}>Weather</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fmhPinPulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes fmhRingSweep {
          to { stroke-dashoffset: 0; }
        }
        .fmh-biome-pin, .fmh-point-pin {
          background: transparent !important;
          border: none !important;
        }
        .fmh-point-pin {
          pointer-events: none !important;
          z-index: 100 !important;
        }
        .fmh-biome-pin {
          z-index: 200 !important;
        }
        .fmh-label {
          background: rgba(10, 22, 16, 0.88) !important;
          border: 1px solid #2a4030 !important;
          color: #c9a84c !important;
          font-family: 'Outfit', sans-serif !important;
          font-size: 10px !important;
          font-weight: 600 !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
          white-space: nowrap !important;
          pointer-events: none !important;
          transition: margin 0.25s ease, opacity 0.2s ease !important;
        }
        .fmh-label::before {
          border-bottom-color: #2a4030 !important;
        }
        /* Leaflet popup restyle to match game aesthetic */
        .leaflet-popup-content-wrapper {
          background: #e8e4d8 !important;
          border-radius: 6px !important;
          border: 1.5px solid #c9a84c !important;
          box-shadow: 0 6px 24px rgba(0,0,0,0.6) !important;
        }
        .leaflet-popup-tip {
          background: #e8e4d8 !important;
          border: 1.5px solid #c9a84c !important;
        }
        .leaflet-popup-content {
          margin: 8px 10px !important;
        }
        .leaflet-container {
          font-family: 'Outfit', sans-serif !important;
        }
        .leaflet-control-attribution {
          background: rgba(10,22,16,0.75) !important;
          color: #5a7a5a !important;
          font-size: 8px !important;
        }
        .leaflet-control-attribution a {
          color: #c9a84c !important;
        }
        .leaflet-control-layers {
          background: #14231aee !important;
          border: 1px solid #c9a84c60 !important;
          color: #e8e4d8 !important;
        }
        .leaflet-control-layers label {
          color: #e8e4d8 !important;
          font-size: 11px !important;
          font-family: 'Outfit', sans-serif !important;
        }
        .leaflet-control-zoom a {
          background: #14231a !important;
          color: #c9a84c !important;
          border: 1px solid #c9a84c60 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #1a3520 !important;
        }
      `}</style>
    </div>
  );
}
